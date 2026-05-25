import { create } from 'zustand'
import type { Activity, Outcome } from '@/types/jules-sdk'
import { sdkIpc } from '@shared/bridge'

export interface SessionSlice {
  activities: Activity[]
  status: 'connecting' | 'connected' | 'disconnected'
  outcome: Outcome | null
  error: Error | null
}

export interface AppStore {
  sessions: Record<string, SessionSlice>
  unsubscribers: Record<string, () => void>
  watch: (id: string) => () => void
}

export const useStore = create<AppStore>((set, get) => ({
  sessions: {},
  unsubscribers: {},
  watch: (id: string) => {
    const { sessions } = get()
    if (sessions[id]?.status === 'connected') {
      return () => {} // Already watching
    }

    set(state => ({
      sessions: {
        ...state.sessions,
        [id]: { activities: [], status: 'connecting', outcome: null, error: null }
      }
    }))

    if (!sdkIpc) {
      set(state => ({
        sessions: {
          ...state.sessions,
          [id]: { activities: [], status: 'disconnected', outcome: null, error: new Error('IPC not available') }
        }
      }))
      return () => {}
    }

    const unsub = sdkIpc.session.stream(
      id,
      (activity: Activity) => {
        set(state => {
          const slice = state.sessions[id]
          if (!slice) return state

          const prev = slice.activities
          const exists = prev.findIndex(a => a.id === activity.id)
          const newActivities = [...prev]

          if (exists >= 0) {
            newActivities[exists] = activity
          } else {
            newActivities.push(activity)
          }

          return {
            sessions: {
              ...state.sessions,
              [id]: { ...slice, activities: newActivities, status: 'connected' }
            }
          }
        })
      },
      () => {
        set(state => {
          const s = state.sessions[id]
          if (!s) return state
          return {
            sessions: {
              ...state.sessions,
              [id]: { ...s, status: 'disconnected' }
            }
          }
        })
        sdkIpc!.session.result(id).then(res => {
          set(state => {
            const s = state.sessions[id]
            if (!s) return state
            return {
              sessions: {
                ...state.sessions,
                [id]: { ...s, outcome: res as Outcome }
              }
            }
          })
        }).catch(err => {
          set(state => {
            const s = state.sessions[id]
            if (!s) return state
            return {
              sessions: {
                ...state.sessions,
                [id]: { ...s, error: err as Error }
              }
            }
          })
        })
      }
    )

    set(state => ({
      unsubscribers: {
        ...state.unsubscribers,
        [id]: unsub
      }
    }))

    return unsub
  }
}))
