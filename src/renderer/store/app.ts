import {create} from 'zustand'
import type {Activity, ParsedFile, SerializedSnapshot, SessionConfig, SessionResource, Source} from '@jules'
import {filesystem, sdkIpc, store, uiNotification} from '@shared/bridge'

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
let sessionsStreaming = false
let syncInProgress = false
let lastSyncAt = 0
const SYNC_COOLDOWN_MS = 5 * 60 * 1000

const DEFAULT_FORM: SessionFormData = {
    sourceId: '',
    title: '',
    prompt: '',
    startingBranch: '',
    autoCreatePr: false,
    interactive: false,
}

export interface AppStore {
    sessions: SessionResource[]
    initSessions: () => void
    removeSession: (id: string) => void

    activities: Record<string, Activity[]>
    activitySummaries: Record<string, Record<string, string>>
    activitiesError: Record<string, string | null>

    sources: Source[]
    sourcesLoaded: boolean
    newSessionForm: SessionFormData
    setNewSessionForm: (patch: Partial<SessionFormData>) => void
    resetNewSessionForm: () => void
    loadSources: () => Promise<void>

    sync: () => Promise<void>

    loadActivities: (sessionId: string) => Promise<void>
    streamActivities: (sessionId: string) => () => void
    sendMessage: (sessionId: string, content: string) => Promise<void>
    approvePlan: (sessionId: string) => Promise<void>
    archiveSessions: (ids: string[]) => Promise<void>

    runSession: (config: SessionConfig) => Promise<void>
    createSession: (config: SessionConfig) => Promise<void>
    sessionSnapshot: (sessionId: string) => Promise<SerializedSnapshot>
    hydrateSession: (sessionId: string) => Promise<number>
    selectSessionActivities: (sessionId: string) => Promise<Activity[]>
    subscribeActivity: (sessionId: string, cb: (a: Activity) => void) => () => void
    parseUnidiff: (patch?: string | null) => Promise<ParsedFile[]>
    saveArtifact: (data: string, filepath: string) => Promise<string>
    applyPatch: (sessionId: string, effectiveSourceId?: string) => Promise<{success: boolean; branch?: string; error?: string}>
}

export const useStore = create<AppStore>((set, get) => ({
    sessions: [],
    initSessions: () => {
        if (sessionsStreaming || !sdkIpc) return
        sessionsStreaming = true
        sdkIpc.client.streamSessions((item) => {
            set(s => {
                const idx = s.sessions.findIndex(x => x.id === item.id)
                if (idx >= 0) {
                    const next = [...s.sessions];
                    next[idx] = item;
                    return {sessions: next}
                }
                return {sessions: [...s.sessions, item]}
            })
        })
    },
    removeSession: (id) => set(s => ({sessions: s.sessions.filter(x => x.id !== id)})),

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

    sync: async () => {
        const now = Date.now()
        if (!sdkIpc || syncInProgress || now - lastSyncAt < SYNC_COOLDOWN_MS) return
        syncInProgress = true
        lastSyncAt = now
        try {
            await sdkIpc.client.sync()
        } catch (err) {
            const msg = err instanceof Error ? err.message : String(err)
            if (msg.includes('SyncInProgress')) return
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
            let activities = await ipc.activities.select(sessionId)
            if (activities.length === 0) {
                await ipc.activities.hydrate(sessionId)
                activities = await ipc.activities.select(sessionId)
            }
            console.log(`[store] select done ${sessionId} — ${activities.length} activities`)
            set(state => {
                const seen = new Set<string>()
                const deduped = activities.filter(a => {
                    if (seen.has(a.id)) return false;
                    seen.add(a.id);
                    return true
                })
                return {activities: {...state.activities, [sessionId]: deduped}}
            })
        } catch (err) {
            const is404 = err instanceof Error && err.message.includes('404')
            if (is404) {
                console.warn(`[store] session not found ${sessionId} (404) — treating as empty`)
                set(state => ({
                    activities: {...state.activities, [sessionId]: []},
                    activitiesError: {...state.activitiesError, [sessionId]: null},
                }))
                return
            }
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
            if (activity.type === 'sessionCompleted' || activity.type === 'sessionFailed') {
                console.log(`[store] session terminal ${activity.type} ${sessionId}`)
                if (activity.type === 'sessionCompleted') {
                    uiNotification?.show({
                        title: 'Jules done',
                        body: 'Session',
                        type: 'success',
                        sound: 'chime',
                        id: `jules-done-${sessionId}`
                    })
                } else {
                    uiNotification?.show({
                        title: 'Jules failed',
                        body: 'Session',
                        type: 'error',
                        sound: 'pulse',
                        id: `jules-failed-${sessionId}`
                    })
                }
            }
        }, () => {
            console.log(`[store] stream closed ${sessionId}`)
            activeStreams.delete(sessionId)
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

    archiveSessions: async (ids) => {
        const ipc = sdkIpc
        if (!ipc) return
        await Promise.all(ids.map(id => ipc.session.archive(id)))
    },

    runSession: async (config) => {
        if (!sdkIpc) return
        await sdkIpc.client.run(config)
    },

    createSession: async (config) => {
        if (!sdkIpc) return
        await sdkIpc.session.create(config)
    },



    sessionSnapshot: async (sessionId) => {
        if (!sdkIpc) throw new Error('SDK not available')
        return sdkIpc.session.snapshot(sessionId)
    },

    hydrateSession: async (sessionId) => {
        if (!sdkIpc) return 0
        return sdkIpc.activities.hydrate(sessionId)
    },

    selectSessionActivities: async (sessionId) => {
        if (!sdkIpc) return []
        return sdkIpc.activities.select(sessionId)
    },

    subscribeActivity: (sessionId, cb) => {
        if (!sdkIpc) return () => { /* no-op */ }
        return sdkIpc.activities.updates(sessionId, cb)
    },

    parseUnidiff: async (patch) => {
        if (!sdkIpc || !patch) return []
        return sdkIpc.artifact.parseUnidiff(patch)
    },

    saveArtifact: async (data, filepath) => {
        if (!sdkIpc) throw new Error('SDK not available')
        return sdkIpc.artifact.save(data, filepath)
    },

    applyPatch: async (sessionId, effectiveSourceId) => {
        if (!sdkIpc || !filesystem) return {success: false, error: 'not available'}
        let cwd: string | null = null
        if (effectiveSourceId && store) {
            const stored = await store.get(`ship.repoPaths.${effectiveSourceId}`)
            if (typeof stored === 'string' && stored) cwd = stored
        }
        if (!cwd) {
            cwd = await filesystem.showOpenDialog()
            if (!cwd) return {success: false, error: 'cancelled'}
            if (effectiveSourceId && store) {
                await store.set(`ship.repoPaths.${effectiveSourceId}`, cwd)
            }
        }
        return sdkIpc.session.applyPatch(sessionId, {cwd})
    },
}))


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


