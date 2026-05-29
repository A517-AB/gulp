import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { AppSettings, PowerSettings, AlarmSettings, NotificationSettings, ChatAlias } from '@/types/settings'
import { DEFAULT_SETTINGS } from '@/types/settings'

interface SettingsStore {
  settings: AppSettings
  setPower:         (patch: Partial<PowerSettings>) => void
  setAlarms:        (patch: Partial<AlarmSettings>) => void
  setNotifications: (patch: Partial<NotificationSettings>) => void
  setChatAliases:   (aliases: ChatAlias[]) => void
  reset:            () => void
}

export const useSettingsStore = create<SettingsStore>()(
  persist(
    (set) => ({
      settings: DEFAULT_SETTINGS,

      setPower: (patch) => {
        set((s) => ({
          settings: { ...s.settings, power: { ...s.settings.power, ...patch } },
        }))
      },

      setAlarms: (patch) => {
        set((s) => ({
          settings: { ...s.settings, alarms: { ...s.settings.alarms, ...patch } },
        }))
      },

      setNotifications: (patch) => {
        set((s) => ({
          settings: { ...s.settings, notifications: { ...s.settings.notifications, ...patch } },
        }))
      },

      setChatAliases: (aliases) => {
        set(s => ({ settings: { ...s.settings, chatAliases: aliases } }))
      },

      reset: () => { set({ settings: DEFAULT_SETTINGS }) },
    }),
    {
      name: 'app-settings',
      // merge defaults with stored so new settings never come up undefined
      merge: (stored, current) => {
        const storedSettings = (stored as Partial<SettingsStore>).settings

        return {
          ...current,
          settings: {
            ...DEFAULT_SETTINGS,
            ...storedSettings,
            alarms: {
              ...DEFAULT_SETTINGS.alarms,
              ...storedSettings?.alarms,
            },
            chatAliases: storedSettings?.chatAliases ?? DEFAULT_SETTINGS.chatAliases,
          },
        }
      },
    }
  )
)
