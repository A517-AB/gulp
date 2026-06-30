import {execSync} from 'node:child_process'
import {existsSync, readdirSync, statSync} from 'node:fs'
import {join} from 'node:path'

if (process.platform === 'win32') {
    try {
        execSync('chcp 65001', {stdio: 'ignore'})
    } catch { /* non-fatal */
    }
}

// ── ansi ──────────────────────────────────────────────────────────────────────

const c = {
    reset: '\x1b[0m',
    dim: '\x1b[2m',
    bold: '\x1b[1m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    cyan: '\x1b[36m',
}

function hr() {
    console.log(c.dim + '─'.repeat(48) + c.reset)
}

function log(s = '') {
    console.log('  ' + s)
}

// ── helpers ───────────────────────────────────────────────────────────────────

function newestMtime(dir) {
    if (!existsSync(dir)) return 0
    let newest = 0
    for (const entry of readdirSync(dir, {withFileTypes: true})) {
        const full = join(dir, entry.name)
        if (entry.isDirectory()) newest = Math.max(newest, newestMtime(full))
        else newest = Math.max(newest, statSync(full).mtimeMs)
    }
    return newest
}

function run(cmd, env = {}) {
    execSync(cmd, {stdio: 'inherit', env: {...process.env, ...env}})
}

// ── main ──────────────────────────────────────────────────────────────────────

console.log()
hr()
log(`${c.bold}dev${c.reset}   ${c.dim}${new Date().toLocaleTimeString()}${c.reset}`)
hr()
console.log()

// jules freshness check
const julesStale = newestMtime('electron/ipc/Jules') > newestMtime('dist-jules')

if (julesStale) {
    log(`${c.yellow}○${c.reset} jules stale — rebuilding`)
    console.log()
    const t = Date.now()
    run('tsc -p tsconfig.jules.json')
    console.log()
    log(`${c.green}✓${c.reset} jules ready  ${c.dim}${((Date.now() - t) / 1000).toFixed(1)}s${c.reset}`)
} else {
    log(`${c.green}✓${c.reset} jules ${c.dim}up to date${c.reset}`)
}

console.log()
hr()
console.log()

// hand off to vite
run('vite')
