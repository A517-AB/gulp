#!/usr/bin/env -S deno run --allow-run --allow-write --allow-read
/* eslint-disable */

declare const Deno: any;

const isWindows = Deno.build.os === "windows";
const npmCmd = isWindows ? "npm.cmd" : "npm";

// ── ANSI ──────────────────────────────────────────────────────────────────────
const R = "\x1b[0m";
const bold = (s: string) => `\x1b[1m${s}${R}`;
const dim = (s: string) => `\x1b[2m${s}${R}`;
const red = (s: string) => `\x1b[31m${s}${R}`;
const green = (s: string) => `\x1b[32m${s}${R}`;
const cyan = (s: string) => `\x1b[36m${s}${R}`;
const gray = (s: string) => `\x1b[90m${s}${R}`;

const SEP = gray("─".repeat(52));
const SEP2 = gray("╌".repeat(52));

// ── Runner ────────────────────────────────────────────────────────────────────
interface JobResult {
    success: boolean;
    code: number;
    output: string;
    durationMs: number;
}

async function runJob(cmd: string[]): Promise<JobResult> {
    const t0 = Date.now();
    try {
        const proc = new Deno.Command(cmd[0], {
            args: cmd.slice(1),
            stdout: "piped",
            stderr: "piped",
        });
        const {code, stdout, stderr} = await proc.output();
        const dec = new TextDecoder();
        return {
            success: code === 0,
            code,
            output: (dec.decode(stdout) + dec.decode(stderr)).trim(),
            durationMs: Date.now() - t0,
        };
    } catch (err) {
        return {
            success: false,
            code: -1,
            output: `Failed to run: ${err instanceof Error ? err.message : String(err)}`,
            durationMs: Date.now() - t0,
        };
    }
}

// ── Test failure parser ────────────────────────────────────────────────────────
function parseTestFailures(output: string): string[] {
    return output
        .split("\n")
        .filter(l => /FAIL|✗|×|AssertionError/i.test(l))
        .map(l => l.trim())
        .slice(0, 8);
}

// ── Terminal display ──────────────────────────────────────────────────────────
function display(test: JobResult, overviewFile: string, now: Date): void {
    const ms = `${(test.durationMs / 1000).toFixed(1)}s`;
    const time = gray(now.toLocaleTimeString());

    console.log("");
    console.log(SEP);
    const status = test.success ? green(bold("✓ PASS")) : red(bold("✗ FAIL"));
    console.log(`  ${status}  ${time}  ${dim(ms)}`);
    console.log(SEP);
    console.log(`  ${test.success ? green("✓") : red("✗")} test  ${dim(ms)}`);

    if (!test.success) {
        const fails = parseTestFailures(test.output);
        if (fails.length > 0) {
            console.log("");
            console.log(`  ${cyan(bold("TEST"))}`);
            console.log(SEP2);
            for (const l of fails) console.log(`  ${red(l)}`);
        }
    }

    console.log("");
    console.log(SEP);
    console.log(`  ${gray(`overview → ${overviewFile}`)}`);
    console.log(`  ${gray(`log      → reports/check.log`)}`);
    console.log("");
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
    const now = new Date();
    const t0 = Date.now();

    try {
        await Deno.mkdir("reports");
    } catch { /* exists */
    }

    const test = await runJob([npmCmd, "run", "test", "--", "--run"]);

    const totalMs = Date.now() - t0;

    // ── overview.json — agents/Claude read this first ─────────────────────────
    const overview = {
        _note: "Start here. Read this before check.log. Full test output is in reports/check.log.",
        timestamp: now.toISOString(),
        success: test.success,
        totalMs,
        test: {
            success: test.success,
            durationMs: test.durationMs,
            failures: test.success ? [] : parseTestFailures(test.output),
        },
    };

    const overviewFile = "reports/overview.json";
    await Deno.writeTextFile(overviewFile, JSON.stringify(overview, null, 2));

    // ── full log ──────────────────────────────────────────────────────────────
    const log = [
        "=".repeat(80),
        `CHECK  ${now.toISOString()}`,
        "=".repeat(80),
        "",
        "TEST",
        "─".repeat(40),
        test.output || "(no output)",
        "",
    ].join("\n");

    await Deno.writeTextFile("reports/check.log", log);

    display(test, overviewFile, now);

    Deno.exit(test.success ? 0 : 1);
}

if (import.meta.main) {
    main();
}
