import { create } from 'zustand'
import type { HubNotification } from '@shared/hub'

interface HubStore {
  items:    HubNotification[]
  add:      (n: HubNotification) => void
  dismiss:  (id: string) => void
  clearAll: () => void
}

export const useHubStore = create<HubStore>((set) => ({
  items:    [],
  add:      (n) => { set((s) => ({ items: [n, ...s.items].slice(0, 20) })); },
  dismiss:  (id) => { set((s) => ({ items: s.items.filter((i) => i.id !== id) })); },
  clearAll: () => { set({ items: [] }); },
}))
