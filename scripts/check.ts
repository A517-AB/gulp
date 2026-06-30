#!/usr/bin/env -S deno run --allow-run --allow-write --allow-read
/* eslint-disable */

// Deno global for Node/tsc compat
declare const Deno: any;

const isWindows = Deno.build.os === "windows";
const npmCmd = isWindows ? "npm.cmd" : "npm";
const isAiMode = Deno.args.includes("--ai");

// ── Job filter ────────────────────────────────────────────────────────────────
// Default: all. Pass --tc / --lint / --test to run only those.
const hasFilter = ["--tc", "--lint", "--test"].some(f => Deno.args.includes(f));
const runTc = !hasFilter || Deno.args.includes("--tc");
const runLint = !hasFilter || Deno.args.includes("--lint");
const runTest = !hasFilter || Deno.args.includes("--test");

// ── ANSI ──────────────────────────────────────────────────────────────────────
const R = "\x1b[0m";
const bold = (s: string) => `\x1b[1m${s}${R}`;
const dim = (s: string) => `\x1b[2m${s}${R}`;
const red = (s: string) => `\x1b[31m${s}${R}`;
const green = (s: string) => `\x1b[32m${s}${R}`;
const yellow = (s: string) => `\x1b[33m${s}${R}`;
const blue = (s: string) => `\x1b[34m${s}${R}`;
const magenta = (s: string) => `\x1b[35m${s}${R}`;
const cyan = (s: string) => `\x1b[36m${s}${R}`;
const gray = (s: string) => `\x1b[90m${s}${R}`;

// ── Types ─────────────────────────────────────────────────────────────────────
interface RawResult {
    success: boolean;
    code: number;
    output: string;
}

interface TscError {
    line: number;
    col: number;
    code: string;
    message: string;
}

interface EslintError {
    line: number;
    col: number;
    message: string;
    rule?: string;
}

// ── Runner ────────────────────────────────────────────────────────────────────
async function runJob(cmd: string[]): Promise<RawResult> {
    try {
        const proc = new Deno.Command(cmd[0], {
            args: cmd.slice(1),
            stdout: "piped",
            stderr: "piped",
        });
        const {code, stdout, stderr} = await proc.output();
        const dec = new TextDecoder();
        const output = (dec.decode(stdout) + dec.decode(stderr)).trim();
        return {success: code === 0, code, output};
    } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        return {success: false, code: -1, output: `Failed to run: ${message}`};
    }
}

// ── TSC parser ────────────────────────────────────────────────────────────────
const TSC_LINE = /^(.+?)\((\d+),(\d+)\): (?:error|warning) (TS\d+): (.+)$/;

function parseTsc(output: string): Map<string, TscError[]> {
    const byFile = new Map<string, TscError[]>();
    for (const raw of output.split("\n")) {
        const m = TSC_LINE.exec(raw.trim());
        if (!m) continue;
        const file = m[1] ?? "";
        if (!byFile.has(file)) byFile.set(file, []);
        byFile.get(file)!.push({
            line: +(m[2] ?? "0"),
            col: +(m[3] ?? "0"),
            code: m[4] ?? "",
            message: m[5] ?? "",
        });
    }
    return byFile;
}

// ── ESLint parser ─────────────────────────────────────────────────────────────
// Stylish line format: "  9:27  error  message  rule"
const ESLINT_PREFIX = /^\s+(\d+):(\d+)\s+(error|warning)\s+/;

function parseEslint(output: string): {
    ruleErrors: Map<string, EslintError[]>;
    parseErrors: Map<string, EslintError[]>;
} {
    const ruleErrors = new Map<string, EslintError[]>();
    const parseErrors = new Map<string, EslintError[]>();
    let currentFile = "";

    for (const line of output.split("\n")) {
        const trim = line.trim();
        if (!trim) continue;
        if (/^[✖✔✗]/.test(trim) || /^\d+ problems/.test(trim)) continue;

        const pm = ESLINT_PREFIX.exec(line);
        if (pm) {
            const rest = line.slice(pm[0].length);
            const ruleM = /\s{2,}(\S+)$/.exec(rest);
            const entry: EslintError = {
                line: +(pm[1] ?? "0"),
                col: +(pm[2] ?? "0"),
                message: ruleM ? rest.slice(0, ruleM.index).trim() : rest.trim(),
                rule: ruleM?.[1],
            };
            const isParse = entry.message.startsWith("Parsing error:");
            const map = isParse ? parseErrors : ruleErrors;
            if (!map.has(currentFile)) map.set(currentFile, []);
            map.get(currentFile)!.push(entry);
        } else if (!line.startsWith(" ") && !line.startsWith("\t")) {
            currentFile = trim;
        }
    }

    return {ruleErrors, parseErrors};
}

