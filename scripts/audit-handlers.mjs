#!/usr/bin/env node
/**
 * audit-handlers.mjs
 * Run: node scripts/audit-handlers.mjs
 *
 * Writes: reports/audit-handlers.json
 * Prints: one-line summary to terminal
 */

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { execSync } from 'node:child_process'
import { resolve } from 'node:path'

const ROOT = resolve(import.meta.dirname, '..')

function grep(pattern, dir, exts = '*.ts,*.tsx') {
    try {
        return execSync(
            `grep -r --include={${exts}} -h "${pattern}" "${dir}"`,
            { encoding: 'utf-8', cwd: ROOT }
        )
    } catch { return '' }
}

// ── registered handlers ───────────────────────────────────────────────────────

const handlersPath = [
    'electron/ipc/handlers.ts',
    'electron/ipc/handlers.ts.unused',
].map(p => resolve(ROOT, p)).find(p => { try { readFileSync(p); return true } catch { return false } })
if (!handlersPath) { console.error('handlers.ts not found'); process.exit(1) }

const handlersFile = readFileSync(handlersPath, 'utf-8')
const registered = new Set(
    [...handlersFile.matchAll(/ipcMain\.handle\(['"]([^'"]+)['"]/g)].map(m => m[1])
)

// ── called from renderer ──────────────────────────────────────────────────────

const rendererSrc = grep('sdkIpc\\.', resolve(ROOT, 'src/renderer'))
const storeSrc    = grep('ipc\\.', resolve(ROOT, 'src/renderer/store'))

const rawCalls = [...rendererSrc.matchAll(/sdkIpc\.(\w+)\.(\w+)/g)]
    .concat([...storeSrc.matchAll(/\bipc\.(\w+)\.(\w+)/g)])

const called = new Set()
for (const [, ns, method] of rawCalls) {
    const base = `sdk:${ns}.${method}`
    if (['stream', 'updates', 'history'].includes(method)) {
        called.add(`${base}.start`)
    } else {
        called.add(base)
    }
}

// ── diff ──────────────────────────────────────────────────────────────────────

const dead    = [...registered].filter(h => !called.has(h)).sort()
const missing = [...called].filter(h => !registered.has(h)).sort()
const ok      = dead.length === 0 && missing.length === 0

// ── write JSON report ─────────────────────────────────────────────────────────

const report = {
    generatedAt: new Date().toISOString(),
    handlersFile: handlersPath.replace(ROOT + '\\', '').replace(ROOT + '/', ''),
    counts: { registered: registered.size, called: called.size, dead: dead.length, missing: missing.length },
    dead,
    missing,
    timingSnippet: [
        'function timed(channel, fn) {',
        '    return async (_event, ...args) => {',
        '        const t = performance.now()',
        '        try { return await fn(...args) }',
        '        finally {',
        '            const ms = (performance.now() - t).toFixed(1)',
        '            if (Number(ms) > 50) console.warn(`[ipc slow] ${channel} ${ms}ms`)',
        '        }',
        '    }',
        '}',
    ].join('\n'),
}

mkdirSync(resolve(ROOT, 'reports'), { recursive: true })
const outPath = resolve(ROOT, 'reports/audit-handlers.json')
writeFileSync(outPath, JSON.stringify(report, null, 2))

// ── terminal summary (one line) ───────────────────────────────────────────────

if (ok) {
    console.log(`✓  handlers clean — ${registered.size} registered, all covered. → reports/audit-handlers.json`)
} else {
    const parts = []
    if (dead.length)    parts.push(`${dead.length} dead`)
    if (missing.length) parts.push(`${missing.length} missing`)
    console.log(`✗  ${parts.join(', ')} — see reports/audit-handlers.json`)
}
