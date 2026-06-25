import {ipcMain, utilityProcess} from 'electron'
import * as path from 'node:path'
import {fileURLToPath} from 'node:url'
import {dispatchNotification} from './notifications/dispatch.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const subscribers = new Set<Electron.WebContents>()
let worker: Electron.UtilityProcess | null = null

type WorkerEvent =
    | { type: 'ready' }
    | { type: 'session.new'; sessionId: string; state: string }
    | { type: 'session.stateChanged'; sessionId: string; state: string; prevState: string }
    | { type: 'error'; message: string }

function notifyJulesEvent(event: WorkerEvent): void {
    if (event.type !== 'session.stateChanged') return
    const state = event.state.toLowerCase().replace(/_/g, '')
    const id = event.sessionId.replace(/^sessions\//, '')
    if (state === 'completed') {
        dispatchNotification({
            title: 'Session completed',
            body: id,
            type: 'success',
            source: 'jules',
            extraData: {sessionId: event.sessionId}
        })
    } else if (state === 'failed') {
        dispatchNotification({
            title: 'Session failed',
            body: id,
            type: 'error',
            source: 'jules',
            extraData: {sessionId: event.sessionId}
        })
    } else if (state === 'waitingforuserinput') {
        dispatchNotification({
            title: 'Waiting for approval',
            body: 'A session needs your input to continue',
            type: 'info',
            source: 'jules',
            extraData: {sessionId: event.sessionId}
        })
    }
}

function broadcast(event: unknown) {
    notifyJulesEvent(event as WorkerEvent)
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
    worker = utilityProcess.fork(workerPath, [], {stdio: 'inherit'})

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
        wc.once('destroyed', () => {
            subscribers.delete(wc)
        })
    })

    ipcMain.on('jules:unsubscribe', (event) => {
        subscribers.delete(event.sender)
    })
}
