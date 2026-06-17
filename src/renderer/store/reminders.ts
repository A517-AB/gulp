import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type RepeatMode = 'none' | 'daily' | 'weekly'

export interface Reminder {
  id: string
  title: string
  body?: string
  time: string        // ISO datetime string
  repeat: RepeatMode
  sound: string
  enabled: boolean
  firedAt?: string    // last fire ISO
}

interface RemindersState {
  reminders: Reminder[]
  add: (r: Omit<Reminder, 'id'>) => void
  update: (id: string, patch: Partial<Reminder>) => void
  remove: (id: string) => void
  toggle: (id: string) => void
  markFired: (id: string) => void
}

export const useRemindersStore = create<RemindersState>()(persist(
  (set) => ({
    reminders: [],

    add: (r) => {
      set(s => ({ reminders: [...s.reminders, { ...r, id: crypto.randomUUID() }] }))
    },

    update: (id, patch) => {
      set(s => ({ reminders: s.reminders.map(r => r.id === id ? { ...r, ...patch } : r) }))
    },

    remove: (id) => {
      set(s => ({ reminders: s.reminders.filter(r => r.id !== id) }))
    },

    toggle: (id) => {
      set(s => ({ reminders: s.reminders.map(r => r.id === id ? { ...r, enabled: !r.enabled } : r) }))
    },

    markFired: (id) => {
      set(s => ({ reminders: s.reminders.map(r => r.id === id ? { ...r, firedAt: new Date().toISOString() } : r) }))
    },
  }),
  { name: 'reminders-store' }
))
