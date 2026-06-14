import {create} from 'zustand'
import type {Activity, SessionResource, Source} from '@jules'
import {sdkIpc} from '@shared/bridge'

export interface SessionFormData {
    sourceId: string
    title: string
    prompt: string
    startingBranch: string
    autoCreatePr: boolean
    interactive: boolean
}

const activeStreams = new Map<string, () => void>()
const loadedSessions = new Set<string>()
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
            if (err instanceof Error && err.constructor.name === 'SyncInProgressError') return
            console.error('[AppStore] sync error:', err)
        } finally {
            syncInProgress = false
        }
    },

    loadActivities: async (sessionId) => {
        if (!sdkIpc || loadedSessions.has(sessionId)) return
        loadedSessions.add(sessionId)
        const ipc = sdkIpc
        console.log(`[store] loadActivities start ${sessionId}`)
        set(state => ({activitiesError: {...state.activitiesError, [sessionId]: null}}))
        try {
            await ipc.activities.hydrate(sessionId)
            console.log(`[store] hydrate done ${sessionId}`)
            const activities = await ipc.activities.select(sessionId)
            console.log(`[store] select done ${sessionId} — ${activities.length} activities`)
            set(state => {
                const seen = new Set<string>()
                const deduped = activities.filter(a => {
                    if (seen.has(a.id)) return false;
                    seen.add(a.id);
                    return true
                })
                const streamed = state.activities[sessionId] ?? []
                const merged = [...deduped]
                for (const a of streamed) {
                    if (!merged.some(m => m.id === a.id)) merged.push(a)
                }
                console.log(`[store] merged ${merged.length} activities (${streamed.length} streamed, ${deduped.length} loaded)`)
                return {activities: {...state.activities, [sessionId]: merged}}
            })
            const latest = activities.at(-1)
            if (latest) {
                void ipc.util.toSummary(latest).then(s => {
                    set(state => ({
                        activitySummaries: {
                            ...state.activitySummaries,
                            [sessionId]: {...(state.activitySummaries[sessionId] ?? {}), [s.id]: s.summary},
                        },
                    }))
                })
            }
        } catch (err) {
            loadedSessions.delete(sessionId)
            console.error(`[store] loadActivities failed ${sessionId}:`, err)
            set(state => ({
                activitiesError: {
                    ...state.activitiesError,
                    [sessionId]: err instanceof Error ? err.message : 'Failed to load activities'
                },
            }))
        }
    },

    streamActivities: (sessionId) => {
        if (activeStreams.has(sessionId) || !sdkIpc) {
            console.log(`[store] streamActivities skip ${sessionId} — already streaming or no IPC`)
            return () => { /* no-op */
            }
        }
        console.log(`[store] streamActivities start ${sessionId}`)
        const ipc = sdkIpc
        const unsub = ipc.activities.updates(sessionId, (activity) => {
            console.log(`[store] activity update ${sessionId} type=${activity.type} id=${activity.id}`)
            set(s => {
                const existing = s.activities[sessionId] ?? []
                const index = existing.findIndex(a => a.id === activity.id)
                if (index >= 0) {
                    const next = [...existing]
                    next[index] = activity
                    return {activities: {...s.activities, [sessionId]: next}}
                }
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
                console.log(`[store] session terminal ${activity.type} ${sessionId}`)
                void get().loadSessions()
            }
        }, () => {
            console.log(`[store] stream closed ${sessionId}`)
            activeStreams.delete(sessionId)
            void get().loadSessions()
        })
        activeStreams.set(sessionId, unsub)
        return () => {
            console.log(`[store] streamActivities unsub ${sessionId}`)
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
