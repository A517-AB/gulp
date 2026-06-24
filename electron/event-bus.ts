import * as fs from 'node:fs'
import * as path from 'node:path'
import {app, ipcMain} from 'electron'
import type {WebContents} from 'electron'
import {loadRules} from './notif-rules.js'
import {dispatchNotification} from './notifications/dispatch.js'
import type {EventBusEntry} from '@shared/electron'

const MAX = 500

function logPath(): string {
    return path.join(app.getPath('userData'), 'event-log.json')
}

function load(): EventBusEntry[] {
    try {
        return JSON.parse(fs.readFileSync(logPath(), 'utf8')) as EventBusEntry[]
    } catch {
        return []
    }
}

function save(entries: EventBusEntry[]): void {
    fs.writeFileSync(logPath(), JSON.stringify(entries, null, 2), 'utf8')
}

const subscribers = new Set<WebContents>()

export function emit(eventId: string, data: Record<string, unknown> = {}): void {
    const entry: EventBusEntry = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        eventId,
        data,
        ts: new Date().toISOString(),
    }

    const log = load()
    save([entry, ...log].slice(0, MAX))

    for (const wc of [...subscribers]) {
        if (wc.isDestroyed()) {
            subscribers.delete(wc);
            continue
        }
        wc.send('eventBus.event', entry)
    }

    const rules = loadRules()
    for (const rule of rules) {
        if (!rule.enabled || rule.eventId !== eventId) continue
        dispatchNotification({
            title: rule.notif.title,
            body: rule.notif.body,
            type: rule.notif.type,
            sound: rule.notif.sound,
            duration: rule.notif.duration,
            source: `event:${eventId}`,
            actions: rule.notif.actions,
        })
        break
    }
}

export function registerEventBusHandlers(): void {
    ipcMain.handle('eventBus.getLog', () => load())
    ipcMain.handle('eventBus.clearLog', () => {
        save([])
    })

    ipcMain.on('eventBus.subscribe', (event) => {
        const wc = event.sender
        subscribers.add(wc)
        wc.once('destroyed', () => {
            subscribers.delete(wc)
        })
    })

    ipcMain.on('eventBus.unsubscribe', (event) => {
        subscribers.delete(event.sender)
    })
}
