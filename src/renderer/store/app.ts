import { create } from 'zustand'
import type { JulesClient } from '@/lib/jules/client'
import type { Activity } from '@/types/jules'

export interface SessionSlice {
  activities: Activity[]
  status: 'connecting' | 'connected' | 'disconnected'
  error: Error | null
}

export interface AppStore {
  sessions: Record<string, SessionSlice>
  watch: (id: string, client: JulesClient) => () => void
}

export const useStore = create<AppStore>((set, get) => ({
  sessions: {},

  watch: (id, client) => {
    const { sessions } = get()
    if (sessions[id]?.status === 'connected') return () => {}

    set(state => ({
      sessions: {
        ...state.sessions,
        [id]: { activities: [], status: 'connecting', error: null },
      },
    }))

    let stopped = false

    const poll = async () => {
      try {
        const activities = await client.listActivities(id)
        if (stopped) return
        set(state => ({
          sessions: {
            ...state.sessions,
            [id]: { activities, status: 'connected', error: null },
          },
        }))
      } catch (err) {
        if (stopped) return
        set(state => ({
          sessions: {
            ...state.sessions,
            [id]: { ...state.sessions[id] ?? { activities: [], status: 'disconnected' }, error: err as Error },
          },
        }))
      }
    }

    void poll()
    const timer = setInterval(() => { void poll() }, 5_000)

    return () => {
      stopped = true
      clearInterval(timer)
      set(state => {
        const { [id]: _, ...rest } = state.sessions
        return { sessions: rest }
      })
    }
  },
}))
