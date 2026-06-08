import { create } from 'zustand'
import type { JulesClient } from '@/lib/jules/client'
import type { Session, Activity } from '@/types/jules'

async function fetchSessions(client: JulesClient | null): Promise<Session[]> {
  if (!client) return []
  return client.listSessions()
}

export interface AppStore {
  sessionList: Session[]
  activities: Record<string, Activity[]>
  activitiesLoading: Record<string, boolean>
  activitiesError: Record<string, string | null>
  
  loadSessions: (client: JulesClient | null) => Promise<void>
  startPolling: (client: JulesClient | null) => () => void
  
  loadActivities: (client: JulesClient | null, sessionId: string) => Promise<void>
  sendMessage: (client: JulesClient | null, sessionId: string, content: string) => Promise<void>
  approvePlan: (client: JulesClient | null, sessionId: string) => Promise<void>
}

export const useStore = create<AppStore>((set, get) => ({
  sessionList: [],
  activities: {},
  activitiesLoading: {},
  activitiesError: {},

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

  loadActivities: async (client, sessionId) => {
    if (!client) return;
    set(state => ({ activitiesLoading: { ...state.activitiesLoading, [sessionId]: true }, activitiesError: { ...state.activitiesError, [sessionId]: null } }))
    try {
      const data = await client.listActivities(sessionId)
      set(state => ({
        activities: { ...state.activities, [sessionId]: data },
        activitiesLoading: { ...state.activitiesLoading, [sessionId]: false }
      }))
    } catch (err) {
      set(state => ({
        activitiesError: { ...state.activitiesError, [sessionId]: err instanceof Error ? err.message : 'Failed to load activities' },
        activitiesLoading: { ...state.activitiesLoading, [sessionId]: false }
      }))
    }
  },

  sendMessage: async (client, sessionId, content) => {
    if (!client || !content.trim()) return;
    try {
      await client.createActivity({ sessionId, content })
      await get().loadActivities(client, sessionId)
    } catch (err) {
      console.error('[AppStore] sendMessage error:', err)
      throw err;
    }
  },

  approvePlan: async (client, sessionId) => {
    if (!client) return;
    try {
      await client.approvePlan(sessionId)
      await get().loadActivities(client, sessionId)
    } catch (err) {
      console.error('[AppStore] approvePlan error:', err)
      throw err;
    }
  },

  startPolling: (client) => {
    let stopped = false
    const tick = () => {
      if (stopped) return
      get().loadSessions(client).catch(() => {})
      
      // Also poll activities for any currently active session we have loaded
      const state = get();
      state.sessionList.forEach(session => {
         if (session.status === 'active' || session.status === 'planning') {
            state.loadActivities(client, session.id).catch(() => {});
         }
      })
    }
    tick()
    const id = setInterval(tick, 5000)
    return () => {
      stopped = true
      clearInterval(id)
    }
  },
}))
