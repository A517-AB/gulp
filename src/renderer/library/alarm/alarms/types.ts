export type WeekDay = 0 | 1 | 2 | 3 | 4 | 5 | 6

export interface AlarmEntry {
  id: string
  label: string
  time: string
  days: WeekDay[]
  enabled: boolean
  createdAt: string
  updatedAt?: string
  snoozeUntil?: string
  lastTriggeredAt?: string
}

export interface AlarmFiredEvent {
  alarm: AlarmEntry
  firedAt: Date
  scheduledFor: Date
  reason: 'scheduled' | 'catch-up' | 'snooze'
}

export interface AlarmClockBackup {
  version: 1
  savedAt: string
  lastCheckedAt?: string
  alarms: AlarmEntry[]
}

export interface AlarmClockState {
  now: Date
  nextAlarm: AlarmEntry | null
  backup: AlarmClockBackup
}