import { create } from 'zustand'
import type { AppNotification, NotificationAction } from '@shared/notifications'

interface NotificationStore {
  items: AppNotification[]
  add:      (n: AppNotification) => void
  dismiss:  (id: string) => void
  clearAll: () => void
}

export const useNotifications = create<NotificationStore>((set) => ({
  items: [],
  add:      (n) => set((s) => ({ items: [n, ...s.items].slice(0, 20) })),
  dismiss:  (id) => set((s) => ({ items: s.items.filter((i) => i.id !== id) })),
  clearAll: () => set({ items: [] }),
}))

/** Play a simple alarm beep via Web Audio API. */
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

/** Actions the user can take on a notification from the renderer. */
export type { NotificationAction }
