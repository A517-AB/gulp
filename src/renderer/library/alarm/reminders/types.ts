export type WeekDay = 0 | 1 | 2 | 3 | 4 | 5 | 6

export type ReminderSchedule =
  | { type: 'once'; at: string }
  | { type: 'daily'; time: string }
  | { type: 'weekly'; time: string; dayOfWeek: WeekDay }
  | { type: 'monthly'; time: string; dayOfMonth: number }
  | { type: 'interval'; anchorAt: string; everyMinutes: number }

export interface ReminderEntry {
  id: string
  title: string
  note?: string
  schedule: ReminderSchedule
  enabled: boolean
  createdAt: string
  updatedAt?: string
  snoozeUntil?: string
  lastTriggeredAt?: string
}

export interface ReminderFiredEvent {
  reminder: ReminderEntry
  firedAt: Date
  scheduledFor: Date
  reason: 'scheduled' | 'catch-up' | 'snooze'
}

export interface ReminderBackup {
  version: 1
  savedAt: string
  lastCheckedAt?: string
  reminders: ReminderEntry[]
}

export interface ReminderClockState {
  now: Date
  nextReminder: ReminderEntry | null
  backup: ReminderBackup
}