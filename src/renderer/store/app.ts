import {create} from 'zustand'
import type {Activity, SessionResource, SerializedSnapshot, SessionConfig, ParsedFile, Source} from '@jules'
import {sdkIpc, filesystem, store} from '@shared/bridge'

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
    archiveSessions: (ids: string[]) => Promise<void>

    runSession: (config: SessionConfig) => Promise<void>
    createSession: (config: SessionConfig) => Promise<void>
    applyPatch: (sessionId: string, effectiveSourceId?: string) => Promise<{success: boolean; branch?: string; error?: string}>
    saveArtifact: (data: string, savePath: string) => Promise<void>
    saveFilePatch: (sessionId: string, filePath: string, patch: string) => Promise<void>
    downloadMedia: (data: string, defaultName: string) => Promise<boolean>
    sessionSnapshot: (sessionId: string) => Promise<SerializedSnapshot>
    hydrateSession: (sessionId: string) => Promise<number>
    selectSessionActivities: (sessionId: string) => Promise<Activity[]>
    subscribeActivity: (sessionId: string, cb: (a: Activity) => void) => () => void
    loadSessionPatch: (sessionId: string) => Promise<{files: ParsedFile[]; patch: string} | null>
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
            const is404 = err instanceof Error && err.message.includes('404')
            if (!is404) loadedSessions.delete(sessionId)
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

    saveArtifact: async (data, savePath) => {
        if (!sdkIpc) return
        await sdkIpc.artifact.save(data, savePath)
    },

    saveFilePatch: async (_sessionId, filePath, patch) => {
        if (!sdkIpc || !filesystem) return
        const name = filePath.split('/').pop() ?? 'file'
        const savePath = await filesystem.showSaveDialog(`${name}.patch`)
        if (!savePath) return

        const sections = patch.split(/(?=^diff --git )/m).filter(Boolean)
        const filePatch = sections.find(s => s.includes(`b/${filePath}`) || s.includes(`/${filePath}`)) ?? patch

        const bytes = new TextEncoder().encode(filePatch)
        let binary = ""
        for (let i = 0; i < bytes.length; i += 8192) {
            binary += String.fromCharCode(...bytes.subarray(i, Math.min(i + 8192, bytes.length)))
        }
        const base64Patch = btoa(binary)

        await sdkIpc.artifact.save(base64Patch, savePath)
    },

    downloadMedia: async (data, defaultName) => {
        if (!filesystem || !sdkIpc) return false
        const savePath = await filesystem.showSaveDialog(defaultName)
        if (!savePath) return false
        await sdkIpc.artifact.save(data, savePath)
        return true
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

    loadSessionPatch: async (sessionId) => {
        if (!sdkIpc) return null
        const ipc = sdkIpc
        try {
            await ipc.activities.hydrate(sessionId)
            const activities = await ipc.activities.select(sessionId)
            let patch: string | null = null
            outer: for (const act of [...activities].reverse()) {
                for (const art of [...act.artifacts].reverse()) {
                    if (art.type === 'changeSet' && art.gitPatch.unidiffPatch) {
                        patch = art.gitPatch.unidiffPatch
                        break outer
                    }
                }
            }
            if (!patch) return null
            const files = await ipc.artifact.parseUnidiff(patch)
            return {files, patch}
        } catch {
            return null
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
