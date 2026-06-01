// ── Settings — single source of truth ────────────────────────────────────────
// All app settings live here. Nothing reads settings from anywhere else.
// To add a setting: add to the type, add a default in DEFAULT_SETTINGS, done.

export interface PowerSettings {
  autoEnterIdleMs:    number | null  // null = disabled
  autoEnterAtTime:    string | null  // "HH:MM" or null
  autoExitOnActivity: boolean
}

export interface FocusTimerSettings {
  enabled:      boolean
  workMinutes:  number
  breakMinutes: number
}

export interface BreakReminderSettings {
  enabled:         boolean
  intervalMinutes: number
}

export interface EyeStrainSettings {
  enabled: boolean  // 20-20-20: look away every 20 min for 20 sec
}

export interface HydrationSettings {
  enabled:         boolean
  intervalMinutes: number
}

export interface EndOfDaySettings {
  enabled: boolean
  time:    string  // "HH:MM"
}

export interface Deadline {
  id:       string
  label:    string
  targetMs: number
}

export interface DeadlineSettings {
  enabled:   boolean
  deadlines: Deadline[]
}

export interface JulesWatchdogSettings {
  enabled:           boolean
  maxSessionMinutes: number
}

export interface AlarmSettings {
  focusTimer:    FocusTimerSettings
  breakReminder: BreakReminderSettings
  eyeStrain:     EyeStrainSettings
  hydration:     HydrationSettings
  endOfDay:      EndOfDaySettings
  deadline:      DeadlineSettings
  julesWatchdog: JulesWatchdogSettings
}

export interface NotificationSettings {
  defaultDurationMs: number
}

export interface AppSettings {
  power:        PowerSettings
  alarms:       AlarmSettings
  notifications: NotificationSettings
}

// ── Defaults ──────────────────────────────────────────────────────────────────

export const DEFAULT_SETTINGS: AppSettings = {
  power: {
    autoEnterIdleMs:    null,
    autoEnterAtTime:    null,
    autoExitOnActivity: true,
  },
  alarms: {
    focusTimer: {
      enabled:      false,
      workMinutes:  25,
      breakMinutes: 5,
    },
    breakReminder: {
      enabled:         false,
      intervalMinutes: 60,
    },
    eyeStrain: {
      enabled: false,
    },
    hydration: {
      enabled:         false,
      intervalMinutes: 30,
    },
    endOfDay: {
      enabled: false,
      time:    '18:00',
    },
    deadline: {
      enabled:   false,
      deadlines: [],
    },
    julesWatchdog: {
      enabled:           false,
      maxSessionMinutes: 30,
    },
  },
  notifications: {
    defaultDurationMs: 5000,
  },
}
