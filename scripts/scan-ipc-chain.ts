#!/usr/bin/env deno run --allow-read
/**
 * Audits the Electron IPC chain across three layers:
 *   handlers.ts  → ipcMain.handle registrations
 *   bridge.ts    → invoke() calls (preload SDK bridge)
 *   preload.mts  → ipcRenderer channels exposed to renderer
 *
 * Diffs them to find dead handlers, missing handlers, and mismatches.
 */

const ROOT      = "D:/LAST"
const HANDLERS  = `${ROOT}/electron/ipc/handlers.ts`
const BRIDGE    = `${ROOT}/electron/ipc/bridge.ts`
const PRELOAD   = `${ROOT}/electron/preload.mts`
const ELECTRON  = `${ROOT}/electron`

// ── regex ─────────────────────────────────────────────────────────────────────

const RE_HANDLE  = /ipcMain\.handle\(\s*['"]([^'"]+)['"]/g
const RE_INVOKE  = /\binvoke\(\s*['"]([^'"]+)['"]/g
const RE_PRELOAD = /ipcRenderer\.(invoke|send|on|once)\(\s*['"]([^'"]+)['"]/g

// ── helpers ───────────────────────────────────────────────────────────────────

function extractAll(text: string, re: RegExp, group = 1): string[] {
  const results: string[] = []
  for (const m of text.matchAll(re)) {
    const val = m[group]
    if (val) results.push(val)
  }
  return results
}

function extractPreload(text: string): Map<string, Set<string>> {
  const map = new Map<string, Set<string>>()
  for (const m of text.matchAll(RE_PRELOAD)) {
    const method = m[1]!
    const channel = m[2]!
    if (!map.has(channel)) map.set(channel, new Set())
    map.get(channel)!.add(method)
  }
  return map
}

async function walk(dir: string): Promise<string[]> {
  const files: string[] = []
  for await (const e of Deno.readDir(dir)) {
    const full = `${dir}/${e.name}`
    if (e.isDirectory) files.push(...await walk(full))
    else if (/\.(ts|mts)$/.test(e.name)) files.push(full)
  }
  return files
}

function namespace(channel: string): string {
  const parts = channel.split(".")
  return parts[0] ?? channel
}

function isStreaming(channel: string): boolean {
  return /\.(stream|history|updates)\.start$/.test(channel)
}

function pad(s: string, n: number): string {
  return s.padEnd(n)
}

// ── load files ────────────────────────────────────────────────────────────────

const [handlersText, bridgeText, preloadText] = await Promise.all([
  Deno.readTextFile(HANDLERS),
  Deno.readTextFile(BRIDGE),
  Deno.readTextFile(PRELOAD),
])

// handlers registered in handlers.ts
const sdkHandlers = new Set(extractAll(handlersText, RE_HANDLE))

// invoke calls in bridge.ts
const bridgeInvokes = new Set(extractAll(bridgeText, RE_INVOKE))

// preload channels
const preloadChannels = extractPreload(preloadText)

// all ipcMain.handle across ALL electron files (to catch non-SDK handlers)
const allElectronFiles = await walk(ELECTRON)
const nonSdkHandlers: Map<string, string> = new Map()

for (const file of allElectronFiles) {
  if (file.endsWith("handlers.ts")) continue // already have these
  const text = await Deno.readTextFile(file)
  const channels = extractAll(text, RE_HANDLE)
  for (const ch of channels) {
    nonSdkHandlers.set(ch, file.replace(ROOT + "/", ""))
  }
}

// ── analysis ──────────────────────────────────────────────────────────────────

const allSdkChannels = new Set([...sdkHandlers, ...bridgeInvokes])
const matched      = [...allSdkChannels].filter(c => sdkHandlers.has(c) && bridgeInvokes.has(c)).sort()
const handlerOnly  = [...sdkHandlers].filter(c => !bridgeInvokes.has(c)).sort()
const bridgeOnly   = [...bridgeInvokes].filter(c => !sdkHandlers.has(c)).sort()

// group matched by namespace
const byNs = new Map<string, string[]>()
for (const ch of matched) {
  const ns = namespace(ch)
  if (!byNs.has(ns)) byNs.set(ns, [])
  byNs.get(ns)!.push(ch)
}

// ── output ────────────────────────────────────────────────────────────────────

const W = 70
console.log("═".repeat(W))
console.log("  IPC CHAIN AUDIT")
console.log("═".repeat(W))
console.log(`\n  handlers.ts   → ${sdkHandlers.size} sdk: channels`)
console.log(`  bridge.ts     → ${bridgeInvokes.size} invoke calls`)
console.log(`  preload.mts   → ${preloadChannels.size} channels exposed`)

// ── matched ───────────────────────────────────────────────────────────────────

console.log("\n" + "─".repeat(W))
console.log("  MATCHED (handler ↔ bridge)")
console.log("─".repeat(W))

for (const [ns, channels] of [...byNs.entries()].sort()) {
  console.log(`\n  [${ns}]`)
  for (const ch of channels) {
    const tag = isStreaming(ch) ? " ~stream" : ""
    console.log(`    ✓ ${ch}${tag}`)
  }
}

// ── handler only (dead in SDK layer) ─────────────────────────────────────────

console.log("\n" + "─".repeat(W))
console.log("  HANDLER WITH NO BRIDGE CALL  (registered but unreachable via sdk.*)")
console.log("─".repeat(W))

if (handlerOnly.length === 0) {
  console.log("\n  ✓ None — all handlers have a bridge call")
} else {
  for (const ch of handlerOnly) {
    console.log(`\n  ✗ ${ch}`)
  }
}

// ── bridge only (missing handler) ────────────────────────────────────────────

console.log("\n" + "─".repeat(W))
console.log("  BRIDGE CALL WITH NO HANDLER  (will throw at runtime)")
console.log("─".repeat(W))

if (bridgeOnly.length === 0) {
  console.log("\n  ✓ None — all bridge calls have a handler")
} else {
  for (const ch of bridgeOnly) {
    console.log(`\n  ✗ ${ch}`)
  }
}

// ── preload coverage ──────────────────────────────────────────────────────────

console.log("\n" + "─".repeat(W))
console.log("  PRELOAD CHANNELS (ipcRenderer.*)")
console.log("─".repeat(W))

const sdkInPreload: string[] = []
const otherInPreload: string[] = []

for (const [ch] of preloadChannels) {
  if (ch.startsWith("sdk:")) sdkInPreload.push(ch)
  else otherInPreload.push(ch)
}

console.log(`\n  sdk: channels in preload: ${sdkInPreload.length} (routed via bridge.ts)`)
console.log(`  other channels in preload: ${otherInPreload.length}`)

if (otherInPreload.length) {
  console.log("")
  for (const ch of otherInPreload.sort()) {
    const methods = [...(preloadChannels.get(ch) ?? [])].join("/")
    console.log(`    ${pad(ch, 40)} [${methods}]`)
  }
}

// ── non-sdk handlers ──────────────────────────────────────────────────────────

console.log("\n" + "─".repeat(W))
console.log("  NON-SDK HANDLERS  (other electron/ files)")
console.log("─".repeat(W))

if (nonSdkHandlers.size === 0) {
  console.log("\n  (none found)")
} else {
  const byFile = new Map<string, string[]>()
  for (const [ch, file] of nonSdkHandlers) {
    if (!byFile.has(file)) byFile.set(file, [])
    byFile.get(file)!.push(ch)
  }
  for (const [file, channels] of [...byFile.entries()].sort()) {
    console.log(`\n  ${file}`)
    for (const ch of channels.sort()) {
      console.log(`    • ${ch}`)
    }
  }
}

console.log("\n" + "═".repeat(W) + "\n")
