#!/usr/bin/env -S deno run --allow-run --allow-write --allow-read
/* eslint-disable */
/**
 * Combined Typecheck and Lint Runner
 * Writes a consolidated log file with an overview at the top.
 * Supports Human-friendly or AI-friendly output modes.
 *
 * Usage:
 *   deno run --allow-run --allow-write --allow-read scripts/check.ts [--ai | --human]
 */

// Declare Deno global for Node/tsc compatibility
declare const Deno: any;

const isWindows = Deno.build.os === "windows";
const npmCmd = isWindows ? "npm.cmd" : "npm";

// Parse CLI flags
const isAiMode = Deno.args.includes("--ai");

// Helper to run a command and capture output
async function runJob(cmd: string[]): Promise<{
    success: boolean;
    code: number;
    output: string;
    errors: string[];
}> {
    try {
        const process = new Deno.Command(cmd[0], {
            args: cmd.slice(1),
            stdout: "piped",
            stderr: "piped",
        });

        const {code, stdout, stderr} = await process.output();
        const rawOut = new TextDecoder().decode(stdout);
        const rawErr = new TextDecoder().decode(stderr);
        const output = (rawOut + rawErr).trim();

        // Parse out error lines
        const lines = output.split("\n");
        const errors = lines.filter(line =>
            /error/i.test(line) ||
            /failed/i.test(line) ||
            /exception/i.test(line) ||
            /TS\d+:/i.test(line)
        ).map(line => line.trim());

        return {
            success: code === 0,
            code,
            output,
            errors,
        };
    } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        return {
            success: false,
            code: -1,
            output: `Failed to execute command: ${message}`,
            errors: [message],
        };
    }
}

async function main() {
    const now = new Date();
    // Generate local ISO-like string: YYYY-MM-DD_HH-mm-ss
    const offsetMs = now.getTimezoneOffset() * 60 * 1000;
    const localISOTime = new Date(now.getTime() - offsetMs).toISOString();
    const dateStr = localISOTime.replace("T", "_").replace(/[:.]/g, "-").slice(0, 19);

    // Ensure reports/ directory exists
    try {
        await Deno.mkdir("reports");
    } catch {
        // Already exists or ignore
    }
    const logFilename = `reports/check_${dateStr}.log`;

    // Define jobs
    const typecheckJob = [npmCmd, "run", "typecheck"];
    const lintJob = [npmCmd, "run", "lint"];

    // Run in parallel
    const [tcResult, lintResult] = await Promise.all([
        runJob(typecheckJob),
        runJob(lintJob),
    ]);

    const allSuccess = tcResult.success && lintResult.success;

    // Build the log content with overview at the top
    const logContent = [
        "================================================================================",
        "                           CHECK RUN OVERVIEW                                   ",
        "================================================================================",
        `Local Time: ${now.toString()}`,
        `UTC Time:   ${now.toISOString()}`,
        `Status:     ${allSuccess ? "PASS" : "FAIL"}`,
        `Typecheck:  ${tcResult.success ? "PASS" : `FAIL (${tcResult.errors.length} error lines)`}`,
        `Lint:       ${lintResult.success ? "PASS" : `FAIL (${lintResult.errors.length} error lines)`}`,
        "================================================================================",
        "\n",
        "================================================================================",
        "1. TYPECHECK DETAILED OUTPUT",
        "================================================================================",
        tcResult.output || "(no output)",
        "\n",
        "================================================================================",
        "2. LINT DETAILED OUTPUT",
        "================================================================================",
        lintResult.output || "(no output)",
    ].join("\n");

    // Write log to reports directory
    await Deno.writeTextFile(logFilename, logContent);

    if (isAiMode) {
        // AI Mode: Structured, token-efficient JSON output
        const aiOutput = {
            timestamp,
            success: allSuccess,
            logFile: logFilename,
            typecheck: {
                success: tcResult.success,
                code: tcResult.code,
                errorCount: tcResult.errors.length,
                errors: tcResult.errors.slice(0, 30), // Limit array to save context tokens
            },
            lint: {
                success: lintResult.success,
                code: lintResult.code,
                errorCount: lintResult.errors.length,
                errors: lintResult.errors.slice(0, 30),
            }
        };
        console.log(JSON.stringify(aiOutput, null, 2));
    } else {
        // Human Mode: Short and clean summary
        console.log(`\n${allSuccess ? "✓ PASS" : "✗ FAIL"}`);
        console.log(`Log saved to: ${logFilename}`);
        console.log("─".repeat(50));

        // Typecheck Summary
        if (tcResult.success) {
            console.log("✓ Typecheck passed");
        } else {
            console.log(`✗ Typecheck failed (${tcResult.errors.length} errors)`);
            tcResult.errors.slice(0, 5).forEach(e => console.log(`  ${e}`));
            if (tcResult.errors.length > 5) {
                console.log(`  ... and ${tcResult.errors.length - 5} more lines (see log)`);
            }
        }

        // Lint Summary
        if (lintResult.success) {
            console.log("✓ Lint passed");
        } else {
            console.log(`✗ Lint failed (${lintResult.errors.length} errors)`);
            lintResult.errors.slice(0, 5).forEach(e => console.log(`  ${e}`));
            if (lintResult.errors.length > 5) {
                console.log(`  ... and ${lintResult.errors.length - 5} more lines (see log)`);
            }
        }
        console.log("─".repeat(50));
    }

    Deno.exit(allSuccess ? 0 : 1);
}

if (import.meta.main) {
    main();
}
