import {execSync} from 'node:child_process'

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
    magenta: '\x1b[35m',
    blue: '\x1b[34m',
    white: '\x1b[37m',
}

function hr() {
    console.log(c.dim + '─'.repeat(48) + c.reset)
}

function log(s = '') {
    console.log('  ' + s)
}

function run(cmd, env = {}) {
    execSync(cmd, {stdio: 'inherit', env: {...process.env, ...env}})
}

// ── main ──────────────────────────────────────────────────────────────────────

const time = new Date().toLocaleTimeString()

console.log()
hr()
console.log()
log(`${c.bold}${c.magenta}🚀 LAST${c.reset}   ${c.dim}dev server${c.reset}`)
console.log()
log(`${c.dim}started at${c.reset}  🕐 ${c.cyan}${time}${c.reset}`)
log(`${c.dim}platform  ${c.reset}  💻 ${c.white}${process.platform}${c.reset}   🟢 node ${c.yellow}${process.version}${c.reset}`)
console.log()
hr()
console.log()
log(`⚡ handing off to ${c.cyan}vite${c.reset} ${c.dim}…${c.reset}`)
console.log()

// hand off to vite
run('vite')
