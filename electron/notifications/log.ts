import * as fs from 'node:fs'
import * as path from 'node:path'
import {app, ipcMain} from 'electron'

const MAX_ENTRIES = 50

export interface NotifLogEntry {
    id: string
    title: string
    body?: string
    source?: string
    firedAt: string
    seen: boolean
    actions?: { id: string; label: string }[]
}

function logPath(): string {
    return path.join(app.getPath('userData'), 'notif-log.json')
}

function load(): NotifLogEntry[] {
    try {
        return JSON.parse(fs.readFileSync(logPath(), 'utf8')) as NotifLogEntry[]
    } catch {
        return []
    }
}

function save(entries: NotifLogEntry[]): void {
    fs.writeFileSync(logPath(), JSON.stringify(entries, null, 2), 'utf8')
}

export function appendToLog(payload: {
    title: string
    body?: string
    source?: string
    id?: string | number
    actions?: { id: string; label: string }[]
}): void {
    const entries = load()
    const entry: NotifLogEntry = {
        id: String(payload.id ?? `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`),
        title: payload.title,
        firedAt: new Date().toISOString(),
        seen: false,
        ...(payload.body !== undefined && {body: payload.body}),
        ...(payload.source !== undefined && {source: payload.source}),
        ...(payload.actions !== undefined && {actions: payload.actions.map(a => ({id: a.id, label: a.label}))}),
    }
    save([entry, ...entries].slice(0, MAX_ENTRIES))
}

export function registerNotifLogHandlers(): void {
    ipcMain.handle('notif.log.get', () => load())
    ipcMain.handle('notif.log.clear', () => {
        save([])
    })
    ipcMain.handle('notif.log.markSeen', (_, id: string) => {
        const entries = load().map(e => e.id === id ? {...e, seen: true} : e)
        save(entries)
        return entries
    })
    ipcMain.handle('notif.log.markAllSeen', () => {
        const entries = load().map(e => ({...e, seen: true}))
        save(entries)
        return entries
    })
}
