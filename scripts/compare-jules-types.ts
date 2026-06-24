/**
 * compare-jules-types.ts
 * Extracts and compares exported types from modjules (src/jules) and @google/jules-sdk.
 * Outputs three markdown files to research/.
 *
 * Usage:
 *   deno run --allow-read --allow-write scripts/compare-jules-types.ts
 */

import {walk} from "jsr:@std/fs/walk";
import {join, relative} from "jsr:@std/path";
import {ensureDir} from "jsr:@std/fs/ensure-dir";

const ROOT = new URL("../", import.meta.url).pathname.replace(/^\/([A-Z]:)/, "$1");
const MOD_DIR = join(ROOT, "src/jules");
const SDK_DIR = join(ROOT, "node_modules/@google/jules-sdk/dist");
const OUT_DIR = join(ROOT, "research");

type SymbolKind = "interface" | "type" | "function" | "class" | "enum" | "const" | "declare";

interface ExportedSymbol {
    name: string;
    kind: SymbolKind;
    signature: string; // first meaningful line
    body: string;      // full block, capped
    file: string;
}

const EXPORT_RE = /^export\s+(?:declare\s+)?(?:abstract\s+)?(interface|type|class|enum|function|const)\s+(\w+)/;
const DECLARE_RE = /^export\s+\{([^}]+)\}/;

function extractFromContent(content: string, filePath: string): ExportedSymbol[] {
    const symbols: ExportedSymbol[] = [];
    const lines = content.split("\n");

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i] ?? "";
        const m = line.match(EXPORT_RE);
        if (!m) continue;

        const kind = m[1] as SymbolKind;
        const name = m[2]!;
        const signature = line.trim();

        // Grab body up to closing brace or semicolon, capped at 60 lines
        let body = signature;
        if (!line.includes("{") || !line.includes("}")) {
            const bodyLines: string[] = [line];
            let depth = (line.match(/\{/g) ?? []).length - (line.match(/\}/g) ?? []).length;
            let j = i + 1;
            while (j < lines.length && bodyLines.length < 60) {
                const l = lines[j] ?? "";
                bodyLines.push(l);
                depth += (l.match(/\{/g) ?? []).length;
                depth -= (l.match(/\}/g) ?? []).length;
                if (depth <= 0) break;
                j++;
            }
            body = bodyLines.join("\n");
        }

        symbols.push({name, kind, signature, body, file: filePath});
    }

    return symbols;
}

async function collectSymbols(dir: string, ext: string, skipNodeModules = false): Promise<ExportedSymbol[]> {
    const all: ExportedSymbol[] = [];
    const opts = skipNodeModules ? {exts: [ext], skip: [/node_modules/]} : {exts: [ext]};
    for await (const entry of walk(dir, opts)) {
        const content = await Deno.readTextFile(entry.path);
        const rel = relative(dir, entry.path).replace(/\\/g, "/");
        all.push(...extractFromContent(content, rel));
    }
    return all;
}

function groupByKind(symbols: ExportedSymbol[]): Record<SymbolKind, ExportedSymbol[]> {
    const groups: Record<SymbolKind, ExportedSymbol[]> = {
        interface: [], type: [], function: [], class: [], enum: [], const: [], declare: [],
    };
    for (const s of symbols) {
        groups[s.kind].push(s);
    }
    return groups;
}

function renderSymbolList(symbols: ExportedSymbol[]): string {
    return symbols
        .sort((a, b) => a.name.localeCompare(b.name))
        .map(s => {
            const lines = [`### \`${s.name}\``, `> \`${s.file}\``, "", "```ts", s.body.trim(), "```"];
            return lines.join("\n");
        })
        .join("\n\n---\n\n");
}

