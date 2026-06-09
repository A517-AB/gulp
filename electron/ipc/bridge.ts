import type {IpcRendererEvent} from 'electron';
import {ipcRenderer} from 'electron'
import type {
    Activity,
    ActivityAgentMessaged,
    ActivitySummary,
    DomainSchema,
    JulesDomain,
    JulesOptions,
    JulesQuery,
    ListSessionsOptions,
    Outcome,
    ParsedFile,
    SerializedSnapshot,
    SessionConfig,
    SessionResource,
    SessionState,
    Source,
    ValidationResult,
} from '@google/jules-sdk'
import type {
    SelectOptions,
    StreamActivitiesOptions,
    SyncOptions as SdkSyncOptions,
    SyncProgress,
    SyncStats
} from '@google/jules-sdk/types'

interface ListOptions {
    pageSize?: number;
    pageToken?: string;
    filter?: string
}

type Unsubscribe = () => void
type SyncOptions = Omit<SdkSyncOptions, 'onProgress' | 'signal'>
type IpcSessionOutcome = Omit<Outcome, 'generatedFiles' | 'changeSet'>

// ── stream helper ─────────────────────────────────────────────────────────────

function onStream<T>(
    itemChannel: string,
    doneChannel: string,
    onItem: (item: T) => void,
    onDone?: () => void,
): Unsubscribe {
    const itemHandler = (_: IpcRendererEvent, item: T) => onItem(item)
    const doneHandler = () => {
        ipcRenderer.removeListener(itemChannel, itemHandler)
        onDone?.()
    }
    ipcRenderer.on(itemChannel, itemHandler)
    ipcRenderer.once(doneChannel, doneHandler)
    return () => {
        ipcRenderer.removeListener(itemChannel, itemHandler)
        ipcRenderer.removeListener(doneChannel, doneHandler)
    }
}

// ── sdk bridge ────────────────────────────────────────────────────────────────

