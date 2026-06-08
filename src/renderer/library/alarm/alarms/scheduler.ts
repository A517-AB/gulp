import type { AlarmClockBackup, AlarmClockState, AlarmEntry, AlarmFiredEvent, WeekDay } from './types'

const DEFAULT_INTERVAL_MS = 10_000
const DEFAULT_CATCH_UP_WINDOW_MS = 12 * 60 * 60 * 1000
const BACKUP_VERSION = 1 as const
const DAY_MS = 24 * 60 * 60 * 1000

export type FiredCallback = (event: AlarmFiredEvent) => void
export type BackupCallback = (backup: AlarmClockBackup) => void
export type StateChangeCallback = (state: AlarmClockState) => void

export interface AlarmSchedulerOptions {
  onFired: FiredCallback
  onBackup?: BackupCallback
  onStateChange?: StateChangeCallback
  intervalMs?: number
  catchUpWindowMs?: number
  now?: () => Date
  backup?: AlarmClockBackup
}

interface ParsedTime {
  hours: number
  minutes: number
}

export function parseAlarmTime(value: string): ParsedTime | null {
  const match = /^(?<hours>[01]\d|2[0-3]):(?<minutes>[0-5]\d)$/.exec(value)
  if (!match?.groups) return null

  return {
    hours: Number(match.groups['hours']),
    minutes: Number(match.groups['minutes']),
  }
}

export function normalizeAlarmEntry(alarm: AlarmEntry): AlarmEntry {
  const parsedTime = parseAlarmTime(alarm.time)
  if (parsedTime === null) {
    throw new Error(`Invalid alarm time: ${alarm.time}`)
  }

  const daySet = new Set<WeekDay>()
  for (const day of alarm.days) {
    if (!Number.isInteger(day) || day < 0 || day > 6) {
      throw new Error(`Invalid alarm day: ${String(day)}`)
    }

    daySet.add(day)
  }

  return {
    ...alarm,
    label: alarm.label.trim(),
    time: `${String(parsedTime.hours).padStart(2, '0')}:${String(parsedTime.minutes).padStart(2, '0')}`,
    days: [...daySet].sort((left, right) => left - right),
  }
}

export function createAlarmClockBackup(
  alarms: readonly AlarmEntry[],
  lastCheckedAt?: Date | null,
  savedAt: Date = new Date(),
): AlarmClockBackup {
  const backup: AlarmClockBackup = {
    version: BACKUP_VERSION,
    savedAt: savedAt.toISOString(),
    alarms: alarms.map((alarm) => ({ ...alarm })),
  }

  if (lastCheckedAt !== null && lastCheckedAt !== undefined) {
    backup.lastCheckedAt = lastCheckedAt.toISOString()
  }

  return backup
}

export function getNextAlarmOccurrence(alarm: AlarmEntry, reference: Date): Date | null {
  if (!alarm.enabled) return null

  const parsedTime = parseAlarmTime(alarm.time)
  if (parsedTime === null) return null

  const snoozeUntil = parseOptionalDate(alarm.snoozeUntil)
  let bestMatch: Date | null = null

  for (let dayOffset = 0; dayOffset <= 7; dayOffset += 1) {
    const candidateDay = startOfDay(addDays(reference, dayOffset))
    const candidate = withTime(candidateDay, parsedTime)

    if (candidate < reference) continue
    if (alarm.days.length > 0 && !alarm.days.includes(candidate.getDay() as WeekDay)) continue
    if (snoozeUntil !== null && candidate < snoozeUntil) continue

    bestMatch = candidate
    break
  }

  if (bestMatch !== null) return bestMatch
  if (snoozeUntil !== null && snoozeUntil >= reference) return floorToMinute(snoozeUntil)
  return null
}

export class AlarmScheduler {
  private readonly onFired: FiredCallback
  private readonly onBackup: BackupCallback | undefined
  private readonly onStateChange: StateChangeCallback | undefined
  private readonly intervalMs: number
  private readonly catchUpWindowMs: number
  private readonly now: () => Date
  private alarms: AlarmEntry[] = []
  private intervalId: ReturnType<typeof setInterval> | null = null
  private lastCheckedAt: Date | null = null

