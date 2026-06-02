import { ipcMain, app } from 'electron'
import type { WebContents } from 'electron'
import fs from 'fs-extra'
import * as path from 'path'
import type { AlarmEntry, HubNotification } from '../../src/shared/hub'
import { dispatchNotification } from './notifications'

const ALARMS_PATH = path.join(app.getPath('userData'), 'alarms.json')

async function read(): Promise<AlarmEntry[]> {
  try {
    const exists = await fs.pathExists(ALARMS_PATH)
    if (!exists) return []
    const raw: unknown = await fs.readJson(ALARMS_PATH)
    return Array.isArray(raw) ? (raw as AlarmEntry[]) : []
  } catch { return [] }
}

async function write(alarms: AlarmEntry[]): Promise<void> {
  await fs.outputJson(ALARMS_PATH, alarms, { spaces: 2 })
}

function shouldFire(alarm: AlarmEntry, now: Date): boolean {
  if (!alarm.enabled) return false
  if (alarm.hour !== now.getHours() || alarm.minute !== now.getMinutes()) return false
  const today = now.toISOString().slice(0, 10)
  if (alarm.lastFiredDate === today) return false
  const day = now.getDay()
  switch (alarm.repeat) {
    case 'none':     return true
    case 'daily':    return true
    case 'weekdays': return day >= 1 && day <= 5
    case 'weekly':   return day === alarm.dayOfWeek
    default:         return false
  }
}

export function registerAlarmsHandlers(getWebContents: () => WebContents | null): void {
  console.log('[alarms] registering, path:', ALARMS_PATH)

  ipcMain.handle('alarms.list', (): Promise<AlarmEntry[]> => read())

  ipcMain.handle('alarms.save', async (_e, alarm: AlarmEntry): Promise<boolean> => {
    try {
      const alarms = await read()
      const idx = alarms.findIndex((a) => a.id === alarm.id)
      if (idx >= 0) alarms[idx] = alarm
      else alarms.push(alarm)
      await write(alarms)
      getWebContents()?.send('alarms.changed')
      return true
    } catch { return false }
  })

  ipcMain.handle('alarms.delete', async (_e, id: string): Promise<boolean> => {
    try {
      await write((await read()).filter((a) => a.id !== id))
      getWebContents()?.send('alarms.changed')
      return true
    } catch { return false }
  })

  ipcMain.handle('alarms.toggle', async (_e, id: string, enabled: boolean): Promise<boolean> => {
    try {
      const alarms = await read()
      const alarm = alarms.find((a) => a.id === id)
      if (!alarm) return false
      alarm.enabled = enabled
      if (enabled) delete alarm.lastFiredDate
      await write(alarms)
      getWebContents()?.send('alarms.changed')
      return true
    } catch { return false }
  })

  ipcMain.handle('alarms.snooze', async (_e, id: string, minutes: number): Promise<boolean> => {
    try {
      const alarms = await read()
      const src = alarms.find((a) => a.id === id)
      if (!src) return false
      const fire = new Date(Date.now() + minutes * 60_000)
      const snooze: AlarmEntry = {
        id:            crypto.randomUUID(),
        label:         `${src.label} (snoozed)`,
        hour:          fire.getHours(),
        minute:        fire.getMinutes(),
        repeat:        'none',
        dayOfWeek:     src.dayOfWeek,
        enabled:       true,
        sound:         src.sound,
        snoozeMinutes: src.snoozeMinutes,
        createdAt:     new Date().toISOString(),
      }
      alarms.push(snooze)
      await write(alarms)
      getWebContents()?.send('alarms.changed')
      return true
    } catch { return false }
  })

  setInterval(() => { void (async () => {
    const now = new Date()
    const alarms = await read()
    let dirty = false

    for (const alarm of alarms) {
      if (!shouldFire(alarm, now)) continue
      alarm.lastFiredDate = now.toISOString().slice(0, 10)
      if (alarm.repeat === 'none') alarm.enabled = false
      dirty = true

      const notification: HubNotification = {
        id:        crypto.randomUUID(),
        channel:   'alarm',
        title:     alarm.label || 'Alarm',
        body:      `${String(alarm.hour).padStart(2, '0')}:${String(alarm.minute).padStart(2, '0')}`,
        sound:     alarm.sound,
        actions:   ['dismiss', 'snooze'],
        meta:      { alarmId: alarm.id, snoozeMinutes: String(alarm.snoozeMinutes) },
        timestamp: now.toISOString(),
      }
      dispatchNotification(notification, getWebContents())
    }

    if (dirty) {
      await write(alarms)
      getWebContents()?.send('alarms.changed')
    }
  })() }, 10_000)
}
