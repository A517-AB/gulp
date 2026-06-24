import {create} from 'zustand'
import type {SessionConfig, SessionResource, Source} from '@jules'
import type {JulesParsedFile} from '@shared/jules-ipc'

export interface AppStore {
    sources: Source[]
    sourcesLoaded: boolean
    archivedSessionIds: string[]

    startSession?: (config: SessionConfig) => Promise<SessionResource>
    parseUnidiff: (patch?: string | null) => Promise<JulesParsedFile[]>
    saveArtifact: (data: string, filepath: string) => Promise<string>
    applyPatch: (cwd: string, patch: string) => Promise<{ ok: boolean; branch?: string; error?: string }>
    archiveSessions: (id: string) => void
}

export const useStore = create<AppStore>((set) => ({
    sources: [],
    sourcesLoaded: false,
    archivedSessionIds: [],

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
}))
