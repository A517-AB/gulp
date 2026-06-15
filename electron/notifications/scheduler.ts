import { Cron } from 'croner'
import { ipcMain, app } from 'electron'
import * as fs from 'node:fs'
import * as path from 'node:path'
import type { WebContents } from 'electron'
import { dispatchNotification } from './dispatch.js'

// ── Types ─────────────────────────────────────────────────────────────────────

type WeekDay = 0 | 1 | 2 | 3 | 4 | 5 | 6

interface AlarmSchedule {
  kind: 'alarm'
  time: string       // "HH:mm"
  days: WeekDay[]    // empty = every day
}

type ReminderSchedule =
  | { kind: 'once';     at: string }
  | { kind: 'daily';    time: string }
  | { kind: 'weekly';   time: string; dayOfWeek: WeekDay }
  | { kind: 'monthly';  time: string; dayOfMonth: number }
  | { kind: 'interval'; everyMinutes: number }
  | { kind: 'windowed'; everyMinutes: number; fromHour: number; toHour: number; days: WeekDay[] }

export type ScheduleInput = AlarmSchedule | ReminderSchedule

export interface ScheduledItem {
  id:          string
  label:       string
  schedule:    ScheduleInput
  enabled:     boolean
  sound?:      string
  createdAt:   string
  lastFiredAt?: string
}

interface Store {
  version: 1
  items:   ScheduledItem[]
}

// ── Storage ───────────────────────────────────────────────────────────────────

function storePath(): string {
  return path.join(app.getPath('userData'), 'schedules.json')
}

function load(): ScheduledItem[] {
  try {
    const raw = fs.readFileSync(storePath(), 'utf8')
    const store = JSON.parse(raw) as Store
    return store.items
  } catch {
    return []
  }
}

function save(items: ScheduledItem[]): void {
  const store: Store = { version: 1, items }
  fs.writeFileSync(storePath(), JSON.stringify(store, null, 2), 'utf8')
}

// ── Cron conversion ───────────────────────────────────────────────────────────

function parseTime(time: string): { h: number; m: number } {
  const [h, m] = time.split(':').map(Number)
  return { h: h ?? 0, m: m ?? 0 }
}

function toTrigger(s: ScheduleInput): string | Date | null {
  if (s.kind === 'alarm') {
    const { h, m } = parseTime(s.time)
    const days = s.days.length > 0 ? s.days.join(',') : '*'
    return `${m} ${h} * * ${days}`
  }
  if (s.kind === 'once') {
    const d = new Date(s.at)
    return d > new Date() ? d : null
  }
  if (s.kind === 'daily') {
    const { h, m } = parseTime(s.time)
    return `${m} ${h} * * *`
  }
  if (s.kind === 'weekly') {
    const { h, m } = parseTime(s.time)
    return `${m} ${h} * * ${s.dayOfWeek}`
  }
  if (s.kind === 'monthly') {
    const { h, m } = parseTime(s.time)
    return `${m} ${h} ${s.dayOfMonth} * *`
  }
  if (s.kind === 'interval') {
    return `*/${s.everyMinutes} * * * *`
  }
  const days = s.days.length > 0 ? s.days.join(',') : '1,2,3,4,5'
  return `*/${s.everyMinutes} ${s.fromHour}-${s.toHour - 1} * * ${days}`
}

// ── Scheduler ─────────────────────────────────────────────────────────────────

const jobs = new Map<string, Cron>()

function startJob(item: ScheduledItem, getWebContents: () => WebContents | null): void {
  stopJob(item.id)

  const trigger = toTrigger(item.schedule)
  if (!trigger) return

  const job = new Cron(trigger, { protect: true, catch: true }, () => {
    item.lastFiredAt = new Date().toISOString()
    persistUpdate(item)

    dispatchNotification({
      title: item.label,
      sound: item.sound,
      id:    item.id,
    })

    getWebContents()?.send('notif.scheduler.fired', item)

    if (item.schedule.kind === 'once') {
      stopJob(item.id)
      removeItem(item.id)
    }
  })

  jobs.set(item.id, job)
}

function stopJob(id: string): void {
  jobs.get(id)?.stop()
  jobs.delete(id)
}

function persistUpdate(updated: ScheduledItem): void {
  const items = load().map(i => i.id === updated.id ? updated : i)
  save(items)
}

function removeItem(id: string): void {
  save(load().filter(i => i.id !== id))
}

// ── Registration ──────────────────────────────────────────────────────────────

export function registerSchedulerHandlers(getWebContents: () => WebContents | null): void {
  for (const item of load()) {
    if (item.enabled) startJob(item, getWebContents)
  }

  ipcMain.handle('notif.scheduler.list', () => load())

  ipcMain.handle('notif.scheduler.add', (_, item: ScheduledItem) => {
    const items = load().filter(i => i.id !== item.id)
    items.push(item)
    save(items)
    if (item.enabled) startJob(item, getWebContents)
    return item
  })

  ipcMain.handle('notif.scheduler.remove', (_, id: string) => {
    stopJob(id)
    removeItem(id)
  })

  ipcMain.handle('notif.scheduler.toggle', (_, id: string, enabled: boolean) => {
    const items = load()
    const item = items.find(i => i.id === id)
    if (!item) return
    item.enabled = enabled
    save(items)
    if (enabled) startJob(item, getWebContents)
    else stopJob(id)
    return item
  })

  ipcMain.handle('notif.scheduler.snooze', (_, id: string, minutes: number) => {
    const item = load().find(i => i.id === id)
    if (!item) return
    const snoozeItem: ScheduledItem = {
      ...item,
      id:       `${id}_snooze_${Date.now()}`,
      schedule: { kind: 'once', at: new Date(Date.now() + minutes * 60_000).toISOString() },
      enabled:  true,
    }
    const items = load()
    items.push(snoozeItem)
    save(items)
    startJob(snoozeItem, getWebContents)
    return snoozeItem
  })
}
