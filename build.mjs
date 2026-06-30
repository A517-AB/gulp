import {execSync} from 'node:child_process'
import {existsSync, readdirSync, statSync} from 'node:fs'
import {join} from 'node:path'

if (process.platform === 'win32') {
    try {
        execSync('chcp 65001', {stdio: 'ignore'})
    } catch { /* non-fatal */
    }
}

// ── config ────────────────────────────────────────────────────────────────────

const DIST = 'dist/assets'
const MAX_AGE_MS = 10 * 24 * 60 * 60 * 1000   // 10 days

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
    err: (s) => `${c.red}✗${c.reset} ${s}`,
}

function hr() {
    console.log(c.dim + '─'.repeat(48) + c.reset)
}
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
    return file ? (statSync(file).size / 1024 / 1024).toFixed(2) + ' mb' : '?'
}

function newestMtime(dir) {
    if (!existsSync(dir)) return 0
    let newest = 0
    for (const entry of readdirSync(dir, {withFileTypes: true})) {
        const full = join(dir, entry.name)
        if (entry.isDirectory()) {
            newest = Math.max(newest, newestMtime(full))
        } else {
            newest = Math.max(newest, statSync(full).mtimeMs)
        }
    }
    return newest
}

function run(cmd, env = {}) {
    const t = Date.now()
    execSync(cmd, {stdio: 'inherit', env: {...process.env, ...env}})
    return Date.now() - t
}

function step(label, fn) {
    log(fmt.info(label))
    console.log()
    const ms = fn()
    console.log()
    log(fmt.ok(`${label}  ${c.dim}${(ms / 1000).toFixed(1)}s${c.reset}`))
    console.log()
}

// ── main ──────────────────────────────────────────────────────────────────────

const t0 = Date.now()

console.log()
hr()
log(`${c.bold}build${c.reset}   ${c.dim}${new Date().toLocaleTimeString()}${c.reset}`)
hr()
console.log()

// ── vendor chunks ─────────────────────────────────────────────────────────────

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
    if (!file) log(fmt.warn(`${label} ${c.dim}not found${c.reset}`))
    else if (stale) log(fmt.warn(`${label} ${c.yellow}${ageDays(age)}d old${c.reset}  ${c.dim}${mb(file)}${c.reset}  rebuilding`))
    else log(fmt.ok(`${label} ${c.dim}${ageDays(age)}d old  ${mb(file)}  kept${c.reset}`))
}

console.log()
hr()
console.log()

// ── jules ─────────────────────────────────────────────────────────────────────

const julesSrcMtime = newestMtime('electron/ipc/Jules')
const julesDistMtime = newestMtime('dist-jules')
const julesStale = julesSrcMtime > julesDistMtime

if (julesStale) {
    log(fmt.warn(`jules       source changed — rebuilding`))
    console.log()
    step('tsc jules', () => run('tsc -p tsconfig.jules.json'))
} else {
    log(fmt.ok(`jules       ${c.dim}dist up to date  skipping${c.reset}`))
    console.log()
}

hr()
console.log()

// ── typecheck ─────────────────────────────────────────────────────────────────

step('tsc -b', () => run('tsc -b'))

hr()
console.log()

// ── vite builds ───────────────────────────────────────────────────────────────

const viteEnv = allFresh ? {VITE_KEEP_VENDORS: 'true'} : {}
const viteLabel = allFresh ? 'vite build  (vendors preserved)' : 'vite build  (full)'

step(viteLabel, () => run('vite build', viteEnv))
step('vite build notif', () => run('vite build', {VITE_BUILD_TARGET: 'notif'}))

// ── done ──────────────────────────────────────────────────────────────────────

hr()
const elapsed = ((Date.now() - t0) / 1000).toFixed(1)
log(`${c.green}done${c.reset}  ${c.dim}${elapsed}s${c.reset}`)
hr()
console.log()
