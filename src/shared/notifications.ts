export type NotificationChannel = 'alarm' | 'session' | 'reminder' | 'system' | 'chat'
export type NotificationAction = 'dismiss' | 'snooze' | 'open'

export interface AppNotification {
  id: string
  channel: NotificationChannel
  title: string
  body: string
  timestamp: string
  sound?: boolean
  actions?: NotificationAction[]
  /** Contextual metadata for linking to other pages (e.g. alarmId, sessionId, noteId) */
  meta?: Record<string, string>
}
