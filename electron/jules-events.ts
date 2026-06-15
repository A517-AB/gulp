import { utilityProcess, ipcMain } from 'electron'
import * as path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const subscribers = new Set<Electron.WebContents>()
let worker: Electron.UtilityProcess | null = null

function broadcast(event: unknown) {
    for (const wc of [...subscribers]) {
        if (wc.isDestroyed()) {
            subscribers.delete(wc)
        } else {
            wc.send('jules:event', event)
        }
    }
}

export function startJulesWorker() {
    const workerPath = path.join(__dirname, 'jules-worker.mjs')
    worker = utilityProcess.fork(workerPath, [], { stdio: 'inherit' })

    worker.on('message', broadcast)

    worker.on('exit', (code) => {
        console.warn(`[jules-worker] exited with code ${code}`)
        worker = null
    })
}

export function registerJulesEventsHandlers() {
    ipcMain.on('jules:subscribe', (event) => {
        const wc = event.sender
        subscribers.add(wc)
        wc.once('destroyed', () => { subscribers.delete(wc) })
    })

    ipcMain.on('jules:unsubscribe', (event) => {
        subscribers.delete(event.sender)
    })
}
