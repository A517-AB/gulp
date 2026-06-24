import {create} from 'zustand'
import type {Activity, SessionResource, SerializedSnapshot, SessionConfig, Source, ParsedFile} from '@jules'
import {sdkIpc, filesystem, store, uiNotification} from '@shared/bridge'

const activeStreams = new Map<string, () => void>()
const loadedSessions = new Set<string>()
let syncInProgress = false
let lastSyncAt = 0
const SYNC_COOLDOWN_MS = 5 * 60 * 1000

export interface AppStore {
    sessionList: SessionResource[]
    activities: Record<string, Activity[]>
    activitySummaries: Record<string, Record<string, string>>
    activitiesError: Record<string, string | null>

    sources: Source[]
    sourcesLoaded: boolean
    loadSources: () => Promise<void>

    loadSessions: () => Promise<void>
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
    sessionList: [],
    activities: {},
    activitySummaries: {},
    activitiesError: {},

    sources: [],
    sourcesLoaded: false,

    loadSources: async () => {
        if (!sdkIpc || get().sourcesLoaded) return
        try {
            const data = await sdkIpc.sources.list()
            set({ sources: data, sourcesLoaded: true })
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
        const now = Date.now()
        if (!sdkIpc || syncInProgress || now - lastSyncAt < SYNC_COOLDOWN_MS) return
        syncInProgress = true
        lastSyncAt = now
        try {
            await sdkIpc.client.sync()
            await get().loadSessions()
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
                // streamed wins on conflict — stream() delivers live updates; select() is a point-in-time snapshot
                const streamedById = new Map(streamed.map(a => [a.id, a]))
                const merged = deduped.map(a => streamedById.get(a.id) ?? a)
                for (const a of streamed) {
                    if (!deduped.some(d => d.id === a.id)) merged.push(a)
                }
                console.log(`[store] merged ${merged.length} activities (${streamed.length} streamed, ${deduped.length} loaded)`)
                return {activities: {...state.activities, [sessionId]: merged}}
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
        const unsub = ipc.activities.stream(sessionId, (activity) => {
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
                const session = get().sessionList.find(s => s.id === sessionId)
                const title   = session?.title ?? 'Session'
                if (activity.type === 'sessionCompleted') {
                    uiNotification?.show({ title: 'Jules done', body: title, type: 'success', sound: 'chime', id: `jules-done-${sessionId}` })
                } else {
                    uiNotification?.show({ title: 'Jules failed', body: title, type: 'error', sound: 'pulse', id: `jules-failed-${sessionId}` })
                }
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
        await get().loadSessions()
    },

    runSession: async (config) => {
        if (!sdkIpc) return
        await sdkIpc.client.run(config)
        await get().loadSessions()
    },

    createSession: async (config) => {
        if (!sdkIpc) return
        await sdkIpc.session.create(config)
        await get().loadSessions()
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

