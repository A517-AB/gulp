import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { AlarmEntry } from '@/library/alarm'
import type { ReminderEntry } from '@/library/alarm'

interface TimeStore {
  alarms:          AlarmEntry[]
  reminders:       ReminderEntry[]
  addAlarm:        (a: AlarmEntry) => void
  removeAlarm:     (id: string) => void
  toggleAlarm:     (id: string) => void
  snoozeAlarm:     (id: string, until: string) => void
  addReminder:     (r: ReminderEntry) => void
  removeReminder:  (id: string) => void
  toggleReminder:  (id: string) => void
  snoozeReminder:  (id: string, until: string) => void
}

export const useTimeStore = create<TimeStore>()(
  persist(
    (set) => ({
      alarms:    [],
      reminders: [],

      addAlarm:    (a) => set(s => ({ alarms: [...s.alarms, a] })),
      removeAlarm: (id) => set(s => ({ alarms: s.alarms.filter(a => a.id !== id) })),
      toggleAlarm: (id) => set(s => ({ alarms: s.alarms.map(a => a.id === id ? { ...a, enabled: !a.enabled } : a) })),
      snoozeAlarm: (id, until) => set(s => ({ alarms: s.alarms.map(a => a.id === id ? { ...a, snoozeUntil: until } : a) })),

      addReminder:    (r) => set(s => ({ reminders: [...s.reminders, r] })),
      removeReminder: (id) => set(s => ({ reminders: s.reminders.filter(r => r.id !== id) })),
      toggleReminder: (id) => set(s => ({ reminders: s.reminders.map(r => r.id === id ? { ...r, enabled: !r.enabled } : r) })),
      snoozeReminder: (id, until) => set(s => ({ reminders: s.reminders.map(r => r.id === id ? { ...r, snoozeUntil: until } : r) })),
    }),
    { name: 'time-store' },
  ),
)
