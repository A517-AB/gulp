import {create} from 'zustand'
import {persist} from 'zustand/middleware'
import type {AlarmEntry, ReminderEntry} from '@/library/alarm'

interface TimeStore {
  alarms:          AlarmEntry[]
  reminders:       ReminderEntry[]
  addAlarm:        (a: AlarmEntry) => void
  removeAlarm:     (id: string) => void
  toggleAlarm:     (id: string) => void
  snoozeAlarm:     (id: string, until: string) => void
    clearAlarms: () => void
  addReminder:     (r: ReminderEntry) => void
  removeReminder:  (id: string) => void
  toggleReminder:  (id: string) => void
  snoozeReminder:  (id: string, until: string) => void
    clearReminders: () => void
}

export const useTimeStore = create<TimeStore>()(
  persist(
    (set) => ({
      alarms:    [],
      reminders: [],

        addAlarm: (a) => {
            console.log('[time] alarm added:', a.id, a.label, a.time);
            set(s => ({alarms: [...s.alarms, a]}))
        },
        removeAlarm: (id) => {
            console.log('[time] alarm removed:', id);
            set(s => ({alarms: s.alarms.filter(a => a.id !== id)}))
        },
        toggleAlarm: (id) => {
            console.log('[time] alarm toggled:', id);
            set(s => ({alarms: s.alarms.map(a => a.id === id ? {...a, enabled: !a.enabled} : a)}))
        },
        snoozeAlarm: (id, until) => {
            console.log('[time] alarm snoozed:', id, 'until', until);
            set(s => ({alarms: s.alarms.map(a => a.id === id ? {...a, snoozeUntil: until} : a)}))
        },
        clearAlarms: () => {
            console.log('[time] alarms cleared');
            set({alarms: []})
        },

        addReminder: (r) => {
            console.log('[time] reminder added:', r.id, r.title, r.schedule);
            set(s => ({reminders: [...s.reminders, r]}))
        },
        removeReminder: (id) => {
            console.log('[time] reminder removed:', id);
            set(s => ({reminders: s.reminders.filter(r => r.id !== id)}))
        },
        toggleReminder: (id) => {
            console.log('[time] reminder toggled:', id);
            set(s => ({reminders: s.reminders.map(r => r.id === id ? {...r, enabled: !r.enabled} : r)}))
        },
        snoozeReminder: (id, until) => {
            console.log('[time] reminder snoozed:', id, 'until', until);
            set(s => ({reminders: s.reminders.map(r => r.id === id ? {...r, snoozeUntil: until} : r)}))
        },
        clearReminders: () => {
            console.log('[time] reminders cleared');
            set({reminders: []})
        },
    }),
    { name: 'time-store' },
  ),
)
