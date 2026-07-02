import {Cron} from 'croner'
import {app, ipcMain} from 'electron'
import * as fs from 'node:fs'
import * as path from 'node:path'
import {dispatchNotification} from './dispatch.js'

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
  id:           string
  label:        string
  body?:        string
  schedule:     ScheduleInput
  enabled:      boolean
  sound?:       string
  category?:    string
    actions?: { id: string; label: string; style?: 'primary' | 'ghost' }[]
    leadTimeMin?: number
  createdAt:    string
  lastFiredAt?: string
    color?: string
    icon?: string
    completed?: boolean
    completedAt?: string
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

function toLeadTrigger(s: ScheduleInput, leadMin: number): string | Date | null {
    if (s.kind === 'alarm') {
        const {h, m} = parseTime(s.time)
        let newM = m - leadMin
        let newH = h
        let days = s.days
        while (newM < 0) {
            newM += 60
            newH -= 1
        }
        if (newH < 0) {
            newH += 24
            if (days.length > 0) {
                days = days.map(d => ((d - 1 + 7) % 7) as WeekDay)
            }
        }
        const daysStr = days.length > 0 ? days.join(',') : '*'
        return `${newM} ${newH} * * ${daysStr}`
    }
    if (s.kind === 'once') {
        const d = new Date(s.at)
        const leadDate = new Date(d.getTime() - leadMin * 60_000)
        return leadDate > new Date() ? leadDate : null
    }
    if (s.kind === 'daily') {
        const {h, m} = parseTime(s.time)
        let newM = m - leadMin
        let newH = h
        while (newM < 0) {
            newM += 60
            newH = (newH - 1 + 24) % 24
        }
        return `${newM} ${newH} * * *`
    }
    if (s.kind === 'weekly') {
        const {h, m} = parseTime(s.time)
        let newM = m - leadMin
        let newH = h
        let newDay = s.dayOfWeek
        while (newM < 0) {
            newM += 60
            newH -= 1
        }
        while (newH < 0) {
            newH += 24
            newDay = ((newDay - 1 + 7) % 7) as WeekDay
        }
        return `${newM} ${newH} * * ${newDay}`
    }
    if (s.kind === 'monthly') {
        const {h, m} = parseTime(s.time)
        let newM = m - leadMin
        let newH = h
        let day = s.dayOfMonth
        while (newM < 0) {
            newM += 60
            newH -= 1
        }
        while (newH < 0) {
            newH += 24
            day -= 1
        }
        if (day < 1) day = 1
        return `${newM} ${newH} ${day} * *`
    }
    return null
}

// ── Scheduler ─────────────────────────────────────────────────────────────────

const jobs = new Map<string, Cron>()

function fireItem(item: ScheduledItem, id: string, label: string): void {
    dispatchNotification({
        title: label,
        body: item.body,
        sound: item.sound,
        id,
        source: 'scheduler',
        actions: item.actions,
        extraData: {itemId: id},
        color: item.color,
        icon: item.icon
    })
}

function startJob(item: ScheduledItem): void {
    stopJob(item.id)

    const trigger = toTrigger(item.schedule)
    if (trigger) {
        const job = new Cron(trigger, {protect: true, catch: true}, () => {
            item.lastFiredAt = new Date().toISOString()
            persistUpdate(item)

            fireItem(item, item.id, item.label)

            if (item.schedule.kind === 'once') {
                stopJob(item.id)
                removeItem(item.id)
            }
        })
        jobs.set(item.id, job)
    }

    if (item.leadTimeMin && item.leadTimeMin > 0) {
        const leadTrigger = toLeadTrigger(item.schedule, item.leadTimeMin)
        if (leadTrigger) {
            const leadJob = new Cron(leadTrigger, {protect: true, catch: true}, () => {
                fireItem(item, `${item.id}_lead`, `${item.label} (in ${item.leadTimeMin}m)`)
            })
            jobs.set(`${item.id}_lead`, leadJob)
        }
    }
}

export interface UpcomingRun {
    id: string
    label: string
    nextRun: string | null
}

function getUpcoming(): UpcomingRun[] {
    const items = load()
    const upcoming: UpcomingRun[] = []
    for (const [id, job] of jobs) {
        const isLead = id.endsWith('_lead')
        const baseId = isLead ? id.slice(0, -5) : id
        const item = items.find(i => i.id === baseId)
        if (!item) continue
        const next = job.nextRun()
        upcoming.push({
            id,
            label: isLead ? `${item.label} (lead)` : item.label,
            nextRun: next ? next.toISOString() : null
        })
    }
    return upcoming.sort((a, b) => {
        if (!a.nextRun) return 1
        if (!b.nextRun) return -1
        return a.nextRun.localeCompare(b.nextRun)
    })
}

function stopJob(id: string): void {
  jobs.get(id)?.stop()
  jobs.delete(id)
    jobs.get(`${id}_lead`)?.stop()
    jobs.delete(`${id}_lead`)
}

function persistUpdate(updated: ScheduledItem): void {
  const items = load().map(i => i.id === updated.id ? updated : i)
  save(items)
}

function removeItem(id: string): void {
  save(load().filter(i => i.id !== id))
}

// ── Registration ──────────────────────────────────────────────────────────────

export function registerSchedulerHandlers(): void {
  for (const item of load()) {
      if (item.enabled) startJob(item)
  }

  ipcMain.handle('notif.scheduler.list', () => load())

    ipcMain.handle('notif.scheduler.upcoming', () => getUpcoming())

  ipcMain.handle('notif.scheduler.add', (_, item: ScheduledItem) => {
      stopJob(item.id)
    const items = load().filter(i => i.id !== item.id)
    items.push(item)
    save(items)
      if (item.enabled) startJob(item)
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
      if (enabled) startJob(item)
    else stopJob(id)
    return item
  })

    ipcMain.handle('notif.scheduler.markDone', (_, id: string) => {
        const items = load()
        const item = items.find(i => i.id === id)
        if (!item) return
        item.completed = !item.completed
        if (item.completed) item.completedAt = new Date().toISOString()
        else delete item.completedAt
        save(items)
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
      startJob(snoozeItem)
    return snoozeItem
  })
}
