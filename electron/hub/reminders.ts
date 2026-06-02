import { ipcMain, app } from 'electron'
import type { WebContents } from 'electron'
import fs from 'fs-extra'
import * as path from 'path'
import type { ReminderEntry, ReminderFrequency, HubNotification } from '../../src/shared/hub'
import { dispatchNotification } from './notifications'

const REMINDERS_PATH = path.join(app.getPath('userData'), 'reminders.json')

async function read(): Promise<ReminderEntry[]> {
  try {
    const exists = await fs.pathExists(REMINDERS_PATH)
    if (!exists) return []
    const raw: unknown = await fs.readJson(REMINDERS_PATH)
    return Array.isArray(raw) ? (raw as ReminderEntry[]) : []
  } catch { return [] }
}

async function write(reminders: ReminderEntry[]): Promise<void> {
  await fs.outputJson(REMINDERS_PATH, reminders, { spaces: 2 })
}

function daysBetween(a: string, b: Date): number {
  const msPerDay = 86_400_000
  return Math.floor((b.getTime() - new Date(a).getTime()) / msPerDay)
}

function shouldFire(reminder: ReminderEntry, now: Date): boolean {
  if (!reminder.enabled) return false
  if (reminder.doneAt) return false
  if (reminder.hour !== now.getHours() || reminder.minute !== now.getMinutes()) return false

  const today = now.toISOString().slice(0, 10)
  if (reminder.lastFiredDate === today) return false

  const freq: ReminderFrequency = reminder.frequency
  const day = now.getDay()

  switch (freq.type) {
    case 'once':
      return today === freq.date
    case 'daily':
      return true
    case 'weekdays':
      return day >= 1 && day <= 5
    case 'weekly':
      return day === freq.dayOfWeek
    case 'monthly':
      return now.getDate() === freq.dayOfMonth
    case 'interval': {
      if (!reminder.lastFiredDate) return true
      return daysBetween(reminder.lastFiredDate, now) >= freq.days
    }
    default: return false
  }
}

export function registerRemindersHandlers(getWebContents: () => WebContents | null): void {
  console.log('[reminders] registering, path:', REMINDERS_PATH)

  ipcMain.handle('reminders.list', (): Promise<ReminderEntry[]> => read())

  ipcMain.handle('reminders.save', async (_e, reminder: ReminderEntry): Promise<boolean> => {
    try {
      const all = await read()
      const idx = all.findIndex((r) => r.id === reminder.id)
      if (idx >= 0) all[idx] = reminder
      else all.push(reminder)
      await write(all)
      getWebContents()?.send('reminders.changed')
      return true
    } catch { return false }
  })

  ipcMain.handle('reminders.delete', async (_e, id: string): Promise<boolean> => {
    try {
      await write((await read()).filter((r) => r.id !== id))
      getWebContents()?.send('reminders.changed')
      return true
    } catch { return false }
  })

  ipcMain.handle('reminders.toggle', async (_e, id: string, enabled: boolean): Promise<boolean> => {
    try {
      const all = await read()
      const r = all.find((r) => r.id === id)
      if (!r) return false
      r.enabled = enabled
      await write(all)
      getWebContents()?.send('reminders.changed')
      return true
    } catch { return false }
  })

  ipcMain.handle('reminders.done', async (_e, id: string): Promise<boolean> => {
    try {
      const all = await read()
      const r = all.find((r) => r.id === id)
      if (!r) return false
      r.doneAt = new Date().toISOString()
      if (r.frequency.type !== 'once') {
        // recurring: just record the date, keep enabled so it fires next time
        r.lastFiredDate = new Date().toISOString().slice(0, 10)
        delete r.doneAt
      }
      await write(all)
      getWebContents()?.send('reminders.changed')
      return true
    } catch { return false }
  })

  setInterval(() => { void (async () => {
    const now = new Date()
    const all = await read()
    let dirty = false

    for (const reminder of all) {
      if (!shouldFire(reminder, now)) continue
      reminder.lastFiredDate = now.toISOString().slice(0, 10)
      if (reminder.frequency.type === 'once') {
        reminder.enabled = false
        reminder.doneAt = now.toISOString()
      }
      dirty = true

      const notification: HubNotification = {
        id:        crypto.randomUUID(),
        channel:   'reminder',
        title:     reminder.text,
        sound:     reminder.sound,
        actions:   ['done', 'dismiss'],
        meta:      { reminderId: reminder.id },
        timestamp: now.toISOString(),
      }
      dispatchNotification(notification, getWebContents())
    }

    if (dirty) {
      await write(all)
      getWebContents()?.send('reminders.changed')
    }
  })() }, 10_000)
}
