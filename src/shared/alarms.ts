export type AlarmRepeat = 'none' | 'daily' | 'weekdays' | 'weekly'

export interface AlarmEntry {
  id: string
  label: string
  hour: number        // 0–23
  minute: number      // 0–59
  repeat: AlarmRepeat
  dayOfWeek: number   // 0=Sun…6=Sat; used when repeat='weekly'
  enabled: boolean
  sound: boolean
  snoozeMinutes: number
  createdAt: string
  lastFiredDate?: string  // YYYY-MM-DD; prevents double-fire within same day
}
