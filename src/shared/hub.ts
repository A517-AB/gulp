// ── Sounds ────────────────────────────────────────────────────────────────────

export type SoundId = 'none' | 'chime' | 'bell' | 'beep' | 'soft' | 'urgent'

// ── Notifications ─────────────────────────────────────────────────────────────

export type NotificationChannel = 'alarm' | 'reminder' | 'session' | 'system'
export type NotificationAction  = 'dismiss' | 'snooze' | 'done' | 'open'

export interface HubNotification {
  id:        string
  channel:   NotificationChannel
  title:     string
  body?:     string
  sound?:    SoundId
  actions?:  NotificationAction[]
  meta?:     Record<string, string>
  timestamp: string
}

// ── Alarms ────────────────────────────────────────────────────────────────────

export type AlarmRepeat = 'none' | 'daily' | 'weekdays' | 'weekly'

export interface AlarmEntry {
  id:             string
  label:          string
  hour:           number
  minute:         number
  repeat:         AlarmRepeat
  dayOfWeek:      number
  enabled:        boolean
  sound:          SoundId
  snoozeMinutes:  number
  createdAt:      string
  lastFiredDate?: string
}

// ── Reminders ─────────────────────────────────────────────────────────────────

export type ReminderFrequency =
  | { type: 'once';     date: string }
  | { type: 'daily' }
  | { type: 'weekdays' }
  | { type: 'weekly';   dayOfWeek: number }
  | { type: 'monthly';  dayOfMonth: number }
  | { type: 'interval'; days: number }

export interface ReminderEntry {
  id:             string
  text:           string
  frequency:      ReminderFrequency
  hour:           number
  minute:         number
  sound:          SoundId
  enabled:        boolean
  createdAt:      string
  lastFiredDate?: string
  doneAt?:        string
}

// ── Timer ─────────────────────────────────────────────────────────────────────

export interface TimerPreset {
  id:     string
  label:  string
  duration: number  // seconds
  sound:  SoundId
  locked: boolean
}
