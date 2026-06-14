import type { SoundId } from '@/library/notification/sounds'

export interface NotifPayload {
  title:      string
  body?:      string
  type?:      'default' | 'success' | 'error' | 'info' | 'warning'
  action?:    { label: string }
  cancel?:    { label: string }
  duration?:  number
  id?:        string | number
  sound?:     SoundId
  extraData?: unknown
}

interface Bridge {
  onShow:  (cb: (data: NotifPayload) => void) => void
  click:   (extraData?: unknown) => void
  cancel:  (extraData?: unknown) => void
}

const b = (window as unknown as { notif: Bridge }).notif

export const notifBridge = {
  onShow:  (cb: (data: NotifPayload) => void) => { b.onShow(cb) },
  click:   (extraData?: unknown)               => { b.click(extraData) },
  cancel:  (extraData?: unknown)               => { b.cancel(extraData) },
} as const
