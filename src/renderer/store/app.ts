import {create} from 'zustand'
import type {Activity, SessionResource, Source} from '@google/jules-sdk/types'
import type {SessionFormData} from '@/types/activity-feed'
import {sdkIpc} from '@shared/bridge'

export type { SessionFormData }

const activeStreams = new Map<string, () => void>()
let syncInProgress = false

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
    activitySummaries: Record<string, Record<string, string>>
    activitiesError: Record<string, string | null>

    sources: Source[]
    sourcesLoaded: boolean
    newSessionForm: SessionFormData
    setNewSessionForm: (patch: Partial<SessionFormData>) => void
    resetNewSessionForm: () => void
    loadSources: () => Promise<void>

    loadSessions: () => Promise<void>
    sync: () => Promise<void>

    loadActivities: (sessionId: string) => Promise<void>
    streamActivities: (sessionId: string) => () => void
    sendMessage: (sessionId: string, content: string) => Promise<void>
    approvePlan: (sessionId: string) => Promise<void>
}

export const useStore = create<AppStore>((set, get) => ({
    sessionList: [],
    activities: {},
    activitySummaries: {},
    activitiesError: {},

    sources: [],
    sourcesLoaded: false,
    newSessionForm: DEFAULT_FORM,
    setNewSessionForm: (patch) => {
        set(s => ({newSessionForm: {...s.newSessionForm, ...patch}}))
    },
    resetNewSessionForm: () => {
        set({newSessionForm: DEFAULT_FORM})
    },

    loadSources: async () => {
        if (!sdkIpc || get().sourcesLoaded) return
        try {
            const data = await sdkIpc.sources.list()
            set(s => ({
                sources: data,
                sourcesLoaded: true,
                newSessionForm: {
                    ...s.newSessionForm,
                    sourceId: s.newSessionForm.sourceId !== '' ? s.newSessionForm.sourceId : (data.at(0)?.id ?? ''),
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
                prev.every((s, i) => {
                    const d = data[i]
                    if (d === undefined) return false
                    return s.id === d.id && s.state === d.state && s.updateTime === d.updateTime
                })
            ) return state
            return {sessionList: data}
        })
    },

    sync: async () => {
        if (!sdkIpc || syncInProgress) return
        syncInProgress = true
        try {
            await sdkIpc.client.sync()
            await get().loadSessions()
        } catch (err) {
            console.error('[AppStore] sync error:', err)
        } finally {
            syncInProgress = false
        }
    },

    loadActivities: async (sessionId) => {
        if (!sdkIpc) return
        if ((get().activities[sessionId]?.length ?? 0) > 0) return
        const ipc = sdkIpc
        set(state => ({activitiesError: {...state.activitiesError, [sessionId]: null}}))
        try {
            let activities = await ipc.activities.select(sessionId)
            if (activities.length === 0) {
                const result = await ipc.activities.list(sessionId)
                activities = result.activities
            }
            set(state => {
                const streamed = state.activities[sessionId] ?? []
                const merged = [...activities]
                for (const a of streamed) {
                    if (!merged.some(m => m.id === a.id)) merged.push(a)
                }
                return {activities: {...state.activities, [sessionId]: merged}}
            })
            void ipc.util.toSummaries(activities).then(sums => {
                const map = Object.fromEntries(sums.map(s => [s.id, s.summary]))
                set(state => ({
                    activitySummaries: {
                        ...state.activitySummaries,
                        [sessionId]: {...(state.activitySummaries[sessionId] ?? {}), ...map},
                    },
                }))
            })
        } catch (err) {
            set(state => ({
                activitiesError: {
                    ...state.activitiesError,
                    [sessionId]: err instanceof Error ? err.message : 'Failed to load activities'
                },
            }))
        }
    },

    streamActivities: (sessionId) => {
        if (activeStreams.has(sessionId) || !sdkIpc) return () => { /* no-op */
        }
        const ipc = sdkIpc
        const unsub = ipc.activities.updates(sessionId, (activity) => {
            set(s => {
                const existing = s.activities[sessionId] ?? []
                if (existing.some(a => a.id === activity.id)) return s
                return {activities: {...s.activities, [sessionId]: [...existing, activity]}}
            })
            void ipc.util.toSummary(activity).then(s => {
                set(state => ({
                    activitySummaries: {
                        ...state.activitySummaries,
                        [sessionId]: {...(state.activitySummaries[sessionId] ?? {}), [s.id]: s.summary},
                    },
                }))
            })
            if (activity.type === 'sessionCompleted' || activity.type === 'sessionFailed') {
                void get().loadSessions()
            }
        }, () => {
            activeStreams.delete(sessionId)
            void get().loadSessions()
        })
        activeStreams.set(sessionId, unsub)
        return () => {
            unsub()
            activeStreams.delete(sessionId)
        }
    },

    sendMessage: async (sessionId, content) => {
        if (!sdkIpc || !content.trim()) return
        try {
            await sdkIpc.session.send(sessionId, content)
            void get().loadSessions()
        } catch (err) {
            console.error('[AppStore] sendMessage error:', err)
            throw err
        }
    },

    approvePlan: async (sessionId) => {
        if (!sdkIpc) return
        try {
            await sdkIpc.session.approve(sessionId)
        } catch (err) {
            console.error('[AppStore] approvePlan error:', err)
            throw err
        }
    },
}))

// self-initialize on import
void useStore.getState().loadSessions()
void useStore.getState().loadSources()

// migrate localStorage-archived sessions to SDK, once
if (typeof window !== 'undefined' && sdkIpc) {
    const ipc = sdkIpc
    const legacy = localStorage.getItem('workspace-archived-sessions')
    if (legacy) {
        try {
            const ids = JSON.parse(legacy) as string[]
            void Promise.all(ids.map(id => ipc.session.archive(id)))
                .then(() => {
                    localStorage.removeItem('workspace-archived-sessions')
                })
        } catch {
            localStorage.removeItem('workspace-archived-sessions')
        }
    }
}

if (typeof window !== 'undefined') {
    window.addEventListener('focus', () => {
        void useStore.getState().sync()
    })
}
