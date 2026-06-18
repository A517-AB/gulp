import {create} from 'zustand'
import type {Activity, SessionResource, SerializedSnapshot, SessionConfig, Source, ParsedFile} from '@jules'
import {sdkIpc, filesystem, store} from '@shared/bridge'

export interface SessionFormData {
    sourceId: string
    title: string
    prompt: string
    startingBranch: string
    autoCreatePr: boolean
    interactive: boolean
}

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
    sessionList: SessionResource[]

    sources: Source[]
    sourcesLoaded: boolean
    newSessionForm: SessionFormData
    setNewSessionForm: (patch: Partial<SessionFormData>) => void
    resetNewSessionForm: () => void
    loadSources: () => Promise<void>

    loadSessions: () => Promise<void>
    sync: () => Promise<void>

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

if (typeof window !== 'undefined' && sdkIpc) {
    const ipc = sdkIpc
    // Start global session stream to keep all lists instantly up-to-date
    ipc.client.streamSessions(
        (session) => {
            useStore.setState(s => {
                const idx = s.sessionList.findIndex(x => x.id === session.id)
                if (idx >= 0) {
                    const next = [...s.sessionList]
                    next[idx] = session
                    // Sort descending by create time
                    next.sort((a, b) => new Date(b.createTime).getTime() - new Date(a.createTime).getTime())
                    return { sessionList: next }
                }
                return { sessionList: [session, ...s.sessionList] }
            })
        },
        () => {
            console.log('[store] streamSessions done (this is unusual if unexpected)')
        }
    )

    // migrate localStorage-archived sessions to SDK, once
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

