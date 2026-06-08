import type { SoundId } from '@/library/alarm/sounds'

export type { SoundId }

export interface NotificationAction {
  label: string
}

export interface NotificationPayload {
  title:      string
  body?:      string
  icon?:      string
  action?:    NotificationAction
  cancel?:    NotificationAction
  sound?:     SoundId
  duration?:  number
  id?:        string | number
  extraData?: unknown
}

export type NotificationType = 'default' | 'success' | 'error' | 'info' | 'warning'

export interface UseNotificationOptions {
  onClick?:    (extraData: unknown) => void
  onCancel?:   (extraData: unknown) => void
}

export interface UseNotificationResult {
  notify:   (payload: NotificationPayload) => void
  success:  (payload: NotificationPayload) => void
  error:    (payload: NotificationPayload) => void
  info:     (payload: NotificationPayload) => void
  warning:  (payload: NotificationPayload) => void
  dismiss:  () => void
}
