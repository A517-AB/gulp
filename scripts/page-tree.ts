#!/usr/bin/env -S deno run --allow-read --allow-write --allow-run
/**
 * page-tree.ts — dependency graph per scan zone, outputs Mermaid diagram + SVG
 *
 * Usage:
 *   deno run --allow-read --allow-write --allow-run scripts/page-tree.ts
 *   deno run --allow-read --allow-write --allow-run scripts/page-tree.ts --depth 3
 *   deno run --allow-read --allow-write --allow-run scripts/page-tree.ts --zone electron
 *   deno run --allow-read --allow-write --allow-run scripts/page-tree.ts --file SnippetsPage
 *
 * Output: research/page-tree.mmd  +  research/page-tree.html  +  research/page-tree.svg (if mmdc in PATH)
 */

import { walk } from "jsr:@std/fs/walk";
import { existsSync } from "jsr:@std/fs/exists";
import { resolve, relative, dirname, join, basename } from "jsr:@std/path";

// ─────────────────────────────────────────────────────────────────────────────
// SCAN CONFIG — edit this to add/remove zones or change depth per zone
// Each zone is a named directory the script treats as a root group.
// Files inside are treated as entry points (each gets its own import tree).
// ─────────────────────────────────────────────────────────────────────────────

const ROOT = resolve(import.meta.dirname!, "..");
const SRC  = join(ROOT, "src");

interface ScanZone {
  name:     string;   // label shown in diagram subgraph
  dir:      string;   // absolute path to scan
  exts:     string[]; // file extensions to treat as entry points
  depth:    number;   // how deep to follow imports (overridden by --depth)
  flat:     boolean;  // true = don't create sub-subgraphs per subfolder
}

const ZONES: ScanZone[] = [
  {
    name:  "electron",
    dir:   join(ROOT, "electron"),
    exts:  ["ts", "mts"],
    depth: 2,
    flat:  true,
  },
  {
    name:  "pages/electron",
    dir:   join(SRC, "renderer", "pages", "electron"),
    exts:  ["tsx", "ts"],
    depth: 2,
    flat:  false,
  },
  {
    name:  "pages/web",
    dir:   join(SRC, "renderer", "pages", "web"),
    exts:  ["tsx", "ts"],
    depth: 2,
    flat:  false,
  },
  {
    name:  "pages/shared",
    dir:   join(SRC, "renderer", "pages", "shared"),
    exts:  ["tsx", "ts"],
    depth: 2,
    flat:  false,
  },
  {
    name:  "components",
    dir:   join(SRC, "renderer", "components"),
    exts:  ["tsx", "ts"],
    depth: 1,
    flat:  false,
  },
  {
    name:  "hooks",
    dir:   join(SRC, "renderer", "hooks"),
    exts:  ["ts"],
    depth: 2,
    flat:  true,
  },
  {
    name:  "store",
    dir:   join(SRC, "renderer", "store"),
    exts:  ["ts"],
    depth: 1,
    flat:  true,
  },
  {
    name:  "shared",
    dir:   join(SRC, "shared"),
    exts:  ["ts"],
    depth: 1,
    flat:  true,
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// PATH ALIASES — mirrors tsconfig.app.json + tsconfig.node.json
// ─────────────────────────────────────────────────────────────────────────────

const ALIASES: Array<[string, string]> = [
  ["@shared/",      join(SRC, "shared")                    + "/"],
  ["@shared",       join(SRC, "shared", "index")],
  ["@renderer/",    join(SRC, "renderer")                  + "/"],
  ["@electron/",    join(ROOT, "electron")                 + "/"],
  ["@/components/", join(SRC, "renderer", "components")    + "/"],
  ["@/hooks/",      join(SRC, "renderer", "hooks")         + "/"],
  ["@/store/",      join(SRC, "renderer", "store")         + "/"],
  ["@/lib/",        join(SRC, "renderer", "lib")           + "/"],
  ["@/utils/",      join(SRC, "renderer", "utils")         + "/"],
  ["@/ui/",         join(SRC, "renderer", "ui")            + "/"],
  ["@/types/",      join(SRC, "types")                     + "/"],
  ["@/",            join(SRC, "renderer")                  + "/"],
];

// ─────────────────────────────────────────────────────────────────────────────
// OUTPUT
// ─────────────────────────────────────────────────────────────────────────────

const OUT_MMD  = join(ROOT, "research", "page-tree.mmd");
const OUT_MD   = join(ROOT, "research", "page-tree.md");
const OUT_SVG  = join(ROOT, "research", "page-tree.svg");
const OUT_HTML = join(ROOT, "research", "page-tree.html");

// ─────────────────────────────────────────────────────────────────────────────
// PATH RESOLUTION
// ─────────────────────────────────────────────────────────────────────────────

function applyAlias(imp: string): string {
  for (const [alias, target] of ALIASES) {
    if (imp.startsWith(alias)) return imp.replace(alias, target);
  }
  return imp;
}

const EXTS = [".ts", ".tsx", ".mts", ".js", ".jsx"];

function tryResolve(p: string): string | null {
  try {
    if (existsSync(p) && !Deno.statSync(p).isDirectory) return p;
  } catch { /* skip */ }
  for (const ext of EXTS) {
    if (existsSync(p + ext)) return p + ext;
  }
  for (const ext of EXTS) {
    const idx = join(p, "index" + ext);
    if (existsSync(idx)) return idx;
  }
  return null;
}

function resolveImport(imp: string, fromFile: string): string | null {
  if (!imp.startsWith(".") && !imp.startsWith("@")) return null;
  const abs = imp.startsWith(".")
    ? resolve(dirname(fromFile), imp)
    : applyAlias(imp);
  return tryResolve(abs);
}

// ─────────────────────────────────────────────────────────────────────────────
// IMPORT EXTRACTION
// ─────────────────────────────────────────────────────────────────────────────

function extractImports(src: string): string[] {
  const re = /(?:import|from)\s+['"]([^'"]+)['"]/g;
  const out: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(src)) !== null) out.push(m[1]!);
  return out;
}

