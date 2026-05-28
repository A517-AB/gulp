import { create } from 'zustand'

export interface SessionSlice {
  status: 'connecting' | 'connected' | 'disconnected'
  error: Error | null
}

export interface AppStore {
  sessions:      Record<string, SessionSlice>
  isLowPower:    boolean
  isAlwaysOnTop: boolean
  enterLowPower:    () => void
  exitLowPower:     () => void
  setAlwaysOnTop:   (val: boolean) => void
}

export const useStore = create<AppStore>((set) => ({
  sessions:      {},
  isLowPower:    false,
  isAlwaysOnTop: false,
  enterLowPower:  () => { set({ isLowPower: true }) },
  exitLowPower:   () => { set({ isLowPower: false, isAlwaysOnTop: false }) },
  setAlwaysOnTop: (val) => { set({ isAlwaysOnTop: val }) },
}))
