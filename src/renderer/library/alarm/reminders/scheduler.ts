import type {
  ReminderBackup,
  ReminderClockState,
  ReminderEntry,
  ReminderFiredEvent,
  ReminderSchedule,
  WeekDay,
} from './types'

const DEFAULT_INTERVAL_MS = 15_000
const DEFAULT_CATCH_UP_WINDOW_MS = 12 * 60 * 60 * 1000
const BACKUP_VERSION = 1 as const
const MINUTE_MS = 60 * 1000

export type ReminderFiredCallback = (event: ReminderFiredEvent) => void
export type ReminderBackupCallback = (backup: ReminderBackup) => void
export type ReminderStateChangeCallback = (state: ReminderClockState) => void

export interface ReminderSchedulerOptions {
  onFired: ReminderFiredCallback
  onBackup?: ReminderBackupCallback
  onStateChange?: ReminderStateChangeCallback
  intervalMs?: number
  catchUpWindowMs?: number
  now?: () => Date
  backup?: ReminderBackup
}

interface ParsedTime {
  hours: number
  minutes: number
}

export function parseClockTime(value: string): ParsedTime | null {
  const match = /^(?<hours>[01]\d|2[0-3]):(?<minutes>[0-5]\d)$/.exec(value)
  if (!match?.groups) return null

  return {
    hours: Number(match.groups['hours']),
    minutes: Number(match.groups['minutes']),
  }
}

export function normalizeReminderEntry(reminder: ReminderEntry): ReminderEntry {
  const normalized: ReminderEntry = {
    ...reminder,
    title: reminder.title.trim(),
    schedule: normalizeReminderSchedule(reminder.schedule),
  }

  const note = reminder.note?.trim()
  if (note !== undefined) {
    normalized.note = note
  }

  return normalized
}

export function createReminderBackup(
  reminders: readonly ReminderEntry[],
  lastCheckedAt?: Date | null,
  savedAt: Date = new Date(),
): ReminderBackup {
  const backup: ReminderBackup = {
    version: BACKUP_VERSION,
    savedAt: savedAt.toISOString(),
    reminders: reminders.map((reminder) => ({ ...reminder })),
  }

  if (lastCheckedAt !== null && lastCheckedAt !== undefined) {
    backup.lastCheckedAt = lastCheckedAt.toISOString()
  }

  return backup
}

export function getNextReminderOccurrence(reminder: ReminderEntry, reference: Date): Date | null {
  if (!reminder.enabled) return null

  const snoozeUntil = parseOptionalDate(reminder.snoozeUntil)
  if (snoozeUntil !== null && snoozeUntil >= reference) {
    return floorToMinute(snoozeUntil)
  }

  return getScheduleOccurrence(reminder.schedule, reference)
}

export class ReminderScheduler {
  private readonly onFired: ReminderFiredCallback
  private readonly onBackup: ReminderBackupCallback | undefined
  private readonly onStateChange: ReminderStateChangeCallback | undefined
  private readonly intervalMs: number
  private readonly catchUpWindowMs: number
  private readonly now: () => Date
  private reminders: ReminderEntry[] = []
  private intervalId: ReturnType<typeof setInterval> | null = null
  private lastCheckedAt: Date | null = null

  constructor(options: ReminderSchedulerOptions) {
    this.onFired = options.onFired
    this.onBackup = options.onBackup
    this.onStateChange = options.onStateChange
    this.intervalMs = options.intervalMs ?? DEFAULT_INTERVAL_MS
    this.catchUpWindowMs = options.catchUpWindowMs ?? DEFAULT_CATCH_UP_WINDOW_MS
    this.now = options.now ?? (() => new Date())

    if (options.backup !== undefined) {
      this.restoreFromBackup(options.backup)
    }
  }

  setReminders(reminders: readonly ReminderEntry[]): void {
    const previousState = new Map(this.reminders.map((reminder) => [reminder.id, reminder]))
    this.reminders = reminders.map((reminder) => {
      const normalized = normalizeReminderEntry(reminder)
      const prior = previousState.get(normalized.id)
      const merged: ReminderEntry = {
        ...normalized,
      }

      const lastTriggeredAt = normalized.lastTriggeredAt ?? prior?.lastTriggeredAt
      if (lastTriggeredAt !== undefined) {
        merged.lastTriggeredAt = lastTriggeredAt
      }

      const snoozeUntil = normalized.snoozeUntil ?? prior?.snoozeUntil
      if (snoozeUntil !== undefined) {
        merged.snoozeUntil = snoozeUntil
      }

      return merged
    })

    this.emitState(this.now())
  }

  start(): void {
    if (this.intervalId !== null) return

    this.intervalId = setInterval(() => {
      this.tick()
    }, this.intervalMs)

    this.tick()
  }

  stop(): void {
    if (this.intervalId !== null) {
      clearInterval(this.intervalId)
      this.intervalId = null
    }
  }

