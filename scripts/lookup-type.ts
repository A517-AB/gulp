/**
 * lookup-type.ts
 * Extract type/interface definitions from .ts and .d.ts files.
 *
 * Usage:
 *   deno run --allow-read scripts/lookup-type.ts <Name> [dir] [flags]
 *
 * Flags:
 *   --similar    include names that contain the query string
 *   --related    also extract types referenced inside the matched block
 *   --ext dts    only search .d.ts files (default: both .ts and .d.ts)
 *   --ext ts     only search .ts files
 *   --copy       print a single clean copyable block (no decorations)
 */

import {walk} from "jsr:@std/fs/walk";
import {relative} from "jsr:@std/path";

const args = Deno.args;
if (args.length === 0) {
    console.error("Usage: lookup-type.ts <TypeName> [dir] [--similar] [--related] [--ext dts|ts] [--copy]");
    Deno.exit(1);
}

const query = args[0]!;
const flags = new Set(args.filter(a => a.startsWith("--")));
const positional = args.filter(a => !a.startsWith("--"));
const searchDir = positional[1] ?? ".";

const extFlag = args.find((_, i) => args[i - 1] === "--ext");
const exts = extFlag === "dts" ? [".d.ts"] : extFlag === "ts" ? [".ts"] : [".ts", ".d.ts"];

const similar = flags.has("--similar");
const related = flags.has("--related");
const copy = flags.has("--copy");

const EXPORT_RE = /^export\s+(?:declare\s+)?(?:abstract\s+)?(interface|type|class|enum|function|const)\s+(\w+)/;

interface Symbol {
    name: string;
    kind: string;
    body: string;
    file: string;
}

async function extractAll(dir: string): Promise<Symbol[]> {
    const all: Symbol[] = [];
    const seen = new Set<string>();

    for await (const entry of walk(dir, {skip: [/node_modules\/(?!@google)/]})) {
        if (!entry.isFile) continue;
        const isTs = entry.name.endsWith(".ts") && !entry.name.endsWith(".d.ts");
        const isDts = entry.name.endsWith(".d.ts");
        if (!((exts.includes(".ts") && isTs) || (exts.includes(".d.ts") && isDts))) continue;

        const content = await Deno.readTextFile(entry.path);
        const lines = content.split("\n");
        const rel = relative(dir, entry.path).replace(/\\/g, "/");

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i] ?? "";
            const m = line.match(EXPORT_RE);
            if (!m) continue;

            const kind = m[1]!;
            const name = m[2]!;
            const key = `${name}::${rel}`;
            if (seen.has(key)) continue;
            seen.add(key);

            const bodyLines: string[] = [line];
            let depth = (line.match(/\{/g) ?? []).length - (line.match(/\}/g) ?? []).length;
            let j = i + 1;

            if (depth > 0 || (kind !== "const" && !line.includes(";"))) {
                while (j < lines.length && bodyLines.length < 80) {
                    const l = lines[j] ?? "";
                    bodyLines.push(l);
                    depth += (l.match(/\{/g) ?? []).length;
                    depth -= (l.match(/\}/g) ?? []).length;
                    if (depth <= 0 && l.trim()) break;
                    j++;
                }
            }

            all.push({name, kind, body: bodyLines.join("\n"), file: rel});
        }
    }

    return all;
}

function findRelatedNames(body: string): string[] {
    const matches = body.match(/\b([A-Z][A-Za-z0-9]+)\b/g) ?? [];
    return [...new Set(matches)];
}

function render(sym: Symbol, label?: string): string {
    if (copy) return sym.body.trim();
    const tag = label ? ` [${label}]` : "";
    return `\n${"─".repeat(60)}\n${sym.kind} \`${sym.name}\`${tag}  →  ${sym.file}\n${"─".repeat(60)}\n${sym.body.trim()}\n`;
}

// Main
const all = await extractAll(searchDir);
const queryLower = query.toLowerCase();

const exact = all.filter(s => s.name === query);
const similarMatches = similar
    ? all.filter(s => s.name !== query && s.name.toLowerCase().includes(queryLower))
    : [];

if (exact.length === 0 && similarMatches.length === 0) {
    console.log(`No match for "${query}"${similar ? " (similar search included)" : ". Try --similar"}`);
    Deno.exit(0);
}

const output: string[] = [];

for (const sym of exact) {
    output.push(render(sym, exact.length > 1 ? sym.file : undefined));
}

if (similarMatches.length > 0) {
    if (!copy) output.push(`\n${"─".repeat(60)}\nSimilar names:\n${"─".repeat(60)}`);
    for (const sym of similarMatches.slice(0, 10)) {
        output.push(render(sym, "similar"));
    }
    if (similarMatches.length > 10 && !copy) {
        output.push(`  ... and ${similarMatches.length - 10} more (results capped at 10)`);
    }
}

if (related && exact.length > 0) {
    const referencedNames = new Set(exact.flatMap(s => findRelatedNames(s.body)));
    referencedNames.delete(query);
    const relatedSymbols = all.filter(s => referencedNames.has(s.name) && !exact.find(e => e.name === s.name));

    const deduped = [...new Map(relatedSymbols.map(s => [s.name, s])).values()];

    if (deduped.length > 0) {
        if (!copy) output.push(`\n${"─".repeat(60)}\nReferenced types:\n${"─".repeat(60)}`);
        for (const sym of deduped.slice(0, 15)) {
            output.push(render(sym, "referenced"));
        }
        if (deduped.length > 15 && !copy) {
            output.push(`  ... and ${deduped.length - 15} more referenced types (capped at 15)`);
        }
    }
}

console.log(output.join("\n"));
