import { create } from 'zustand'

export interface NotificationAction {
  label: string
  onClick: () => void
}

export interface AppNotification {
  id: string
  type: 'info' | 'success' | 'error' | 'warning'
  title: string
  body?: string
  actions?: NotificationAction[]
  duration: number
  sound?: boolean
  channel?: string
}

interface NotificationStore {
  notifications: AppNotification[]
  push: (n: Omit<AppNotification, 'id'>) => string
  dismiss: (id: string) => void
}

export const useNotifications = create<NotificationStore>((set) => ({
  notifications: [],
  push: (n) => {
    const id = crypto.randomUUID()
    if (n.sound) playAlarmBeep()
    set((s) => ({ notifications: [...s.notifications, { ...n, id }] }))
    return id
  },
  dismiss: (id) => {
    set((s) => ({ notifications: s.notifications.filter((n) => n.id !== id) }))
  },
}))

export function notify(n: Omit<AppNotification, 'id'>) {
  return useNotifications.getState().push(n)
}

export function playAlarmBeep(): void {
  try {
    const ctx = new AudioContext()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.type = 'sine'
    osc.frequency.value = 880
    gain.gain.setValueAtTime(0.3, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.5)
    osc.start(ctx.currentTime)
    osc.stop(ctx.currentTime + 1.5)
  } catch { /* AudioContext not available */ }
}
