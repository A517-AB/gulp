import { useEffect, useEffectEvent, useRef, useState } from 'react'
import { AlarmScheduler } from './scheduler'
import type { AlarmSchedulerOptions } from './scheduler'
import type { AlarmClockBackup, AlarmClockState, AlarmEntry, AlarmFiredEvent } from './types'

export interface UseAlarmClockOptions {
  alarms: readonly AlarmEntry[]
  onFired: (event: AlarmFiredEvent) => void
  onBackup?: (backup: AlarmClockBackup) => void
  backup?: AlarmClockBackup | null
  intervalMs?: number
  catchUpWindowMs?: number
}

export interface UseAlarmClockResult {
  now: Date
  nextAlarm: AlarmEntry | null
  backup: AlarmClockBackup | null
  tick: () => void
}

export function useAlarmClock({
  alarms,
  onFired,
  onBackup,
  backup,
  intervalMs,
  catchUpWindowMs,
}: UseAlarmClockOptions): UseAlarmClockResult {
  const schedulerRef = useRef<AlarmScheduler | null>(null)
  const [state, setState] = useState<AlarmClockState | null>(null)
  const hasBackupHandler = onBackup !== undefined

  const handleFired = useEffectEvent((event: AlarmFiredEvent) => {
    onFired(event)
  })

  const handleBackup = useEffectEvent((nextBackup: AlarmClockBackup) => {
    onBackup?.(nextBackup)
  })

  const handleStateChange = useEffectEvent((nextState: AlarmClockState) => {
    setState(nextState)
  })

  useEffect(() => {
    const schedulerOptions: AlarmSchedulerOptions = {
      onFired: handleFired,
    }

    if (hasBackupHandler) {
      schedulerOptions.onBackup = handleBackup
    }

    schedulerOptions.onStateChange = handleStateChange

    if (intervalMs !== undefined) {
      schedulerOptions.intervalMs = intervalMs
    }

    if (catchUpWindowMs !== undefined) {
      schedulerOptions.catchUpWindowMs = catchUpWindowMs
    }

    if (backup !== null && backup !== undefined) {
      schedulerOptions.backup = backup
    }

    const scheduler = new AlarmScheduler(schedulerOptions)
    schedulerRef.current = scheduler
    scheduler.start()

    return () => {
      scheduler.stop()
      schedulerRef.current = null
    }
  }, [backup, catchUpWindowMs, hasBackupHandler, intervalMs])

  useEffect(() => {
    schedulerRef.current?.setAlarms(alarms)
  }, [alarms])

  return {
    now: state?.now ?? new Date(),
    nextAlarm: state?.nextAlarm ?? null,
    backup: state?.backup ?? backup ?? null,
    tick: () => {
      schedulerRef.current?.tick()
    },
  }
}