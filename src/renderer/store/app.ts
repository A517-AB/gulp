import {create} from 'zustand'
import type {SessionConfig, SessionCursor, SessionResource, Source} from '@jules'
import {jules} from '@jules'
import type {JulesParsedFile} from '@shared/jules-ipc'
import {listSessions, triggerSync} from '@/lib/jules-client.ts'

export interface AppStore {
    sources: Source[]
    sourcesLoaded: boolean
    sessions: SessionResource[]
    sessionsLoaded: boolean
    archivedSessionIds: string[]
    drafts: Record<string, string>
    selectedSession: SessionResource | null
    sessionCursor: SessionCursor | null

    sync: () => Promise<void>
    loadSessions: () => Promise<void>
    refreshSessions: () => Promise<void>
    startSession?: (config: SessionConfig) => Promise<SessionResource>
    parseUnidiff: (patch?: string | null) => Promise<JulesParsedFile[]>
    saveArtifact: (data: string, filepath: string) => Promise<string>
    applyPatch: (cwd: string, patch: string) => Promise<{ ok: boolean; branch?: string; error?: string }>
    archiveSessions: (id: string) => void
    setDraft: (sessionId: string, text: string) => void
    setSelectedSession: (session: SessionResource | null) => void
}

export const useStore = create<AppStore>((set, get) => ({
    sources: [],
    sourcesLoaded: false,
    sessions: [],
    sessionsLoaded: false,
    archivedSessionIds: [],
    drafts: {},
    selectedSession: null,
    sessionCursor: null,

    sync: async () => {
        const sources: Source[] = []
        for await (const source of jules.sources()) sources.push(source)
        set({sources, sourcesLoaded: true})
    },

    // Local cache read (select) — instant, no network.
    loadSessions: async () => {
        const sessions = await listSessions()
        set({sessions, sessionsLoaded: true})
    },

    // Network sync (write-through to disk cache), then re-reads the local cache.
    refreshSessions: async () => {
        await triggerSync()
        await get().loadSessions()
    },

    parseUnidiff: async (patch) => {
        if (!patch) return []
        return (await window.jules?.git.parseUnidiff(patch)) ?? []
    },

    saveArtifact: async (data, filepath) => {
        const result = await window.jules?.artifact.save(data, filepath)
        if (!result) throw new Error('jules not available')
        return result
    },

    applyPatch: async (cwd, patch) => {
        return (await window.jules?.git.applyPatch(cwd, patch)) ?? {ok: false, error: 'jules not available'}
    },

    archiveSessions: (id) => {
        set(s => ({archivedSessionIds: [...s.archivedSessionIds, id]}))
    },

    setDraft: (sessionId, text) => {
        set(s => ({drafts: {...s.drafts, [sessionId]: text}}))
    },

    setSelectedSession: (session) => {
        console.log('[store] selectedSession:', session?.id ?? null)
        set({selectedSession: session})
    },
}))
