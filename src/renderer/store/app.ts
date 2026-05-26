import { create } from 'zustand'

export interface SessionSlice {
  status: 'connecting' | 'connected' | 'disconnected'
  error: Error | null
}

export interface AppStore {
  sessions: Record<string, SessionSlice>
}

export const useStore = create<AppStore>(() => ({
  sessions: {},
}))
