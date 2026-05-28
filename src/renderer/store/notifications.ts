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