function renderDoc(title: string, symbols: ExportedSymbol[]): string {
    const groups = groupByKind(symbols);
    const order: SymbolKind[] = ["interface", "type", "class", "function", "enum", "const", "declare"];
    const sections: string[] = [`# ${title}`, ``, `**Total exported symbols: ${symbols.length}**`, ``];

    // TOC
    sections.push("## Contents\n");
    for (const kind of order) {
        const g = groups[kind];
        if (!g || g.length === 0) continue;
        sections.push(`- [${capitalize(kind)}s](#${kind}s) (${g.length})`);
    }
    sections.push("");

    for (const kind of order) {
        const g = groups[kind];
        if (!g || g.length === 0) continue;
        sections.push(`## ${capitalize(kind)}s\n`);
        sections.push(renderSymbolList(g));
        sections.push("");
    }

    return sections.join("\n");
}

function capitalize(s: string) {
    return s.charAt(0).toUpperCase() + s.slice(1);
}

function renderDiff(
    modSymbols: ExportedSymbol[],
    sdkSymbols: ExportedSymbol[],
): string {
    const modNames = new Map(modSymbols.map(s => [s.name, s]));
    const sdkNames = new Map(sdkSymbols.map(s => [s.name, s]));

    const added = modSymbols.filter(s => !sdkNames.has(s.name));
    const removed = sdkSymbols.filter(s => !modNames.has(s.name));
    const shared = modSymbols.filter(s => sdkNames.has(s.name));

    const lines: string[] = [
        "# API Diff: modjules vs @google/jules-sdk",
        "",
        `| | Count |`,
        `|---|---|`,
        `| Shared | ${shared.length} |`,
        `| New in modjules | ${added.length} |`,
        `| Removed from SDK | ${removed.length} |`,
        "",
    ];

    if (added.length > 0) {
        lines.push("## New in modjules\n");
        lines.push("These exist in modjules but not in `@google/jules-sdk`.\n");
        for (const s of added.sort((a, b) => a.name.localeCompare(b.name))) {
            lines.push(`### \`${s.name}\` (${s.kind})`);
            lines.push(`> \`${s.file}\``);
            lines.push("");
            lines.push("```ts");
            lines.push(s.body.trim());
            lines.push("```");
            lines.push("");
        }
    }

    if (removed.length > 0) {
        lines.push("## Removed from SDK\n");
        lines.push("These were in `@google/jules-sdk` but are not in modjules.\n");
        for (const s of removed.sort((a, b) => a.name.localeCompare(b.name))) {
            lines.push(`### \`${s.name}\` (${s.kind})`);
            lines.push(`> \`${s.file}\``);
            lines.push("");
            lines.push("```ts");
            lines.push(s.body.trim());
            lines.push("```");
            lines.push("");
        }
    }

    if (shared.length > 0) {
        lines.push("## Shared symbols\n");
        lines.push("Present in both. Not expanded — check individual API docs for signatures.\n");
        const byKind = groupByKind(shared);
        for (const kind of ["interface", "type", "function", "class", "enum", "const", "declare"] as SymbolKind[]) {
            const g = byKind[kind];
            if (!g || g.length === 0) continue;
            lines.push(`**${capitalize(kind)}s:** ${g.map(s => `\`${s.name}\``).join(", ")}\n`);
        }
    }

    return lines.join("\n");
}

// Main
await ensureDir(OUT_DIR);

console.log("Extracting modjules types from src/jules (.ts)...");
const modSymbols = await collectSymbols(MOD_DIR, ".ts", true);
console.log(`  Found ${modSymbols.length} exports`);

console.log("Extracting @google/jules-sdk types from dist (.d.ts)...");
const sdkSymbols = await collectSymbols(SDK_DIR, ".d.ts", false);
console.log(`  Found ${sdkSymbols.length} exports`);

const modOut = join(OUT_DIR, "modjules-api.md");
const sdkOut = join(OUT_DIR, "jules-sdk-api.md");
const diffOut = join(OUT_DIR, "api-diff.md");

await Deno.writeTextFile(modOut, renderDoc("modjules API", modSymbols));
await Deno.writeTextFile(sdkOut, renderDoc("@google/jules-sdk API", sdkSymbols));
await Deno.writeTextFile(diffOut, renderDiff(modSymbols, sdkSymbols));

console.log(`\nWritten:`);
console.log(`  ${modOut}`);
console.log(`  ${sdkOut}`);
console.log(`  ${diffOut}`);