  constructor(options: AlarmSchedulerOptions) {
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

  setAlarms(alarms: readonly AlarmEntry[]): void {
    const previousState = new Map(this.alarms.map((alarm) => [alarm.id, alarm]))
    this.alarms = alarms.map((alarm) => {
      const normalized = normalizeAlarmEntry(alarm)
      const prior = previousState.get(normalized.id)
      const merged: AlarmEntry = {
        ...normalized,
      }

      const normalizedLastTriggeredAt = 'lastTriggeredAt' in normalized ? normalized.lastTriggeredAt : undefined
      const priorLastTriggeredAt = prior !== undefined && 'lastTriggeredAt' in prior ? prior.lastTriggeredAt : undefined
      const lastTriggeredAt = normalizedLastTriggeredAt ?? priorLastTriggeredAt
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

  tick(referenceNow: Date = this.now()): AlarmClockState {
    const now = new Date(referenceNow)
    const lastCheckedAt = this.getEffectiveLastCheckedAt(now)
    const events: AlarmFiredEvent[] = []

    for (const alarm of this.alarms) {
      const dueEvent = this.getDueEvent(alarm, lastCheckedAt, now)
      if (dueEvent === null) continue

      this.applyTriggeredState(dueEvent.alarm.id, toDate(dueEvent.scheduledFor))
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

  getState(referenceNow: Date = this.now()): AlarmClockState {
    return {
      now: new Date(referenceNow),
      nextAlarm: this.getNextAlarm(referenceNow),
      backup: this.getBackup(referenceNow),
    }
  }

  getNextAlarm(referenceNow: Date = this.now()): AlarmEntry | null {
    let nextAlarm: AlarmEntry | null = null
    let nextAt: Date | null = null

    for (const alarm of this.alarms) {
      const candidate = getNextAlarmOccurrence(alarm, referenceNow)
      if (candidate === null) continue
      if (nextAt !== null && candidate >= nextAt) continue

      nextAt = candidate
      nextAlarm = alarm
    }

    return nextAlarm
  }

  getBackup(savedAt: Date = this.now()): AlarmClockBackup {
    const backup: AlarmClockBackup = {
      version: BACKUP_VERSION,
      savedAt: savedAt.toISOString(),
      alarms: this.alarms.map((alarm) => ({ ...alarm })),
    }

    if (this.lastCheckedAt !== null) {
      backup.lastCheckedAt = this.lastCheckedAt.toISOString()
    }

    return backup
  }

  private restoreFromBackup(backup: AlarmClockBackup): void {
    this.alarms = backup.alarms.map((alarm) => normalizeAlarmEntry(alarm))
    this.lastCheckedAt = parseOptionalDate(backup.lastCheckedAt)
  }

  private getEffectiveLastCheckedAt(now: Date): Date {
    if (this.lastCheckedAt === null) {
      return new Date(now.getTime() - this.intervalMs)
    }

    const earliestAllowed = new Date(now.getTime() - this.catchUpWindowMs)
    return this.lastCheckedAt < earliestAllowed ? earliestAllowed : this.lastCheckedAt
  }

  private getDueEvent(alarm: AlarmEntry, fromExclusive: Date, toInclusive: Date): AlarmFiredEvent | null {
    if (!alarm.enabled) return null

    const snoozeUntil = parseOptionalDate(alarm.snoozeUntil)
    if (snoozeUntil !== null) {
      const snoozeMinute = floorToMinute(snoozeUntil)
      if (snoozeMinute > fromExclusive && snoozeMinute <= toInclusive) {
        return {
          alarm,
          firedAt: toInclusive,
          scheduledFor: snoozeMinute,
          reason: snoozeMinute.getTime() === floorToMinute(toInclusive).getTime() ? 'snooze' : 'catch-up',
        }
      }
    }

    const candidateTimes = this.getScheduledCandidates(alarm, fromExclusive, toInclusive)
    if (candidateTimes.length === 0) return null

    const scheduledFor = candidateTimes.at(-1)
    if (scheduledFor === undefined) return null

    return {
      alarm,
      firedAt: toInclusive,
      scheduledFor,
      reason: scheduledFor.getTime() === floorToMinute(toInclusive).getTime() ? 'scheduled' : 'catch-up',
    }
  }

  private getScheduledCandidates(alarm: AlarmEntry, fromExclusive: Date, toInclusive: Date): Date[] {
    const parsedTime = parseAlarmTime(alarm.time)
    if (parsedTime === null) return []

    const lastTriggeredAtValue = 'lastTriggeredAt' in alarm ? alarm.lastTriggeredAt : undefined
    const lastTriggeredAt = parseOptionalDate(lastTriggeredAtValue)
    const candidates: Date[] = []
    const daySpan = Math.max(0, Math.ceil((startOfDay(toInclusive).getTime() - startOfDay(fromExclusive).getTime()) / DAY_MS))

    for (let dayOffset = 0; dayOffset <= daySpan; dayOffset += 1) {
      const day = startOfDay(addDays(fromExclusive, dayOffset))
      const candidate = withTime(day, parsedTime)

      if (candidate <= fromExclusive || candidate > toInclusive) continue
      if (alarm.days.length > 0 && !alarm.days.includes(candidate.getDay() as WeekDay)) continue
      if (lastTriggeredAt !== null && floorToMinute(lastTriggeredAt).getTime() === candidate.getTime()) continue

      const snoozeUntil = parseOptionalDate(alarm.snoozeUntil)
      if (snoozeUntil !== null && candidate < snoozeUntil) continue

      candidates.push(candidate)
    }

    return candidates
  }

  private applyTriggeredState(alarmId: string, scheduledFor: Date): void {
    this.alarms = this.alarms.map((alarm) => {
      if (alarm.id !== alarmId) return alarm

      const updated: AlarmEntry = {
        ...alarm,
        lastTriggeredAt: scheduledFor.toISOString(),
        enabled: alarm.days.length === 0 ? false : alarm.enabled,
        updatedAt: this.now().toISOString(),
      }

      delete updated.snoozeUntil
      return updated
    })
  }

  private emitState(now: Date): AlarmClockState {
    const state: AlarmClockState = {
      now: new Date(now),
      nextAlarm: this.getNextAlarm(now),
      backup: this.getBackup(now),
    }

    this.onStateChange?.(state)
    return state
  }
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
  return new Date(value.getTime() + (days * DAY_MS))
}

function withTime(value: Date, time: ParsedTime): Date {
  const copy = new Date(value)
  copy.setHours(time.hours, time.minutes, 0, 0)
  return copy
}

function toDate(value: unknown): Date {
  if (value instanceof Date) {
    return new Date(value)
  }

  return new Date(String(value))
}