import { useSettingsStore } from '@/store/settings'
import type { AppSettings, PowerSettings, AlarmSettings, NotificationSettings } from '@/types/settings'

// The one hook everything uses. Never import useSettingsStore directly in components.
export function useSettings(): AppSettings {
  return useSettingsStore((s) => s.settings)
}

export function usePowerSettings(): [PowerSettings, (patch: Partial<PowerSettings>) => void] {
  const power    = useSettingsStore((s) => s.settings.power)
  const setPower = useSettingsStore((s) => s.setPower)
  return [power, setPower]
}

export function useAlarmSettings(): [AlarmSettings, (patch: Partial<AlarmSettings>) => void] {
  const alarms    = useSettingsStore((s) => s.settings.alarms)
  const setAlarms = useSettingsStore((s) => s.setAlarms)
  return [alarms, setAlarms]
}

export function useNotificationSettings(): [NotificationSettings, (patch: Partial<NotificationSettings>) => void] {
  const notifications    = useSettingsStore((s) => s.settings.notifications)
  const setNotifications = useSettingsStore((s) => s.setNotifications)
  return [notifications, setNotifications]
}
