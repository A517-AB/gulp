import { useEffect, useEffectEvent, useRef, useState } from 'react'
import { ReminderScheduler } from './scheduler'
import type { ReminderSchedulerOptions } from './scheduler'
import type { ReminderBackup, ReminderClockState, ReminderEntry, ReminderFiredEvent } from './types'

export interface UseReminderClockOptions {
  reminders: readonly ReminderEntry[]
  onFired: (event: ReminderFiredEvent) => void
  onBackup?: (backup: ReminderBackup) => void
  backup?: ReminderBackup | null
  intervalMs?: number
  catchUpWindowMs?: number
}

export interface UseReminderClockResult {
  now: Date
  nextReminder: ReminderEntry | null
  backup: ReminderBackup | null
  tick: () => void
}

export function useReminderClock({
  reminders,
  onFired,
  onBackup,
  backup,
  intervalMs,
  catchUpWindowMs,
}: UseReminderClockOptions): UseReminderClockResult {
  const schedulerRef = useRef<ReminderScheduler | null>(null)
  const [state, setState] = useState<ReminderClockState | null>(null)
  const hasBackupHandler = onBackup !== undefined

  const handleFired = useEffectEvent((event: ReminderFiredEvent) => {
    onFired(event)
  })

  const handleBackup = useEffectEvent((nextBackup: ReminderBackup) => {
    onBackup?.(nextBackup)
  })

  const handleStateChange = useEffectEvent((nextState: ReminderClockState) => {
    setState(nextState)
  })

  useEffect(() => {
    const schedulerOptions: ReminderSchedulerOptions = {
      onFired: handleFired,
      onStateChange: handleStateChange,
    }

    if (hasBackupHandler) {
      schedulerOptions.onBackup = handleBackup
    }

    if (intervalMs !== undefined) {
      schedulerOptions.intervalMs = intervalMs
    }

    if (catchUpWindowMs !== undefined) {
      schedulerOptions.catchUpWindowMs = catchUpWindowMs
    }

    if (backup !== null && backup !== undefined) {
      schedulerOptions.backup = backup
    }

    const scheduler = new ReminderScheduler(schedulerOptions)
    schedulerRef.current = scheduler
    scheduler.start()

    return () => {
      scheduler.stop()
      schedulerRef.current = null
    }
  }, [backup, catchUpWindowMs, hasBackupHandler, intervalMs])

  useEffect(() => {
    schedulerRef.current?.setReminders(reminders)
  }, [reminders])

  return {
    now: state?.now ?? new Date(),
    nextReminder: state?.nextReminder ?? null,
    backup: state?.backup ?? backup ?? null,
    tick: () => {
      schedulerRef.current?.tick()
    },
  }
}