// ── Util ──────────────────────────────────────────────────────────────────────
function stripCwd(file: string): string {
    const cwd = String(Deno.cwd()).replace(/\\/g, "/");
    const norm = file.replace(/\\/g, "/");
    return norm.startsWith(cwd + "/") ? norm.slice(cwd.length + 1) : norm;
}

function sum<T>(map: Map<string, T[]>): number {
    return [...map.values()].reduce((s, a) => s + a.length, 0);
}

const SEP = gray("─".repeat(60));
const SEP2 = gray("╌".repeat(60));

// ── Human: typecheck section ──────────────────────────────────────────────────
function printTcSection(result: RawResult): void {
    if (result.success) return;

    const byFile = parseTsc(result.output);
    if (byFile.size === 0) return;

    console.log("");
    console.log(`  ${cyan(bold("TYPECHECK"))}`);
    console.log(SEP2);

    let shown = 0;
    for (const [file, errors] of byFile) {
        if (shown >= 8) {
            console.log(`  ${gray(`... +${byFile.size - shown} more files`)}`);
            break;
        }

        console.log(`  ${yellow(bold(stripCwd(file)))}`);

        for (const e of errors.slice(0, 4)) {
            const loc = dim(`${e.line}:${e.col}`);
            const code = magenta(e.code);
            console.log(`    ${loc}  ${code}  ${e.message}`);
        }
        if (errors.length > 4) {
            console.log(`    ${gray(`+${errors.length - 4} more`)}`);
        }

        shown++;
    }
}

// ── Human: lint section ───────────────────────────────────────────────────────
function printLintSection(result: RawResult): void {
    const {ruleErrors, parseErrors} = parseEslint(result.output);
    const ruleTotal = sum(ruleErrors);
    const parseTotal = sum(parseErrors);

    if (ruleTotal === 0 && parseTotal === 0) return;

    console.log("");
    console.log(`  ${cyan(bold("LINT"))}`);
    console.log(SEP2);

    for (const [file, errors] of ruleErrors) {
        console.log(`  ${yellow(bold(stripCwd(file)))}`);
        for (const e of errors) {
            const loc = dim(`${e.line}:${e.col}`);
            const rule = e.rule ? `  ${blue(e.rule)}` : "";
            console.log(`    ${loc}  ${e.message}${rule}`);
        }
    }

    if (parseTotal > 0) {
        const dirCounts = new Map<string, number>();
        for (const [file, errs] of parseErrors) {
            const dir = stripCwd(file).split("/").slice(0, 3).join("/");
            dirCounts.set(dir, (dirCounts.get(dir) ?? 0) + errs.length);
        }

        if (ruleTotal > 0) console.log("");
        console.log(`  ${gray(`⚠ ${parseTotal} parsing errors across ${parseErrors.size} files`)}`);

        let d = 0;
        for (const [dir, count] of dirCounts) {
            if (d++ >= 6) {
                console.log(`    ${gray(`... +${dirCounts.size - 6} more`)}`);
                break;
            }
            console.log(`    ${gray(`${dir}/`)}  ${dim(String(count))}`);
        }
    }
}

// ── Human: test section ───────────────────────────────────────────────────────
function printTestSection(result: RawResult): void {
    if (result.success) return;

    const failLines = result.output
        .split("\n")
        .filter(l => /FAIL|✗|×|AssertionError/i.test(l))
        .slice(0, 10);

    if (failLines.length === 0) return;

    console.log("");
    console.log(`  ${cyan(bold("TEST"))}`);
    console.log(SEP2);

    for (const l of failLines) {
        console.log(`  ${red(l.trim())}`);
    }
}