  tick(referenceNow: Date = this.now()): ReminderClockState {
    const now = new Date(referenceNow)
    const lastCheckedAt = this.getEffectiveLastCheckedAt(now)
    const events: ReminderFiredEvent[] = []

    for (const reminder of this.reminders) {
      const dueEvent = this.getDueEvent(reminder, lastCheckedAt, now)
      if (dueEvent === null) continue

      this.applyTriggeredState(dueEvent.reminder.id, dueEvent.scheduledFor)
      events.push(dueEvent)
      this.onFired(dueEvent)
    }

    this.lastCheckedAt = now
    const state = this.emitState(now)

    if (events.length > 0 || this.onBackup !== undefined) {
      this.onBackup?.(state.backup)
    }

    return state
  }

  getState(referenceNow: Date = this.now()): ReminderClockState {
    return {
      now: new Date(referenceNow),
      nextReminder: this.getNextReminder(referenceNow),
      backup: this.getBackup(referenceNow),
    }
  }

  getNextReminder(referenceNow: Date = this.now()): ReminderEntry | null {
    let nextReminder: ReminderEntry | null = null
    let nextAt: Date | null = null

    for (const reminder of this.reminders) {
      const candidate = getNextReminderOccurrence(reminder, referenceNow)
      if (candidate === null) continue
      if (nextAt !== null && candidate >= nextAt) continue

      nextAt = candidate
      nextReminder = reminder
    }

    return nextReminder
  }

  getBackup(savedAt: Date = this.now()): ReminderBackup {
    return createReminderBackup(this.reminders, this.lastCheckedAt, savedAt)
  }

  private restoreFromBackup(backup: ReminderBackup): void {
    this.reminders = backup.reminders.map((reminder) => normalizeReminderEntry(reminder))
    this.lastCheckedAt = parseOptionalDate(backup.lastCheckedAt)
  }

  private getEffectiveLastCheckedAt(now: Date): Date {
    if (this.lastCheckedAt === null) {
      return new Date(now.getTime() - this.intervalMs)
    }

    const earliestAllowed = new Date(now.getTime() - this.catchUpWindowMs)
    return this.lastCheckedAt < earliestAllowed ? earliestAllowed : this.lastCheckedAt
  }

  private getDueEvent(reminder: ReminderEntry, fromExclusive: Date, toInclusive: Date): ReminderFiredEvent | null {
    if (!reminder.enabled) return null

    const snoozeUntil = parseOptionalDate(reminder.snoozeUntil)
    if (snoozeUntil !== null) {
      const snoozeMinute = floorToMinute(snoozeUntil)
      if (snoozeMinute > fromExclusive && snoozeMinute <= toInclusive) {
        return {
          reminder,
          firedAt: toInclusive,
          scheduledFor: snoozeMinute,
          reason: snoozeMinute.getTime() === floorToMinute(toInclusive).getTime() ? 'snooze' : 'catch-up',
        }
      }
    }

    const afterReference = new Date(Math.max(fromExclusive.getTime(), parseOptionalDate(reminder.lastTriggeredAt)?.getTime() ?? 0) + 1)
    const scheduledFor = getScheduleOccurrence(reminder.schedule, afterReference)
    if (scheduledFor === null || scheduledFor > toInclusive) return null

    return {
      reminder,
      firedAt: toInclusive,
      scheduledFor,
      reason: scheduledFor.getTime() === floorToMinute(toInclusive).getTime() ? 'scheduled' : 'catch-up',
    }
  }

  private applyTriggeredState(reminderId: string, scheduledFor: Date): void {
    this.reminders = this.reminders.map((reminder) => {
      if (reminder.id !== reminderId) return reminder

      const updated: ReminderEntry = {
        ...reminder,
        lastTriggeredAt: scheduledFor.toISOString(),
        updatedAt: this.now().toISOString(),
        enabled: reminder.schedule.type === 'once' ? false : reminder.enabled,
      }

      delete updated.snoozeUntil
      return updated
    })
  }

  private emitState(now: Date): ReminderClockState {
    const state: ReminderClockState = {
      now: new Date(now),
      nextReminder: this.getNextReminder(now),
      backup: this.getBackup(now),
    }

    this.onStateChange?.(state)
    return state
  }
}

function normalizeReminderSchedule(schedule: ReminderSchedule): ReminderSchedule {
  switch (schedule.type) {
    case 'once': {
      const at = parseRequiredDate(schedule.at, 'Invalid one-time reminder timestamp')
      return { type: 'once', at: at.toISOString() }
    }

    case 'daily': {
      return { type: 'daily', time: normalizeClockTime(schedule.time) }
    }

    case 'weekly': {
      assertWeekDay(schedule.dayOfWeek)
      return { type: 'weekly', time: normalizeClockTime(schedule.time), dayOfWeek: schedule.dayOfWeek }
    }

    case 'monthly': {
      if (!Number.isInteger(schedule.dayOfMonth) || schedule.dayOfMonth < 1 || schedule.dayOfMonth > 31) {
        throw new Error(`Invalid reminder day of month: ${String(schedule.dayOfMonth)}`)
      }

      return { type: 'monthly', time: normalizeClockTime(schedule.time), dayOfMonth: schedule.dayOfMonth }
    }

    case 'interval': {
      const anchorAt = parseRequiredDate(schedule.anchorAt, 'Invalid interval anchor timestamp')
      if (!Number.isInteger(schedule.everyMinutes) || schedule.everyMinutes < 1) {
        throw new Error(`Invalid reminder interval: ${String(schedule.everyMinutes)}`)
      }

      return { type: 'interval', anchorAt: anchorAt.toISOString(), everyMinutes: schedule.everyMinutes }
    }

    default:
      return schedule satisfies never
  }
}

