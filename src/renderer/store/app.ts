import { create } from 'zustand'
import type {
  JulesLocalActivity,
  JulesLocalSessionOutcome,
  JulesLocalSessionInfo
} from '@shared/electron'
import { sdkIpc } from '@shared/bridge'

export interface SessionSlice {
  activities: JulesLocalActivity[]
  status: 'connecting' | 'connected' | 'completed' | 'failed' | 'disconnected'
  outcome: JulesLocalSessionOutcome | null
  info: JulesLocalSessionInfo | null
  error: string | null
}

export interface AppStore {
  sessions: Record<string, SessionSlice>
  activeWatchers: Record<string, number>
  listenersInitialized: boolean
  watch: (id: string) => () => void
  initializeListeners: () => () => void
}

export const useStore = create<AppStore>((set, get) => ({
  sessions: {},
  activeWatchers: {},
  listenersInitialized: false,

  initializeListeners: () => {
    if (get().listenersInitialized || !sdkIpc) {
      return () => {}
    }

    const disposeActivity = sdkIpc.onActivity((payload) => {
      const id = payload.sessionId
      set((state) => {
        const slice = state.sessions[id]
        if (!slice) return state

        const prev = slice.activities
        const exists = prev.findIndex((a) => a.id === payload.activity.id)
        const newActivities = [...prev]

        if (exists >= 0) {
          newActivities[exists] = payload.activity
        } else {
          newActivities.push(payload.activity)
        }

        return {
          sessions: {
            ...state.sessions,
            [id]: { ...slice, activities: newActivities, status: 'connected' },
          },
        }
      })
    })

    const disposeState = sdkIpc.onStreamState((payload) => {
      const id = payload.sessionId
      set((state) => {
        const slice = state.sessions[id]
        if (!slice) return state

        const newStatus =
          payload.state === 'started'
            ? 'connected'
            : payload.state === 'completed'
              ? 'completed'
              : payload.state === 'failed'
                ? 'failed'
                : 'disconnected'

        return {
          sessions: {
            ...state.sessions,
            [id]: {
              ...slice,
              status: newStatus as SessionSlice['status'],
              ...(payload.info ? { info: payload.info } : {}),
              ...(payload.error ? { error: payload.error } : {}),
            },
          },
        }
      })

      if (payload.state === 'completed' || payload.state === 'failed') {
        sdkIpc
          ?.getResult(id)
          .then((res) => {
            set((state) => {
              const slice = state.sessions[id]
              if (!slice) return state
              return {
                sessions: {
                  ...state.sessions,
                  [id]: { ...slice, outcome: res },
                },
              }
            })
          })
          .catch(() => {})
      }
    })

    set({ listenersInitialized: true })

    return () => {
      disposeActivity()
      disposeState()
      set({ listenersInitialized: false })
    }
  },

  watch: (id: string) => {
    const { sessions } = get()

    if (!sessions[id]) {
      set((state) => ({
        sessions: {
          ...state.sessions,
          [id]: {
            activities: [],
            status: 'connecting',
            outcome: null,
            info: null,
            error: null,
          },
        },
      }))
    }

    if (!get().listenersInitialized && sdkIpc) {
      get().initializeListeners()
    }

    const currentCount = get().activeWatchers[id] ?? 0
    set((state) => ({
      activeWatchers: {
        ...state.activeWatchers,
        [id]: currentCount + 1,
      },
    }))

    if (currentCount === 0 && sdkIpc) {
      sdkIpc.startStream(id).catch((err) => {
        set((state) => {
          const slice = state.sessions[id]
          if (!slice) return state
          return {
            sessions: {
              ...state.sessions,
              [id]: {
                ...slice,
                status: 'disconnected',
                error: err instanceof Error ? err.message : String(err),
              },
            },
          }
        })
      })

      // Prefetch history and info
      sdkIpc
        .getHistory(id)
        .then((history) => {
          set((state) => {
            const slice = state.sessions[id]
            if (!slice) return state
            return {
              sessions: {
                ...state.sessions,
                [id]: { ...slice, activities: history },
              },
            }
          })
        })
        .catch(() => {})

      sdkIpc
        .getSession(id)
        .then((info) => {
          set((state) => {
            const slice = state.sessions[id]
            if (!slice) return state
            return {
              sessions: {
                ...state.sessions,
                [id]: { ...slice, info },
              },
            }
          })
        })
        .catch(() => {})
    }

    return () => {
      const { activeWatchers } = get()
      const currentCount = activeWatchers[id] ?? 0
      const newCount = Math.max(0, currentCount - 1)

      set((state) => ({
        activeWatchers: {
          ...state.activeWatchers,
          [id]: newCount,
        },
      }))

      if (newCount === 0 && sdkIpc) {
        sdkIpc.stopStream(id).catch(() => {})
      }
    }
  },
}))
