#!/usr/bin/env deno run --allow-read
/**
 * Scans src/renderer for direct sdkIpc and isElectron usage.
 * Goal: everything should go through localJules or bridge exports — not raw sdkIpc.
 */

const ROOT = "D:/LAST/src/renderer"
const TARGETS = ["sdkIpc", "isElectron"]

interface Hit {
  line: number
  text: string
  kind: "import" | "guard" | "call" | "other"
  targets: string[]
}

interface FileReport {
  file: string
  hits: Hit[]
}

async function walk(path: string): Promise<string[]> {
  const files: string[] = []
  for await (const e of Deno.readDir(path)) {
    const full = `${path}/${e.name}`
    if (e.isDirectory) files.push(...await walk(full))
    else if (/\.(ts|tsx)$/.test(e.name)) files.push(full)
  }
  return files
}

function classify(line: string): Hit["kind"] {
  const t = line.trimStart()
  if (t.startsWith("import")) return "import"
  if (/if\s*\(!?(sdkIpc|isElectron)/.test(t)) return "guard"
  if (/sdkIpc\.(session|client|activities|sources|artifact|util|query)/.test(t)) return "call"
  return "other"
}

async function scanFile(path: string): Promise<FileReport | null> {
  const text = await Deno.readTextFile(path)
  const lines = text.split("\n")
  const hits: Hit[] = []

  lines.forEach((raw, i) => {
    const matched = TARGETS.filter(t => raw.includes(t))
    if (!matched.length) return
    hits.push({
      line: i + 1,
      text: raw.trim(),
      kind: classify(raw),
      targets: matched,
    })
  })

  return hits.length ? { file: path.replace(ROOT + "/", ""), hits } : null
}

const files = await walk(ROOT)
const reports = (await Promise.all(files.map(scanFile))).filter(Boolean) as FileReport[]

// ── summary ───────────────────────────────────────────────────────────────────

const sdkIpcFiles = reports.filter(r => r.hits.some(h => h.targets.includes("sdkIpc")))
const isElectronFiles = reports.filter(r => r.hits.some(h => h.targets.includes("isElectron")))

console.log("═".repeat(70))
console.log("  IPC USAGE SCAN — src/renderer")
console.log("═".repeat(70))
console.log(`\n  sdkIpc  → ${sdkIpcFiles.length} file(s)`)
console.log(`  isElectron → ${isElectronFiles.length} file(s)`)

// ── sdkIpc detail ─────────────────────────────────────────────────────────────

console.log("\n" + "─".repeat(70))
console.log("  sdkIpc DIRECT USAGE  (should go through localJules)")
console.log("─".repeat(70))

for (const r of sdkIpcFiles) {
  const relevant = r.hits.filter(h => h.targets.includes("sdkIpc"))
  const imports = relevant.filter(h => h.kind === "import")
  const calls   = relevant.filter(h => h.kind === "call")
  const guards  = relevant.filter(h => h.kind === "guard")
  const other   = relevant.filter(h => h.kind === "other")

  console.log(`\n  ${r.file}`)
  if (imports.length) console.log(`    IMPORTS: ${imports.map(h => h.text).join(" | ")}`)
  if (guards.length)  guards.forEach(h  => console.log(`    GUARD  L${h.line}: ${h.text}`))
  if (calls.length)   calls.forEach(h   => console.log(`    CALL   L${h.line}: ${h.text}`))
  if (other.length)   other.forEach(h   => console.log(`    OTHER  L${h.line}: ${h.text}`))
}

// ── isElectron detail ─────────────────────────────────────────────────────────

console.log("\n" + "─".repeat(70))
console.log("  isElectron USAGE  (contained = good)")
console.log("─".repeat(70))

for (const r of isElectronFiles) {
  const relevant = r.hits.filter(h => h.targets.includes("isElectron"))
  console.log(`\n  ${r.file}`)
  relevant.forEach(h => console.log(`    ${h.kind.toUpperCase().padEnd(6)} L${h.line}: ${h.text}`))
}

// ── violations ────────────────────────────────────────────────────────────────

console.log("\n" + "─".repeat(70))
console.log("  VIOLATIONS  (sdkIpc outside of lib/jules/local.ts)")
console.log("─".repeat(70))

const violations = sdkIpcFiles.filter(r => r.file !== "lib/jules/local.ts")
if (violations.length === 0) {
  console.log("\n  ✓ Clean — all sdkIpc access goes through local.ts")
} else {
  violations.forEach(r => {
    const calls = r.hits.filter(h => h.targets.includes("sdkIpc") && h.kind !== "import")
    console.log(`\n  ✗ ${r.file} — ${calls.length} direct reference(s)`)
    calls.forEach(h => console.log(`      L${h.line}: ${h.text}`))
  })
}

console.log("\n" + "═".repeat(70) + "\n")