// ── Human display ─────────────────────────────────────────────────────────────
function displayHuman(
    results: { tc?: RawResult; lint?: RawResult; test?: RawResult },
    logFile: string,
    now: Date,
): void {
    const all = Object.values(results).filter(Boolean) as RawResult[];
    const allPass = all.every(r => r.success);

    console.log("");
    console.log(SEP);

    const status = allPass ? green(bold("✓ PASS")) : red(bold("✗ FAIL"));
    const time = gray(now.toLocaleTimeString());
    console.log(`  ${status}  ${time}`);
    console.log(SEP);

    // Summary row per job
    if (results.tc) {
        const tc = parseTsc(results.tc.output);
        const line = results.tc.success
            ? `  ${green("✓")} typecheck`
            : `  ${red("✗")} typecheck  ${red(bold(String(sum(tc))))} errors in ${tc.size} files`;
        console.log(line);
    }

    if (results.lint) {
        const {ruleErrors, parseErrors} = parseEslint(results.lint.output);
        const ruleTotal = sum(ruleErrors);
        const parseTotal = sum(parseErrors);
        let line = results.lint.success
            ? `  ${green("✓")} lint`
            : `  ${red("✗")} lint  ${red(bold(String(ruleTotal)))} rule errors`;
        if (parseTotal > 0) line += `  ${gray(`+${parseTotal} parse`)}`;
        console.log(line);
    }

    if (results.test) {
        const line = results.test.success
            ? `  ${green("✓")} test`
            : `  ${red("✗")} test`;
        console.log(line);
    }

    // Detail sections
    if (results.tc) printTcSection(results.tc);
    if (results.lint) printLintSection(results.lint);
    if (results.test) printTestSection(results.test);

    console.log("");
    console.log(SEP);
    console.log(`  ${gray(`log → ${logFile}`)}`);
    console.log("");
}

// ── AI display ────────────────────────────────────────────────────────────────
function displayAi(
    results: { tc?: RawResult; lint?: RawResult; test?: RawResult },
    logFile: string,
    now: Date,
): void {
    const all = Object.values(results).filter(Boolean) as RawResult[];
    const allPass = all.every(r => r.success);

    const out: Record<string, unknown> = {
        timestamp: now.toISOString(),
        success: allPass,
        logFile,
    };

    if (results.tc) {
        const tc = parseTsc(results.tc.output);
        const errors: Record<string, string[]> = {};
        for (const [file, errs] of tc) {
            errors[stripCwd(file)] = errs.slice(0, 10).map(e => `${e.line}:${e.col} ${e.code} ${e.message}`);
        }
        out["typecheck"] = {
            success: results.tc.success,
            totalErrors: sum(tc),
            filesAffected: tc.size,
            errors,
        };
    }

    if (results.lint) {
        const {ruleErrors, parseErrors} = parseEslint(results.lint.output);
        const lintErrs: Record<string, string[]> = {};
        for (const [file, errs] of ruleErrors) {
            lintErrs[stripCwd(file)] = errs.map(e =>
                `${e.line}:${e.col} ${e.message}${e.rule ? ` [${e.rule}]` : ""}`
            );
        }
        const parseErrDirs: Record<string, number> = {};
        for (const [file, errs] of parseErrors) {
            const dir = stripCwd(file).split("/").slice(0, 3).join("/");
            parseErrDirs[dir] = (parseErrDirs[dir] ?? 0) + errs.length;
        }
        out["lint"] = {
            success: results.lint.success,
            ruleErrors: sum(ruleErrors),
            parseErrors: sum(parseErrors),
            parseErrorFiles: parseErrors.size,
            errors: lintErrs,
            parseErrorsByDir: parseErrDirs,
        };
    }

    if (results.test) {
        out["test"] = {success: results.test.success};
    }

    console.log(JSON.stringify(out, null, 2));
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
    const now = new Date();

    try {
        await Deno.mkdir("reports");
    } catch { /* exists */
    }
    const logFile = "reports/check.log";

    const jobs: Promise<RawResult>[] = [];
    if (runTc) jobs.push(runJob([npmCmd, "run", "typecheck"]));
    if (runLint) jobs.push(runJob([npmCmd, "run", "lint"]));
    if (runTest) jobs.push(runJob([npmCmd, "run", "test", "--", "--run"]));

    const [tcResult, lintResult, testResult] = await Promise.all(jobs);

    const results = {
        tc: runTc ? tcResult : undefined,
        lint: runLint ? lintResult : undefined,
        test: runTest ? testResult : undefined,
    };

    const logParts = ["=".repeat(80), `CHECK  ${now.toISOString()}`, "=".repeat(80), ""];
    if (results.tc) logParts.push("TYPECHECK", "─".repeat(40), results.tc.output || "(no output)", "");
    if (results.lint) logParts.push("LINT", "─".repeat(40), results.lint.output || "(no output)", "");
    if (results.test) logParts.push("TEST", "─".repeat(40), results.test.output || "(no output)", "");
    await Deno.writeTextFile(logFile, logParts.join("\n"));

    const all = Object.values(results).filter(Boolean) as RawResult[];
    const allPass = all.every(r => r.success);

    if (isAiMode) {
        displayAi(results, logFile, now);
    } else {
        displayHuman(results, logFile, now);
    }

    Deno.exit(allPass ? 0 : 1);
}

if (import.meta.main) {
    main();
}
