import { create } from 'zustand'
import type { JulesClient } from '@/lib/jules/client'
import type { Activity, Session } from '@/types/jules'


async function fetchSessions(client: JulesClient | null): Promise<Session[]> {
  if (!client) return []
  return client.listSessions()
}

export interface SessionSlice {
  activities: Activity[]
  status: 'connecting' | 'connected' | 'disconnected'
  error: Error | null
}

export interface AppStore {
  sessionList: Session[]
  sessions: Record<string, SessionSlice>
  loadSessions: (client: JulesClient | null) => Promise<void>
  startPolling: (client: JulesClient | null) => () => void
  watch: (id: string, client: JulesClient) => () => void
}

export const useStore = create<AppStore>((set, get) => ({
  sessionList: [],
  sessions: {},

  loadSessions: async (client) => {
    const data = await fetchSessions(client)
    set(state => {
      const prev = state.sessionList
      if (
        prev.length === data.length &&
        prev.every((s, i) => data[i] !== undefined && s.id === data[i].id && s.status === data[i].status && s.updatedAt === data[i].updatedAt)
      ) return state
      return { sessionList: data }
    })
  },

  startPolling: (client) => {
    let stopped = false
    const tick = () => {
      if (stopped) return
      get().loadSessions(client).catch(() => {})
    }
    tick()
    const id = setInterval(tick, 10_000)
    return () => {
      stopped = true
      clearInterval(id)
    }
  },

  watch: (id, client) => {
    const existing = get().sessions[id]
    if (!existing) {
      set(state => ({
        sessions: { ...state.sessions, [id]: { activities: [], status: 'connecting', error: null } },
      }))
    }

    let stopped = false

    const poll = async () => {
      try {
        const activities = await client.listActivities(id)
        if (stopped) return
        set(state => ({
          sessions: { ...state.sessions, [id]: { activities, status: 'connected', error: null } },
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
    }
  },
}))
