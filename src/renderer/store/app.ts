import {create} from 'zustand'
import type {Activity, SessionResource, Source} from '@jules'
import type {SessionFormData} from '@/types/activity-feed'
import {sdkIpc} from '@shared/bridge'

export type { SessionFormData }

const DEFAULT_FORM: SessionFormData = {
  sourceId: '',
  title: '',
  prompt: '',
  startingBranch: '',
  autoCreatePr: false,
    interactive: false,
}

export interface AppStore {
    sessionList: SessionResource[]
  activities: Record<string, Activity[]>
  activitiesLoading: Record<string, boolean>
  activitiesError: Record<string, string | null>

  sources: Source[]
  sourcesLoaded: boolean
  newSessionForm: SessionFormData
  setNewSessionForm: (patch: Partial<SessionFormData>) => void
  resetNewSessionForm: () => void
    loadSources: () => Promise<void>

    loadSessions: () => Promise<void>
    startPolling: () => () => void

    loadActivities: (sessionId: string) => Promise<void>
    sendMessage: (sessionId: string, content: string) => Promise<void>
    approvePlan: (sessionId: string) => Promise<void>
}

export const useStore = create<AppStore>((set, get) => ({
  sessionList: [],
  activities: {},
  activitiesLoading: {},
  activitiesError: {},

  sources: [],
  sourcesLoaded: false,
  newSessionForm: DEFAULT_FORM,
  setNewSessionForm: (patch) => set(s => ({ newSessionForm: { ...s.newSessionForm, ...patch } })),
  resetNewSessionForm: () => set({ newSessionForm: DEFAULT_FORM }),

    loadSources: async () => {
        if (!sdkIpc || get().sourcesLoaded) return
    try {
        const data = await sdkIpc.sources.list()
      set(s => ({
        sources: data,
        sourcesLoaded: true,
        newSessionForm: {
          ...s.newSessionForm,
          sourceId: s.newSessionForm.sourceId || data.at(0)?.id || '',
        },
      }))
    } catch {
      // leave sources empty, caller can retry
    }
  },

    loadSessions: async () => {
        if (!sdkIpc) return
        const data = await sdkIpc.client.sessions({limit: 20})
    set(state => {
      const prev = state.sessionList
      if (
        prev.length === data.length &&
          prev.every((s, i) => data[i] !== undefined && s.id === data[i].id && s.state === data[i].state && s.updateTime === data[i].updateTime)
      ) return state
      return { sessionList: data }
    })
  },

    loadActivities: async (sessionId) => {
        if (!sdkIpc) return
    set(state => ({ activitiesLoading: { ...state.activitiesLoading, [sessionId]: true }, activitiesError: { ...state.activitiesError, [sessionId]: null } }))
    try {
        const {activities} = await sdkIpc.activities.list(sessionId)
      set(state => ({
          activities: {...state.activities, [sessionId]: activities},
        activitiesLoading: { ...state.activitiesLoading, [sessionId]: false }
      }))
    } catch (err) {
      set(state => ({
        activitiesError: { ...state.activitiesError, [sessionId]: err instanceof Error ? err.message : 'Failed to load activities' },
        activitiesLoading: { ...state.activitiesLoading, [sessionId]: false }
      }))
    }
  },

    sendMessage: async (sessionId, content) => {
        if (!sdkIpc || !content.trim()) return
    try {
        await sdkIpc.session.send(sessionId, content)
        await get().loadActivities(sessionId)
    } catch (err) {
      console.error('[AppStore] sendMessage error:', err)
        throw err
    }
  },

    approvePlan: async (sessionId) => {
        if (!sdkIpc) return
    try {
        await sdkIpc.session.approve(sessionId)
        await get().loadActivities(sessionId)
    } catch (err) {
      console.error('[AppStore] approvePlan error:', err)
        throw err
    }
  },

    startPolling: () => {
    let stopped = false
    const tick = () => {
      if (stopped) return
        get().loadSessions().catch(() => {
        })
        const state = get()
      state.sessionList.forEach(session => {
          if (session.state === 'inProgress' || session.state === 'planning') {
              state.loadActivities(session.id).catch(() => {
              })
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
