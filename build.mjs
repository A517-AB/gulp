import { execSync }                         from 'node:child_process'
import { existsSync, readdirSync, statSync } from 'node:fs'
import { join }                              from 'node:path'

// ── config ────────────────────────────────────────────────────────────────────

const DIST        = 'dist/assets'
const MAX_AGE_MS  = 10 * 24 * 60 * 60 * 1000   // 10 days

const VENDORS = {
  monaco:    'vendor-monaco',
  ej2:       'vendor-ej2',
  blocknote: 'vendor-blocknote',
  react:     'vendor-react',
}

// ── ansi ──────────────────────────────────────────────────────────────────────

const c = {
  reset:  '\x1b[0m',
  dim:    '\x1b[2m',
  bold:   '\x1b[1m',
  green:  '\x1b[32m',
  yellow: '\x1b[33m',
  red:    '\x1b[31m',
  cyan:   '\x1b[36m',
  gray:   '\x1b[90m',
}

const fmt = {
  ok:   (s) => `${c.green}✓${c.reset} ${s}`,
  skip: (s) => `${c.gray}–${c.reset} ${c.dim}${s}${c.reset}`,
  warn: (s) => `${c.yellow}○${c.reset} ${s}`,
  info: (s) => `${c.cyan}  ${s}${c.reset}`,
  dim:  (s) => `${c.dim}${s}${c.reset}`,
}

function hr() { console.log(c.dim + '─'.repeat(48) + c.reset) }
function log(s = '') { console.log('  ' + s) }

// ── helpers ───────────────────────────────────────────────────────────────────

function findChunk(prefix) {
  if (!existsSync(DIST)) return null
  const match = readdirSync(DIST).find(f => f.startsWith(prefix) && f.endsWith('.js'))
  return match ? join(DIST, match) : null
}

function ageMs(file) {
  return file ? Date.now() - statSync(file).mtimeMs : Infinity
}

function ageDays(ms) {
  return (ms / (24 * 60 * 60 * 1000)).toFixed(1)
}

function mb(file) {
  if (!file) return '?'
  return (statSync(file).size / 1024 / 1024).toFixed(2) + ' mb'
}

function run(cmd, env = {}) {
  execSync(cmd, {
    stdio:  'inherit',
    env:    { ...process.env, ...env },
  })
}

// ── main ──────────────────────────────────────────────────────────────────────

const t0 = Date.now()

console.log()
hr()
log(`${c.bold}build${c.reset}   ${c.dim}${new Date().toLocaleTimeString()}${c.reset}`)
hr()
console.log()

// check vendor chunks
const vendorResults = {}
let allFresh = true

for (const [name, prefix] of Object.entries(VENDORS)) {
  const file  = findChunk(prefix)
  const age   = ageMs(file)
  const stale = age > MAX_AGE_MS
  vendorResults[name] = { file, age, stale }
  if (stale) allFresh = false
}

log('vendor chunks')
console.log()
for (const [name, { file, age, stale }] of Object.entries(vendorResults)) {
  const label = name.padEnd(12)
  if (!file) {
    log(fmt.warn(`${label} ${c.dim}not found${c.reset}`))
  } else if (stale) {
    log(fmt.warn(`${label} ${c.yellow}${ageDays(age)}d old${c.reset}  ${c.dim}${mb(file)}${c.reset}  rebuilding`))
  } else {
    log(fmt.ok(`${label} ${c.dim}${ageDays(age)}d old  ${mb(file)}  kept${c.reset}`))
  }
}

console.log()
hr()
console.log()

// typecheck
log(fmt.info('tsc -b'))
console.log()
run('tsc -b')
console.log()

// vite build — preserve existing vendor chunks if all fresh
const viteEnv = allFresh ? { VITE_KEEP_VENDORS: 'true' } : {}
if (allFresh) {
  log(fmt.info('vite build  (vendors preserved)'))
} else {
  log(fmt.info('vite build  (full)'))
}
console.log()
run('vite build', viteEnv)

// done
console.log()
hr()
const elapsed = ((Date.now() - t0) / 1000).toFixed(1)
log(`${c.green}done${c.reset}  ${c.dim}${elapsed}s${c.reset}`)
hr()
console.log()