function getScheduleOccurrence(schedule: ReminderSchedule, reference: Date): Date | null {
  switch (schedule.type) {
    case 'once': {
      const at = parseOptionalDate(schedule.at)
      if (at === null || at < reference) return null
      return floorToMinute(at)
    }

    case 'daily': {
      return getNextDailyOccurrence(schedule.time, reference)
    }

    case 'weekly': {
      return getNextWeeklyOccurrence(schedule.time, schedule.dayOfWeek, reference)
    }

    case 'monthly': {
      return getNextMonthlyOccurrence(schedule.time, schedule.dayOfMonth, reference)
    }

    case 'interval': {
      return getNextIntervalOccurrence(schedule.anchorAt, schedule.everyMinutes, reference)
    }

    default:
      return schedule satisfies never
  }
}

function getNextDailyOccurrence(time: string, reference: Date): Date | null {
  const parsedTime = parseClockTime(time)
  if (parsedTime === null) return null

  const today = withTime(startOfDay(reference), parsedTime)
  return today >= reference ? today : addDays(today, 1)
}

function getNextWeeklyOccurrence(time: string, dayOfWeek: WeekDay, reference: Date): Date | null {
  const parsedTime = parseClockTime(time)
  if (parsedTime === null) return null

  for (let dayOffset = 0; dayOffset <= 7; dayOffset += 1) {
    const candidateDay = startOfDay(addDays(reference, dayOffset))
    if (candidateDay.getDay() !== dayOfWeek) continue

    const candidate = withTime(candidateDay, parsedTime)
    if (candidate >= reference) {
      return candidate
    }
  }

  return null
}

function getNextMonthlyOccurrence(time: string, dayOfMonth: number, reference: Date): Date | null {
  const parsedTime = parseClockTime(time)
  if (parsedTime === null) return null

  for (let monthOffset = 0; monthOffset <= 12; monthOffset += 1) {
    const base = new Date(reference.getFullYear(), reference.getMonth() + monthOffset, 1)
    if (dayOfMonth > daysInMonth(base.getFullYear(), base.getMonth())) continue

    const candidate = new Date(base.getFullYear(), base.getMonth(), dayOfMonth, parsedTime.hours, parsedTime.minutes, 0, 0)
    if (candidate >= reference) {
      return candidate
    }
  }

  return null
}

function getNextIntervalOccurrence(anchorAt: string, everyMinutes: number, reference: Date): Date | null {
  const anchor = parseOptionalDate(anchorAt)
  if (anchor === null) return null

  if (anchor >= reference) {
    return floorToMinute(anchor)
  }

  const intervalMs = everyMinutes * MINUTE_MS
  const elapsedMs = reference.getTime() - anchor.getTime()
  const steps = Math.ceil(elapsedMs / intervalMs)
  return floorToMinute(new Date(anchor.getTime() + (steps * intervalMs)))
}

function normalizeClockTime(value: string): string {
  const parsedTime = parseClockTime(value)
  if (parsedTime === null) {
    throw new Error(`Invalid reminder time: ${value}`)
  }

  return `${String(parsedTime.hours).padStart(2, '0')}:${String(parsedTime.minutes).padStart(2, '0')}`
}

function assertWeekDay(dayOfWeek: number): asserts dayOfWeek is WeekDay {
  if (!Number.isInteger(dayOfWeek) || dayOfWeek < 0 || dayOfWeek > 6) {
    throw new Error(`Invalid reminder day of week: ${String(dayOfWeek)}`)
  }
}

function parseRequiredDate(value: string, message: string): Date {
  const parsed = parseOptionalDate(value)
  if (parsed === null) {
    throw new Error(message)
  }

  return parsed
}

function parseOptionalDate(value?: string): Date | null {
  if (value === undefined) return null

  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

function floorToMinute(value: Date): Date {
  const copy = new Date(value)
  copy.setSeconds(0, 0)
  return copy
}

function startOfDay(value: Date): Date {
  const copy = new Date(value)
  copy.setHours(0, 0, 0, 0)
  return copy
}

function addDays(value: Date, days: number): Date {
  return new Date(value.getTime() + (days * 24 * 60 * 60 * 1000))
}

function withTime(value: Date, time: ParsedTime): Date {
  const copy = new Date(value)
  copy.setHours(time.hours, time.minutes, 0, 0)
  return copy
}

function daysInMonth(year: number, monthIndex: number): number {
  return new Date(year, monthIndex + 1, 0).getDate()
}