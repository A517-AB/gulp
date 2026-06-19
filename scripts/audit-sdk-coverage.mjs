#!/usr/bin/env node
/**
 * audit-sdk-coverage.mjs
 * Run: node scripts/audit-sdk-coverage.mjs
 *
 * Writes: reports/audit-sdk-coverage.json
 * Prints: one-line summary to terminal
 */

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { resolve } from 'node:path'

const ROOT = resolve(import.meta.dirname, '..')

const handlersPath = [
    'electron/ipc/handlers.ts',
    'electron/ipc/handlers.ts.unused',
].map(p => resolve(ROOT, p)).find(p => { try { readFileSync(p); return true } catch { return false } })
if (!handlersPath) { console.error('handlers.ts not found'); process.exit(1) }

const sdkDocPath   = resolve(ROOT, 'src/jules/jules-sdk-api with overvewi.md')
const handlersFile = readFileSync(handlersPath, 'utf-8')
const sdkDoc       = readFileSync(sdkDocPath, 'utf-8')

// ── SDK public methods from reference doc ─────────────────────────────────────

const INTERNAL_CLASSES = new Set([
    'ActivityStorage', 'SessionStorage',
    'NodeFileStorage', 'NodeSessionStorage',
    'MemoryStorage', 'MemorySessionStorage',
    'NodePlatform', 'Platform', 'NetworkAdapter', 'NetworkClient',
    'ApiClient', 'PlatformResponse',
    'JulesError', 'JulesApiError', 'JulesAuthenticationError',
    'JulesNetworkError', 'JulesRateLimitError', 'MissingApiKeyError',
    'AutomatedSessionFailedError', 'InvalidStateError',
    'SourceNotFoundError', 'SyncInProgressError', 'TimeoutError',
    'SessionSnapshotImpl', 'SessionCursor',
    'BashArtifact', 'MediaArtifact', 'ChangeSetArtifact',
    'GeneratedFiles', 'SessionOutcome', 'DefaultActivityClient',
])

const sdkMethods = new Set()
let currentClass = ''

for (const line of sdkDoc.split('\n')) {
    const classMatch = /📄 \*\*(\w+)\*\*/.exec(line)
    if (classMatch) { currentClass = classMatch[1] ?? ''; continue }
    const methodMatch = /⚙️ `(\w+)\(/.exec(line)
    if (methodMatch && currentClass && !INTERNAL_CLASSES.has(currentClass) && methodMatch[1] !== 'constructor') {
        sdkMethods.add(`${currentClass}.${methodMatch[1]}`)
    }
}

// ── SDK calls inside handlers.ts ──────────────────────────────────────────────

const calledInHandlers = new Map()

for (const line of handlersFile.split('\n')) {
    const trim = line.trim()
    if (!trim.includes('jules')) continue

    const patterns = [
        [/jules\.session\([^)]+\)\.activities\.(\w+)\(/, 'DefaultActivityClient'],
        [/jules\.session\([^)]+\)\.(?!activities\.)(\w+)\(/, 'SessionClientImpl'],
        [/jules\.sessions\(/, 'JulesClientImpl', 'sessions'],
        [/jules\.sync\(/, 'JulesClientImpl', 'sync'],
        [/jules\.run\(/, 'JulesClientImpl', 'run'],
        [/jules\.sources\.get\(/, 'SourceManager', 'get'],
        [/jules\.select\(/, 'JulesClientImpl', 'select'],
        [/jules\.all\(/, 'JulesClientImpl', 'all'],
        [/jules\.with\(/, 'JulesClientImpl', 'with'],
    ]

    for (const [regex, cls, fixedMethod] of patterns) {
        const m = regex.exec(trim)
        if (m) {
            const method = fixedMethod ?? m[1]
            const key = `${cls}.${method}`
            if (!calledInHandlers.has(key)) calledInHandlers.set(key, trim.slice(0, 100))
        }
    }
}

// ── diff ──────────────────────────────────────────────────────────────────────

const ghost = [...calledInHandlers.keys()].filter(k => !sdkMethods.has(k)).sort()
const gaps  = [...sdkMethods].filter(k => !calledInHandlers.has(k)).sort()
const ok    = ghost.length === 0

// ── write JSON report ─────────────────────────────────────────────────────────

const report = {
    generatedAt: new Date().toISOString(),
    counts: {
        sdkPublicMethods: sdkMethods.size,
        handlerSdkCalls: calledInHandlers.size,
        ghostCalls: ghost.length,
        unexposedMethods: gaps.length,
    },
    ghost: ghost.map(k => ({ key: k, line: calledInHandlers.get(k) ?? '' })),
    unexposed: gaps,
}

mkdirSync(resolve(ROOT, 'reports'), { recursive: true })
const outPath = resolve(ROOT, 'reports/audit-sdk-coverage.json')
writeFileSync(outPath, JSON.stringify(report, null, 2))

// ── terminal summary ──────────────────────────────────────────────────────────

if (ok) {
    console.log(`✓  sdk coverage clean — ${calledInHandlers.size} calls, all valid. ${gaps.length} methods unexposed. → reports/audit-sdk-coverage.json`)
} else {
    console.log(`✗  ${ghost.length} ghost call(s) in handlers (will break at runtime) — see reports/audit-sdk-coverage.json`)
}