// ─────────────────────────────────────────────────────────────────────────────
// DEPENDENCY GRAPH
// ─────────────────────────────────────────────────────────────────────────────

type Graph = Map<string, Set<string>>;

function collectDeps(
  file: string,
  graph: Graph,
  visited: Set<string>,
  depth: number,
  maxDepth: number,
): void {
  if (visited.has(file) || depth > maxDepth) return;
  visited.add(file);
  let src: string;
  try { src = Deno.readTextFileSync(file); } catch { return; }
  for (const imp of extractImports(src)) {
    const resolved = resolveImport(imp, file);
    if (!resolved) continue;
    if (!graph.has(file)) graph.set(file, new Set());
    graph.get(file)!.add(resolved);
    collectDeps(resolved, graph, visited, depth + 1, maxDepth);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// MERMAID HELPERS
// ─────────────────────────────────────────────────────────────────────────────

function nodeId(file: string): string {
  // Use path relative to ROOT so electron/ and src/ don't collide
  return relative(ROOT, file)
    .replace(/\\/g, "/")
    .replace(/\.(tsx?|mts|js)$/, "")
    .replace(/[^a-zA-Z0-9]/g, "_");
}

function nodeLabel(file: string): string {
  return basename(file).replace(/\.(tsx?|mts|js)$/, "");
}

// ─────────────────────────────────────────────────────────────────────────────
// FILE DISCOVERY
// ─────────────────────────────────────────────────────────────────────────────

async function findFilesInZone(zone: ScanZone): Promise<string[]> {
  if (!existsSync(zone.dir)) return [];
  const files: string[] = [];
  for await (const entry of walk(zone.dir, { exts: zone.exts, includeFiles: true, includeDirs: false })) {
    // skip barrel index files — they're not entry points, just re-exports
    if (entry.name === "index.ts" || entry.name === "index.tsx") continue;
    files.push(entry.path);
  }
  return files;
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN
// ─────────────────────────────────────────────────────────────────────────────

async function main() {
  const args = Object.fromEntries(
    Deno.args.flatMap((a, i, arr) =>
      a.startsWith("--") ? [[a.slice(2), arr[i + 1] ?? "true"]] : []
    ),
  ) as Record<string, string>;

  const depthOverride = args["depth"] ? Number(args["depth"]) : null;
  const zoneFilter    = args["zone"];   // e.g. --zone electron
  const fileFilter    = args["file"];   // e.g. --file SnippetsPage

  const activeZones = ZONES.filter(z =>
    !zoneFilter || z.name.toLowerCase().includes(zoneFilter.toLowerCase())
  );

  if (activeZones.length === 0) {
    console.error(`No zones match --zone "${zoneFilter}". Available: ${ZONES.map(z => z.name).join(", ")}`);
    Deno.exit(1);
  }

  console.log(`page-tree  zones=${activeZones.map(z => z.name).join(", ")}${fileFilter ? `  file=${fileFilter}` : ""}`);

  // Collect all files per zone
  const zoneFiles = new Map<ScanZone, string[]>();
  for (const zone of activeZones) {
    let files = await findFilesInZone(zone);
    if (fileFilter) {
      files = files.filter(f =>
        basename(f).toLowerCase().includes(fileFilter.toLowerCase())
      );
    }
    if (files.length > 0) zoneFiles.set(zone, files);
  }

  // Build dep graphs + cross-zone share count
  const fileGraphs    = new Map<string, Graph>();
  const fileZoneCount = new Map<string, Set<string>>(); // file → set of zone names that reference it

  for (const [zone, files] of zoneFiles) {
    const maxDepth = depthOverride ?? zone.depth;
    for (const file of files) {
      const graph: Graph = new Map();
      const visited = new Set<string>();
      collectDeps(file, graph, visited, 0, maxDepth);
      fileGraphs.set(file, graph);
      for (const f of visited) {
        if (!fileZoneCount.has(f)) fileZoneCount.set(f, new Set());
        fileZoneCount.get(f)!.add(zone.name);
      }
    }
  }

  // ── Render Mermaid ──────────────────────────────────────────────────────────

  const lines: string[] = ["graph TD"];
  const renderedEdges = new Set<string>();

  for (const [zone, files] of zoneFiles) {
    const zoneId = zone.name.replace(/[^a-zA-Z0-9]/g, "_");
    lines.push(`\n  subgraph ${zoneId}["${zone.name}"]`);

    if (!zone.flat) {
      // Group by immediate subfolder
      const byFolder = new Map<string, string[]>();
      for (const file of files) {
        const rel  = relative(zone.dir, file).replace(/\\/g, "/");
        const sub  = rel.includes("/") ? rel.split("/")[0]! : "_root";
        if (!byFolder.has(sub)) byFolder.set(sub, []);
        byFolder.get(sub)!.push(file);
      }

      for (const [sub, subFiles] of byFolder) {
        if (sub !== "_root") {
          const subId = `${zoneId}_${sub.replace(/[^a-zA-Z0-9]/g, "_")}`;
          lines.push(`    subgraph ${subId}["${sub}/"]`);
        }
        for (const file of subFiles) {
          renderEdges(file, fileGraphs, fileZoneCount, renderedEdges, lines, "      ");
        }
        if (sub !== "_root") lines.push("    end");
      }
    } else {
      for (const file of files) {
        renderEdges(file, fileGraphs, fileZoneCount, renderedEdges, lines, "    ");
      }
    }

    lines.push("  end");
  }

  // Style cross-zone shared nodes
  const sharedFiles = [...fileZoneCount.entries()]
    .filter(([, zones]) => zones.size > 1)
    .map(([f]) => f);

  if (sharedFiles.length > 0) {
    lines.push("\n  %% ◆ = referenced from multiple zones");
    for (const f of sharedFiles) {
      lines.push(`  style ${nodeId(f)} fill:#1e293b,stroke:#6366f1,color:#e2e8f0,stroke-width:2px`);
    }
  }

  const diagram = lines.join("\n");

  // ── Write output ────────────────────────────────────────────────────────────

  const generated = new Date().toISOString();

  await Deno.mkdir(dirname(OUT_MMD), { recursive: true });
  await Deno.writeTextFile(OUT_MMD, diagram);
  await Deno.writeTextFile(
    OUT_MD,
    `# Page Dependency Tree\n\nGenerated: ${generated}\n\n> ◆ = referenced from multiple zones\n\n\`\`\`mermaid\n${diagram}\n\`\`\`\n`,
  );

  const htmlZones = [...zoneFiles.entries()].map(([zone, files]) => ({
    name:  zone.name,
    files: files.map(f => relative(ROOT, f).replace(/\\/g, "/")),
  }));
  const htmlShared = sharedFiles.map(f => ({
    path:  relative(ROOT, f).replace(/\\/g, "/"),
    zones: [...(fileZoneCount.get(f)?.values() ?? [])],
  }));
  await Deno.writeTextFile(
    OUT_HTML,
    buildHtml({ diagram, generated, depth: depthOverride ?? 2, zones: htmlZones, sharedFiles: htmlShared }),
  );

  console.log(`✓ ${OUT_MMD}`);
  console.log(`✓ ${OUT_MD}`);
  console.log(`✓ ${OUT_HTML}`);

  // ── mmdc render ─────────────────────────────────────────────────────────────

  try {
    const result = await new Deno.Command("mmdc", {
      args: ["-i", OUT_MMD, "-o", OUT_SVG, "--width", "3200", "--backgroundColor", "#0f172a"],
      stderr: "piped",
    }).output();
    if (result.success) {
      console.log(`✓ ${OUT_SVG}`);
    } else {
      console.log(`  mmdc: ${new TextDecoder().decode(result.stderr).trim()}`);
    }
  } catch {
    console.log("  mmdc not in PATH — paste research/page-tree.mmd into mermaid.live");
  }

  // ── Summary ─────────────────────────────────────────────────────────────────

  console.log("\nZones scanned:");
  for (const [zone, files] of zoneFiles) {
    console.log(`  [${zone.name}]  ${files.length} entry files`);
    for (const f of files) {
      const g = fileGraphs.get(f);
      console.log(`    ${basename(f)}  (${g ? [...g.keys()].length : 0} imports traced)`);
    }
  }
  if (sharedFiles.length > 0) {
    console.log(`\nShared across zones (◆): ${sharedFiles.length}`);
    for (const f of sharedFiles) {
      const zones = [...(fileZoneCount.get(f)?.values() ?? [])].join(", ");
      console.log(`  ${relative(ROOT, f).replace(/\\/g, "/")}  ← ${zones}`);
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// HTML GENERATOR
// ─────────────────────────────────────────────────────────────────────────────

interface HtmlMeta {
  diagram:     string;
  generated:   string;
  depth:       number;
  zones:       Array<{ name: string; files: string[] }>;
  sharedFiles: Array<{ path: string; zones: string[] }>;
}

function buildHtml(m: HtmlMeta): string {
  const statsJson = JSON.stringify({
    zones:       m.zones,
    sharedFiles: m.sharedFiles,
    generated:   m.generated,
    depth:       m.depth,
  });

  // escape for embedding inside a <div>
  const diagram = m.diagram
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>page-tree</title>
<script src="https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/svg-pan-zoom@3.6.1/dist/svg-pan-zoom.min.js"></script>
<style>
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  :root {
    --bg:       #080d1a;
    --surface:  #0f172a;
    --raised:   #1a2236;
    --border:   #1e293b;
    --border2:  #2d3f5a;
    --text:     #e2e8f0;
    --muted:    #64748b;
    --dim:      #334155;
    --accent:   #6366f1;
    --accent2:  #818cf8;
    --green:    #22c55e;
    --yellow:   #eab308;
    --mono:     ui-monospace, "Cascadia Code", "Fira Code", monospace;
  }

  html, body { height: 100%; overflow: hidden; background: var(--bg); color: var(--text); font-family: var(--mono); font-size: 12px; }

  /* ── Layout ── */
  #app { display: flex; height: 100vh; }

  /* ── Sidebar ── */
  #sidebar {
    width: 240px; min-width: 200px; max-width: 300px;
    display: flex; flex-direction: column;
    background: var(--surface);
    border-right: 1px solid var(--border);
    overflow: hidden; flex-shrink: 0;
    resize: horizontal;
  }

  #sidebar-header {
    padding: 14px 14px 10px;
    border-bottom: 1px solid var(--border);
    flex-shrink: 0;
  }
  #sidebar-header h1 { font-size: 11px; font-weight: 700; letter-spacing: .12em; text-transform: uppercase; color: var(--text); }
  #sidebar-header p  { font-size: 10px; color: var(--muted); margin-top: 3px; }

  #search-wrap { padding: 10px 12px; border-bottom: 1px solid var(--border); flex-shrink: 0; }
  #search {
    width: 100%; background: var(--raised); border: 1px solid var(--border2);
    border-radius: 4px; padding: 5px 8px; color: var(--text); font-family: var(--mono);
    font-size: 11px; outline: none; transition: border-color .15s;
  }
  #search::placeholder { color: var(--muted); }
  #search:focus { border-color: var(--accent); }

  #sidebar-body { flex: 1; overflow-y: auto; padding: 8px 0; }
  #sidebar-body::-webkit-scrollbar { width: 4px; }
  #sidebar-body::-webkit-scrollbar-track { background: transparent; }
  #sidebar-body::-webkit-scrollbar-thumb { background: var(--border2); border-radius: 2px; }

  .section-label {
    font-size: 9px; font-weight: 700; letter-spacing: .14em;
    text-transform: uppercase; color: var(--muted);
    padding: 8px 14px 4px;
  }

  .zone-row {
    display: flex; align-items: center; gap: 7px;
    padding: 5px 14px; cursor: pointer;
    transition: background .1s; border-radius: 3px; margin: 0 4px;
  }
  .zone-row:hover { background: var(--raised); }
  .zone-row.active { background: var(--raised); }
  .zone-dot { width: 6px; height: 6px; border-radius: 50%; flex-shrink: 0; }
  .zone-name { flex: 1; font-size: 11px; color: var(--text); truncate: ellipsis; }
  .zone-count { font-size: 10px; color: var(--muted); flex-shrink: 0; }

  .shared-row {
    display: flex; align-items: flex-start; gap: 6px;
    padding: 4px 14px; cursor: pointer;
    transition: background .1s; border-radius: 3px; margin: 0 4px;
  }
  .shared-row:hover { background: var(--raised); }
  .shared-diamond { color: var(--accent2); flex-shrink: 0; font-size: 10px; line-height: 1.5; }
  .shared-info { min-width: 0; }
  .shared-name { font-size: 11px; color: var(--text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .shared-zones { font-size: 9px; color: var(--muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

  /* ── Main ── */
  #main { flex: 1; display: flex; flex-direction: column; overflow: hidden; min-width: 0; }

  #toolbar {
    display: flex; align-items: center; gap: 8px;
    padding: 7px 12px; border-bottom: 1px solid var(--border);
    background: var(--surface); flex-shrink: 0;
  }
  .tb-label { font-size: 10px; color: var(--muted); letter-spacing: .08em; }
  .tb-btn {
    font-size: 10px; font-family: var(--mono); color: var(--muted);
    background: var(--raised); border: 1px solid var(--border2);
    border-radius: 3px; padding: 3px 8px; cursor: pointer; transition: all .15s;
  }
  .tb-btn:hover { color: var(--text); border-color: var(--accent); }
  #match-count { font-size: 10px; color: var(--accent2); margin-left: auto; }

  #legend {
    display: flex; align-items: center; gap: 14px;
    margin-left: auto; font-size: 10px; color: var(--muted);
  }
  .legend-item { display: flex; align-items: center; gap: 5px; }
  .legend-dot { width: 8px; height: 8px; border-radius: 2px; flex-shrink: 0; }

  /* ── Diagram ── */
  #diagram-wrap { flex: 1; overflow: hidden; position: relative; }
  #diagram-inner { width: 100%; height: 100%; }

  .mermaid { width: 100%; height: 100%; }
  .mermaid svg { width: 100% !important; height: 100% !important; }

  /* ── Highlight / dim ── */
  .node.dimmed > rect,
  .node.dimmed > circle,
  .node.dimmed > ellipse,
  .node.dimmed > polygon { opacity: .12 !important; }
  .node.dimmed .nodeLabel,
  .node.dimmed text { opacity: .12 !important; }
  .edgePath.dimmed { opacity: .05 !important; }

  /* ── Toast ── */
  #toast {
    position: fixed; bottom: 18px; right: 18px;
    background: var(--raised); border: 1px solid var(--border2);
    border-radius: 6px; padding: 8px 14px; font-size: 11px; color: var(--text);
    opacity: 0; transition: opacity .25s; pointer-events: none; z-index: 99;
  }
  #toast.show { opacity: 1; }
</style>
</head>
<body>
<div id="app">

  <!-- ── Sidebar ── -->
  <aside id="sidebar">
    <div id="sidebar-header">
      <h1>page-tree</h1>
      <p id="meta-line">depth ${m.depth} &nbsp;·&nbsp; ${new Date(m.generated).toLocaleString()}</p>
    </div>
    <div id="search-wrap">
      <input id="search" type="text" placeholder="search nodes…" autocomplete="off" spellcheck="false">
    </div>
    <div id="sidebar-body">
      <div class="section-label">Zones</div>
      <div id="zones-list"></div>
      <div class="section-label" style="margin-top:10px">Shared <span id="shared-count" style="color:var(--accent2)"></span></div>
      <div id="shared-list"></div>
    </div>
  </aside>

  <!-- ── Main ── -->
  <div id="main">
    <div id="toolbar">
      <span class="tb-label">scroll to zoom &nbsp;·&nbsp; drag to pan</span>
      <button class="tb-btn" id="btn-reset">reset view</button>
      <button class="tb-btn" id="btn-fit">fit</button>
      <span id="match-count"></span>
      <div id="legend">
        <span class="legend-item"><span class="legend-dot" style="background:#6366f1;border:1px solid #818cf8"></span>shared ◆</span>
        <span class="legend-item"><span class="legend-dot" style="background:#1e293b;border:1px solid #334155"></span>local</span>
      </div>
    </div>
    <div id="diagram-wrap">
      <div id="diagram-inner">
        <div class="mermaid">${diagram}</div>
      </div>
    </div>
  </div>

</div>

<div id="toast"></div>

<script>
const STATS = ${statsJson};

// ── Zone colours (cycle) ──────────────────────────────────────────────────────
const ZONE_COLORS = [
  '#6366f1','#22c55e','#f59e0b','#06b6d4','#ec4899','#8b5cf6','#14b8a6','#f97316'
];

// ── Build sidebar ─────────────────────────────────────────────────────────────
const zonesList   = document.getElementById('zones-list');
const sharedList  = document.getElementById('shared-list');
document.getElementById('shared-count').textContent = \`(\${STATS.sharedFiles.length})\`;

STATS.zones.forEach((z, i) => {
  const color = ZONE_COLORS[i % ZONE_COLORS.length];
  const row = document.createElement('div');
  row.className = 'zone-row';
  row.innerHTML = \`
    <span class="zone-dot" style="background:\${color}"></span>
    <span class="zone-name">\${z.name}</span>
    <span class="zone-count">\${z.files.length}</span>
  \`;
  row.addEventListener('click', () => highlightZone(z.name));
  zonesList.appendChild(row);
});

STATS.sharedFiles.slice(0, 60).forEach(f => {
  const name  = f.path.split('/').pop() ?? f.path;
  const row   = document.createElement('div');
  row.className = 'shared-row';
  row.title = f.path + '\\n' + f.zones.join(', ');
  row.innerHTML = \`
    <span class="shared-diamond">◆</span>
    <div class="shared-info">
      <div class="shared-name">\${name}</div>
      <div class="shared-zones">\${f.zones.join(' · ')}</div>
    </div>
  \`;
  row.addEventListener('click', () => {
    document.getElementById('search').value = name.replace(/\\.tsx?$/, '');
    triggerSearch();
  });
  sharedList.appendChild(row);
});

// ── Mermaid init ──────────────────────────────────────────────────────────────
mermaid.initialize({
  startOnLoad: false,
  theme: 'dark',
  themeVariables: {
    darkMode:            true,
    background:          '#080d1a',
    primaryColor:        '#1e293b',
    primaryTextColor:    '#cbd5e1',
    primaryBorderColor:  '#2d3f5a',
    secondaryColor:      '#0f172a',
    tertiaryColor:       '#080d1a',
    edgeLabelBackground: '#080d1a',
    lineColor:           '#334155',
    fontFamily:          'ui-monospace, monospace',
    fontSize:            '11px',
    clusterBkg:          '#0d1525',
    clusterBorder:       '#1e3a5f',
    titleColor:          '#94a3b8',
  },
  flowchart: { curve: 'basis', padding: 20, nodeSpacing: 40, rankSpacing: 60 },
});

let panZoom = null;

mermaid.run({ querySelector: '.mermaid' }).then(() => {
  const svg = document.querySelector('.mermaid svg');
  if (!svg) return;
  svg.style.maxWidth = 'none';
  svg.style.maxHeight = 'none';

  panZoom = svgPanZoom(svg, {
    zoomEnabled:    true,
    controlIconsEnabled: false,
    fit:            true,
    center:         true,
    minZoom:        0.05,
    maxZoom:        8,
    zoomScaleSensitivity: 0.3,
  });

  document.getElementById('btn-reset').addEventListener('click', () => {
    panZoom.resetZoom(); panZoom.resetPan();
  });
  document.getElementById('btn-fit').addEventListener('click', () => {
    panZoom.fit(); panZoom.center();
  });

  // click node → highlight
  svg.querySelectorAll('.node').forEach(node => {
    node.style.cursor = 'pointer';
    node.addEventListener('click', () => {
      const label = node.querySelector('text, .nodeLabel')?.textContent?.trim() ?? '';
      document.getElementById('search').value = label.replace(' ◆', '');
      triggerSearch();
    });
  });
}).catch(console.error);

// ── Search / highlight ────────────────────────────────────────────────────────
let searchTimer = null;

document.getElementById('search').addEventListener('input', () => {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(triggerSearch, 150);
});

function triggerSearch() {
  const q = document.getElementById('search').value.trim().toLowerCase();
  const svg = document.querySelector('.mermaid svg');
  if (!svg) return;

  const nodes = [...svg.querySelectorAll('.node')];
  const edges = [...svg.querySelectorAll('.edgePath')];

  if (!q) {
    nodes.forEach(n => n.classList.remove('dimmed'));
    edges.forEach(e => e.classList.remove('dimmed'));
    document.getElementById('match-count').textContent = '';
    return;
  }

  const matched = new Set();
  nodes.forEach(n => {
    const label = (n.querySelector('text, .nodeLabel')?.textContent ?? '').toLowerCase();
    if (label.includes(q)) matched.add(n);
  });

  nodes.forEach(n => {
    if (matched.has(n)) n.classList.remove('dimmed');
    else n.classList.add('dimmed');
  });
  edges.forEach(e => e.classList.add('dimmed'));

  const count = matched.size;
  document.getElementById('match-count').textContent = count
    ? \`\${count} match\${count === 1 ? '' : 'es'}\`
    : 'no matches';
}

// ── Zone highlight ────────────────────────────────────────────────────────────
function highlightZone(zoneName) {
  const svg = document.querySelector('.mermaid svg');
  if (!svg) return;
  // subgraph label contains the zone name
  const clusters = [...svg.querySelectorAll('.cluster')];
  const match = clusters.find(c =>
    (c.querySelector('.cluster-label text, title')?.textContent ?? '').includes(zoneName.split('/').pop())
  );
  if (match) {
    match.scrollIntoView({ behavior: 'smooth', block: 'center' });
    match.style.outline = '2px solid #6366f1';
    setTimeout(() => { match.style.outline = ''; }, 1500);
  }
  toast(\`zone: \${zoneName}\`);
}

// ── Toast ─────────────────────────────────────────────────────────────────────
let toastTimer = null;
function toast(msg) {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 1800);
}

// ── Keyboard ─────────────────────────────────────────────────────────────────
document.addEventListener('keydown', e => {
  if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
    e.preventDefault();
    document.getElementById('search').focus();
    document.getElementById('search').select();
  }
  if (e.key === 'Escape') {
    document.getElementById('search').value = '';
    triggerSearch();
  }
});
</script>
</body>
</html>`;
}

function renderEdges(
  file: string,
  fileGraphs: Map<string, Graph>,
  fileZoneCount: Map<string, Set<string>>,
  renderedEdges: Set<string>,
  lines: string[],
  indent: string,
): void {
  const graph = fileGraphs.get(file);
  if (!graph) return;
  for (const [from, tos] of graph) {
    for (const to of tos) {
      const key = `${nodeId(from)}-->${nodeId(to)}`;
      if (renderedEdges.has(key)) continue;
      renderedEdges.add(key);
      const shared  = (fileZoneCount.get(to)?.size ?? 0) > 1;
      const toLabel = shared ? `${nodeLabel(to)} ◆` : nodeLabel(to);
      lines.push(`${indent}${nodeId(from)}["${nodeLabel(from)}"] --> ${nodeId(to)}["${toLabel}"]`);
    }
  }
}

await main();