export const sdk = {

    // ── client ──────────────────────────────────────────────────────────────────

    client: {
        sessions: (options?: ListSessionsOptions): Promise<SessionResource[]> =>
            ipcRenderer.invoke('sdk:client.sessions', options),

        streamSessions: (onItem: (item: SessionResource) => void, onDone?: () => void, options?: ListSessionsOptions): Unsubscribe => {
            ipcRenderer.invoke('sdk:client.sessions.stream.start', options).catch(console.error)
            return onStream('sdk:client.sessions.item', 'sdk:client.sessions.done', onItem, onDone)
        },

        sync: (options?: SyncOptions): Promise<SyncStats> =>
            ipcRenderer.invoke('sdk:client.sync', options),

        onSyncProgress: (cb: (p: SyncProgress) => void): Unsubscribe => {
            const handler = (_: IpcRendererEvent, p: SyncProgress) => cb(p)
            ipcRenderer.on('sdk:client.sync.progress', handler)
            return () => ipcRenderer.removeListener('sdk:client.sync.progress', handler)
        },

        select: <T extends JulesDomain>(query: JulesQuery<T>): Promise<(T extends 'sessions' ? SessionResource : Activity)[]> =>
            ipcRenderer.invoke('sdk:client.select', query),

        getSessionResource: (id: string): Promise<SessionResource> =>
            ipcRenderer.invoke('sdk:client.getSessionResource', id),

        run: (config: SessionConfig): Promise<{ id: string }> =>
            ipcRenderer.invoke('sdk:client.run', config),

        with: (options: JulesOptions): Promise<void> =>
            ipcRenderer.invoke('sdk:client.with', options),

        all: (configs: SessionConfig[], options?: {
            concurrency?: number;
            stopOnError?: boolean;
            delayMs?: number
        }): Promise<{ id: string }[]> =>
            ipcRenderer.invoke('sdk:client.all', configs, options),
    },

    // ── session ──────────────────────────────────────────────────────────────────

    session: {
        send: (id: string, prompt: string): Promise<void> =>
            ipcRenderer.invoke('sdk:session.send', id, prompt),

        ask: (id: string, prompt: string): Promise<ActivityAgentMessaged> =>
            ipcRenderer.invoke('sdk:session.ask', id, prompt),

        approve: (id: string): Promise<void> =>
            ipcRenderer.invoke('sdk:session.approve', id),

        info: (id: string): Promise<SessionResource> =>
            ipcRenderer.invoke('sdk:session.info', id),

        result: (id: string): Promise<IpcSessionOutcome> =>
            ipcRenderer.invoke('sdk:session.result', id),

        waitFor: (id: string, state: SessionState): Promise<void> =>
            ipcRenderer.invoke('sdk:session.waitFor', id, state),

        snapshot: (id: string, options?: { activities?: boolean }): Promise<SerializedSnapshot> =>
            ipcRenderer.invoke('sdk:session.snapshot', id, options),

        archive: (id: string): Promise<void> =>
            ipcRenderer.invoke('sdk:session.archive', id),

        unarchive: (id: string): Promise<void> =>
            ipcRenderer.invoke('sdk:session.unarchive', id),

        select: (id: string, options?: SelectOptions): Promise<Activity[]> =>
            ipcRenderer.invoke('sdk:session.select', id, options),

        hydrate: (id: string): Promise<number> =>
            ipcRenderer.invoke('sdk:session.hydrate', id),

        applyPatch: (id: string, options: { cwd: string }): Promise<{ success: boolean; branch?: string; error?: string }> =>
            ipcRenderer.invoke('sdk:session.applyPatch', id, options),

        stream: (id: string, onItem: (item: Activity) => void, onDone?: () => void, options?: StreamActivitiesOptions): Unsubscribe => {
            ipcRenderer.invoke('sdk:session.stream.start', id, options).catch(console.error)
            return onStream(`sdk:session.stream:${id}`, `sdk:session.stream.done:${id}`, onItem, onDone)
        },

        history: (id: string, onItem: (item: Activity) => void, onDone?: () => void): Unsubscribe => {
            ipcRenderer.invoke('sdk:session.history.start', id).catch(console.error)
            return onStream(`sdk:session.history:${id}`, `sdk:session.history.done:${id}`, onItem, onDone)
        },

        updates: (id: string, onItem: (item: Activity) => void, onDone?: () => void): Unsubscribe => {
            ipcRenderer.invoke('sdk:session.updates.start', id).catch(console.error)
            return onStream(`sdk:session.updates:${id}`, `sdk:session.updates.done:${id}`, onItem, onDone)
        },
    },

    // ── activities ────────────────────────────────────────────────────────────────

    activities: {
        hydrate: (id: string): Promise<number> =>
            ipcRenderer.invoke('sdk:activities.hydrate', id),

        select: (id: string, options?: SelectOptions): Promise<Activity[]> =>
            ipcRenderer.invoke('sdk:activities.select', id, options),

        list: (id: string, options?: ListOptions): Promise<{ activities: Activity[]; nextPageToken?: string }> =>
            ipcRenderer.invoke('sdk:activities.list', id, options),

        get: (id: string, activityId: string): Promise<Activity> =>
            ipcRenderer.invoke('sdk:activities.get', id, activityId),

        history: (id: string, onItem: (item: Activity) => void, onDone?: () => void): Unsubscribe => {
            ipcRenderer.invoke('sdk:activities.history.start', id).catch(console.error)
            return onStream(`sdk:activities.history:${id}`, `sdk:activities.history.done:${id}`, onItem, onDone)
        },

        updates: (id: string, onItem: (item: Activity) => void, onDone?: () => void): Unsubscribe => {
            ipcRenderer.invoke('sdk:activities.updates.start', id).catch(console.error)
            return onStream(`sdk:activities.updates:${id}`, `sdk:activities.updates.done:${id}`, onItem, onDone)
        },

        stream: (id: string, onItem: (item: Activity) => void, onDone?: () => void): Unsubscribe => {
            ipcRenderer.invoke('sdk:activities.stream.start', id).catch(console.error)
            return onStream(`sdk:activities.stream:${id}`, `sdk:activities.stream.done:${id}`, onItem, onDone)
        },
    },
    // ── sources ───────────────────────────────────────────────────────────────────

    sources: {
        list: (): Promise<Source[]> =>
            ipcRenderer.invoke('sdk:sources.list'),

        get: (filter: { github: string }): Promise<Source | undefined> =>
            ipcRenderer.invoke('sdk:sources.get', filter),

        resolve: (cwd?: string): Promise<{ github: string | null; baseBranch: string }> =>
            ipcRenderer.invoke('sdk:sources.resolve', cwd),
    },

    // ── artifact ──────────────────────────────────────────────────────────────────

    artifact: {
        save: (data: string, filepath: string): Promise<string> =>
            ipcRenderer.invoke('sdk:artifact.save', data, filepath),

        parseUnidiff: (patch?: string | null): Promise<ParsedFile[]> =>
            ipcRenderer.invoke('sdk:artifact.parseUnidiff', patch),
    },

    // ── util ──────────────────────────────────────────────────────────────────────

    util: {
        toSummary: (activity: Activity): Promise<ActivitySummary> =>
            ipcRenderer.invoke('sdk:util.toSummary', activity),
    },

    // ── query ─────────────────────────────────────────────────────────────────────

    query: {
        validate: (query: unknown): Promise<ValidationResult> =>
            ipcRenderer.invoke('sdk:query.validate', query),

        format: (result: ValidationResult): Promise<string> =>
            ipcRenderer.invoke('sdk:query.format', result),

        schema: (domain: 'sessions' | 'activities'): Promise<DomainSchema> =>
            ipcRenderer.invoke('sdk:query.schema', domain),

        schemas: (): Promise<{ sessions: DomainSchema; activities: DomainSchema }> =>
            ipcRenderer.invoke('sdk:query.schemas'),

        typeDef: (domain: 'sessions' | 'activities'): Promise<string> =>
            ipcRenderer.invoke('sdk:query.typeDef', domain),

        markdownDocs: (): Promise<string> =>
            ipcRenderer.invoke('sdk:query.markdownDocs'),
    },
}

export type SdkIpc = typeof sdk