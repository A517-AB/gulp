import { BrowserWindow, Menu, Tray, app, dialog, globalShortcut, ipcMain, nativeImage, powerMonitor } from "electron";
import * as path from "path";
import * as fs$1 from "fs";
import { fileURLToPath } from "url";
import * as pty from "node-pty";
import * as os from "os";
import * as fs from "fs/promises";
//#region src/electron/Terminal.ts
var active = null;
function send(wc, channel, payload) {
	if (wc.isDestroyed()) return;
	wc.send(channel, payload);
}
function kill() {
	if (!active) return;
	active.dispData.dispose();
	active.dispExit.dispose();
	try {
		active.process.kill();
	} catch {}
	active = null;
}
function registerTerminalHandlers(getWebContents) {
	ipcMain.on("terminal.start", (_event, { cwd, shellType }) => {
		kill();
		const wc = getWebContents();
		if (!wc) return;
		const shell = resolveShell(shellType);
		const workingDir = resolveDir(cwd);
		console.log(`[terminal] starting ${shell.exe} in ${workingDir}`);
		try {
			const proc = pty.spawn(shell.exe, shell.args, {
				name: "xterm-256color",
				cols: 80,
				rows: 30,
				cwd: workingDir,
				env: process.env,
				useConpty: true
			});
			active = {
				process: proc,
				dispData: proc.onData((data) => {
					send(wc, "terminal.output", data);
				}),
				dispExit: proc.onExit(({ exitCode, signal }) => {
					send(wc, "terminal.exit", {
						exitCode,
						signal
					});
					active = null;
				})
			};
		} catch (err) {
			const msg = err instanceof Error ? err.message : String(err);
			console.error(`[terminal] spawn failed: ${msg}`);
			send(wc, "terminal.output", `\r\n\x1b[31m[terminal] failed to start ${shellType ?? "pwsh"}: ${msg}\x1b[0m\r\n`);
		}
	});
	ipcMain.on("terminal.input", (_event, data) => {
		active?.process.write(data);
	});
	ipcMain.on("terminal.resize", (_event, { cols, rows }) => {
		if (!active) return;
		try {
			active.process.resize(cols, rows);
		} catch (err) {
			console.error("[terminal] resize failed:", err);
		}
	});
	ipcMain.on("terminal.kill", () => {
		kill();
	});
}
function resolveShell(shellType) {
	if (process.platform !== "win32") return {
		exe: process.env.SHELL ?? "bash",
		args: []
	};
	switch (shellType) {
		case "powershell": return {
			exe: "powershell.exe",
			args: []
		};
		case "git-bash": return {
			exe: "C:\\Program Files\\Git\\bin\\bash.exe",
			args: ["-l", "-i"]
		};
		case "wsl": return {
			exe: "wsl.exe",
			args: []
		};
		case "python": return {
			exe: "python.exe",
			args: []
		};
		case "ipython": return {
			exe: "ipython.exe",
			args: []
		};
		case "node": return {
			exe: "node.exe",
			args: []
		};
		case "deno": return {
			exe: "deno.exe",
			args: ["repl"]
		};
		default: return {
			exe: "pwsh.exe",
			args: []
		};
	}
}
function resolveDir(cwd) {
	if (cwd && fs$1.existsSync(cwd)) return cwd;
	if (cwd) console.log(`[terminal] cwd not found: ${cwd}, falling back to homedir`);
	return os.homedir();
}
//#endregion
//#region src/electron/queues.ts
var BASE_DIR$1 = "D:\\tired";
function ensureFile$1(filePath, defaultContent = "[]") {
	if (!fs$1.existsSync(filePath)) try {
		fs$1.mkdirSync(path.dirname(filePath), { recursive: true });
		fs$1.writeFileSync(filePath, defaultContent, "utf-8");
		console.log(`[queues] created ${filePath}`);
	} catch (err) {
		console.log(`[queues] could not create ${filePath}:`, err);
	}
}
function readJsonArray(filePath) {
	try {
		const raw = fs$1.readFileSync(filePath, "utf-8");
		const parsed = JSON.parse(raw);
		return Array.isArray(parsed) ? parsed : [];
	} catch (err) {
		console.log(`[queues] failed to read ${filePath}:`, err);
		return [];
	}
}
function resolve$1(filename) {
	const filePath = path.join(BASE_DIR$1, filename);
	ensureFile$1(filePath);
	return filePath;
}
function registerQueuesHandlers() {
	ipcMain.handle("queues.getTasks", (_event, _jsonPath) => {
		return readJsonArray(resolve$1("tasks.json"));
	});
	ipcMain.handle("queues.getQueue", (_event, _jsonPath) => {
		return readJsonArray(resolve$1("ipc-queue.json"));
	});
	ipcMain.handle("queues.saveTasks", (_event, data) => {
		const filePath = resolve$1("tasks.json");
		try {
			fs$1.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf-8");
			return true;
		} catch (err) {
			console.log(`[queues] failed to save ${filePath}:`, err);
			return false;
		}
	});
}
//#endregion
//#region src/electron/filesystem.ts
function registerFilesystemHandlers() {
	ipcMain.handle("fs.readdir", async (_e, dir) => {
		return (await fs.readdir(dir, { withFileTypes: true })).map((e) => ({
			name: e.name,
			isDir: e.isDirectory()
		})).filter((e) => !e.name.startsWith(".")).sort((a, b) => {
			if (a.isDir !== b.isDir) return a.isDir ? -1 : 1;
			return a.name.localeCompare(b.name);
		});
	});
	ipcMain.handle("fs.readFile", async (_e, filePath) => {
		const stat = await fs.stat(filePath);
		if (stat.size > 2 * 1024 * 1024) return `[File too large to preview: ${(stat.size / 1024 / 1024).toFixed(1)} MB]`;
		return fs.readFile(filePath, "utf-8");
	});
	ipcMain.handle("fs.showOpenDialog", async () => {
		const result = await dialog.showOpenDialog({
			properties: ["openDirectory"],
			title: "Select working directory"
		});
		return result.canceled ? null : result.filePaths[0] ?? null;
	});
}
//#endregion
//#region src/electron/snippets.ts
var BASE_DIR = app.getAppPath();
function ensureFile(filePath, defaultContent = "[]") {
	if (!fs$1.existsSync(filePath)) try {
		fs$1.mkdirSync(path.dirname(filePath), { recursive: true });
		fs$1.writeFileSync(filePath, defaultContent, "utf-8");
		console.log(`[snippets] created ${filePath}`);
	} catch (err) {
		console.log(`[snippets] could not create ${filePath}:`, err);
	}
}
function resolve(filename) {
	const filePath = path.join(BASE_DIR, filename);
	ensureFile(filePath);
	return filePath;
}
function registerSnippetsHandlers() {
	ipcMain.handle("snippets.get", (_event) => {
		const filePath = resolve("snippets.json");
		try {
			const raw = fs$1.readFileSync(filePath, "utf-8");
			const parsed = JSON.parse(raw);
			return Array.isArray(parsed) ? parsed : [];
		} catch (err) {
			console.log(`[snippets] failed to read ${filePath}:`, err);
			return [];
		}
	});
	ipcMain.handle("snippets.save", (_event, data) => {
		const filePath = resolve("snippets.json");
		try {
			fs$1.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf-8");
			return true;
		} catch (err) {
			console.log(`[snippets] failed to save ${filePath}:`, err);
			return false;
		}
	});
}
//#endregion
//#region src/electron/main.mts
var __filename = fileURLToPath(import.meta.url);
var __dirname = path.dirname(__filename);
var isDev = process.env.NODE_ENV === "development";
var DEV_URL = process.env.VITE_DEV_SERVER_URL ?? "http://127.0.0.1:5173";
console.log("[main] starting, isDev:", isDev);
console.log("[main] __dirname:", __dirname);
console.log("[main] JULES_API_KEY:", process.env.JULES_API_KEY ? "SET ✓" : "NOT SET ✗");
var mainWindow = null;
var tray = null;
var forceQuit = false;
function buildTrayIcon() {
	const size = 16;
	const buf = Buffer.alloc(size * size * 4, 0);
	for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
		const dx = x - size / 2 + .5;
		const dy = y - size / 2 + .5;
		const idx = (y * size + x) * 4;
		if (Math.sqrt(dx * dx + dy * dy) <= size / 2 - 1) {
			buf[idx] = 139;
			buf[idx + 1] = 92;
			buf[idx + 2] = 246;
			buf[idx + 3] = 255;
		}
	}
	return nativeImage.createFromBuffer(buf, {
		width: size,
		height: size
	});
}
function createWindow() {
	const preloadPath = path.join(__dirname, "preload.mjs");
	console.log("[main] preload path:", preloadPath, "exists:", fs$1.existsSync(preloadPath));
	mainWindow = new BrowserWindow({
		width: 1200,
		height: 800,
		titleBarStyle: "hidden",
		webPreferences: {
			preload: preloadPath,
			contextIsolation: true,
			nodeIntegration: false
		}
	});
	if (isDev) {
		console.log("[main] loading dev URL:", DEV_URL);
		mainWindow.loadURL(DEV_URL);
	} else {
		const prodFile = path.join(__dirname, "../dist/index.html");
		console.log("[main] loading prod file:", prodFile);
		mainWindow.loadFile(prodFile);
	}
	mainWindow.webContents.on("did-finish-load", () => {
		console.log("[main] renderer loaded ok");
	});
	mainWindow.webContents.on("did-fail-load", (_e, code, desc, url) => {
		console.error("[main] renderer failed to load:", url, code, desc);
		if (isDev) {
			console.log("[main] retrying in 1s — is 'npm run dev' running?");
			setTimeout(() => mainWindow?.loadURL(DEV_URL), 1e3);
		}
	});
	mainWindow.on("close", (e) => {
		if (!forceQuit) {
			e.preventDefault();
			mainWindow?.hide();
		}
	});
	mainWindow.on("closed", () => {
		mainWindow = null;
	});
}
ipcMain.on("window.minimize", () => {
	mainWindow?.minimize();
});
ipcMain.on("window.maximize", () => {
	if (mainWindow?.isMaximized()) mainWindow.unmaximize();
	else mainWindow?.maximize();
});
ipcMain.on("window.close", () => {
	mainWindow?.close();
});
app.whenReady().then(() => {
	console.log("[main] app ready");
	registerTerminalHandlers(() => mainWindow?.webContents ?? null);
	registerQueuesHandlers();
	registerFilesystemHandlers();
	registerSnippetsHandlers();
	createWindow();
	tray = new Tray(buildTrayIcon());
	tray.setToolTip("Last");
	tray.setContextMenu(Menu.buildFromTemplate([
		{
			label: "Show",
			click: () => {
				mainWindow?.show();
				mainWindow?.focus();
			}
		},
		{ type: "separator" },
		{
			label: "Quit",
			click: () => {
				forceQuit = true;
				app.quit();
			}
		}
	]));
	tray.on("click", () => {
		if (mainWindow?.isVisible()) mainWindow.hide();
		else {
			mainWindow?.show();
			mainWindow?.focus();
		}
	});
	globalShortcut.register("Ctrl+Shift+Space", () => {
		if (mainWindow?.isVisible() && mainWindow?.isFocused()) mainWindow.hide();
		else {
			mainWindow?.show();
			mainWindow?.focus();
		}
	});
	powerMonitor.on("suspend", () => mainWindow?.webContents.send("power.suspend"));
	powerMonitor.on("resume", () => mainWindow?.webContents.send("power.resume"));
	powerMonitor.on("lock-screen", () => mainWindow?.webContents.send("power.suspend"));
	powerMonitor.on("unlock-screen", () => mainWindow?.webContents.send("power.resume"));
	app.on("activate", () => {
		if (BrowserWindow.getAllWindows().length === 0) createWindow();
	});
});
app.on("will-quit", () => {
	globalShortcut.unregisterAll();
});
app.on("window-all-closed", () => {});
ipcMain.handle("env.getApiKey", () => {
	const apiKey = process.env.JULES_API_KEY || null;
	console.log("[main] env.getApiKey called, returning:", apiKey ? "API Key SET" : "API Key NOT SET");
	return apiKey;
});
//#endregion
