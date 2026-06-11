import type { IpcMainEvent, WebContents } from "electron";
import { ipcMain } from "electron";
import * as pty from "node-pty";
import * as os from "os";
import * as fs from "fs";

interface ActivePty {
    process:  pty.IPty;
    dispData: pty.IDisposable;
    dispExit: pty.IDisposable;
}

let active: ActivePty | null = null;

function send(wc: WebContents, channel: string, payload?: unknown): void {
    if (wc.isDestroyed()) return;
    wc.send(channel, payload);
}

function kill(): void {
    if (!active) return;
    active.dispData.dispose();
    active.dispExit.dispose();
    try { active.process.kill(); } catch { /* already dead */ }
    active = null;
}

export function registerTerminalHandlers(getWebContents: () => WebContents | null): void {

    ipcMain.on("terminal.start", (_event: IpcMainEvent, { cwd, shellType }: { cwd?: string; shellType?: ShellType }) => {
        kill(); // dispose listeners + kill old pty before anything

        const wc = getWebContents();
        if (!wc) return;

        const shell = resolveShell(shellType);
        const workingDir = resolveDir(cwd);

        console.log(`[terminal] starting ${shell.exe} in ${workingDir}`);

        try {
            const proc: pty.IPty = pty.spawn(shell.exe, shell.args, {
                name: "xterm-256color",
                cols: 80,
                rows: 30,
                cwd: workingDir,
                env: process.env,
                useConpty: false,
            });

            const dispData = proc.onData((data: string) => {
                send(wc, "terminal.output", data);
            });

            const dispExit = proc.onExit(({ exitCode, signal }: { exitCode: number; signal?: number }) => {
                send(wc, "terminal.exit", { exitCode, signal });
                active = null;
            });

            active = { process: proc, dispData, dispExit };

        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : String(err);
            console.error(`[terminal] spawn failed: ${msg}`);
            send(wc, "terminal.output", `\r\n\x1b[31m[terminal] failed to start ${shellType ?? "pwsh"}: ${msg}\x1b[0m\r\n`);
        }
    });

    ipcMain.on("terminal.input", (_event: IpcMainEvent, data: string) => {
        active?.process.write(data);
    });

    ipcMain.on("terminal.resize", (_event: IpcMainEvent, { cols, rows }: { cols: number; rows: number }) => {
        if (!active) return;
        try { active.process.resize(cols, rows); }
        catch (err) { console.error("[terminal] resize failed:", err); }
    });

    ipcMain.on("terminal.kill", () => { kill(); });
}

// ── shells ─────────────────────────────────────────────────────────────────────

type ShellType = "pwsh" | "powershell" | "git-bash" | "wsl" | "python" | "ipython" | "node" | "deno";

interface Shell { exe: string; args: string[] }

function resolveShell(shellType?: ShellType): Shell {
    if (process.platform !== "win32") {
        return { exe: process.env.SHELL ?? "bash", args: [] };
    }

    switch (shellType) {
        case "powershell":
            return {exe: "powershell.exe", args: ["-NoLogo"]};
        case "git-bash":   return { exe: "C:\\Program Files\\Git\\bin\\bash.exe",   args: ["-l", "-i"] };
        case "wsl":        return { exe: "wsl.exe",                                 args: [] };
        case "python":     return { exe: "python.exe",                              args: [] };
        case "ipython":    return { exe: "ipython.exe",                             args: [] };
        case "node":       return { exe: "node.exe",                                args: [] };
        case "deno":       return { exe: "deno.exe",                                args: ["repl"] };
        default:
            return {exe: "pwsh.exe", args: ["-NoLogo"]}; // PS7
    }
}

function resolveDir(cwd?: string): string {
    if (cwd && fs.existsSync(cwd)) return cwd;
    if (cwd) console.log(`[terminal] cwd not found: ${cwd}, falling back to homedir`);
    return os.homedir();
}
