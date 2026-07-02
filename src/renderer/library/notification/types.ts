export type SoundId = 'none' | 'beep' | 'chime' | 'bell' | 'pulse' | 'alarm'

export interface NotifAction {
  id:     string
  label:  string
  style?: 'primary' | 'ghost'
}

export interface NotificationPayload {
  title:      string
  body?:      string
  actions?:   NotifAction[]
  sound?:     SoundId
  duration?:  number
  id?:        string | number
  extraData?: unknown
  source?:    string
    color?: string
    icon?: string
}

export type NotificationType = 'default' | 'success' | 'error' | 'info' | 'warning'

export interface UseNotificationOptions {
  onAction?: (actionId: string, extraData: unknown) => void
}

export interface UseNotificationResult {
  notify:   (payload: NotificationPayload) => void
  success:  (payload: NotificationPayload) => void
  error:    (payload: NotificationPayload) => void
  info:     (payload: NotificationPayload) => void
  warning:  (payload: NotificationPayload) => void
  dismiss:  () => void
}
