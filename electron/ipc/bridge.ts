import type { IpcRendererEvent } from 'electron';
import { ipcRenderer } from 'electron'
import type {
    SessionResource,
    SessionConfig,
    SessionState,
    SerializedSnapshot,
    Activity,
    ActivityAgentMessaged,
    Source,
    JulesOptions,
    JulesQuery,
    JulesDomain,
    ListSessionsOptions,
    JulesClient,
    SessionClient,
    Outcome,
} from '@google/jules-sdk'

type Unsubscribe = () => void

type _SyncOpts = NonNullable<Parameters<JulesClient['sync']>[0]>
type SyncStats = Awaited<ReturnType<JulesClient['sync']>>
type SyncProgress = Parameters<NonNullable<_SyncOpts['onProgress']>>[0]
type SyncOptions = Omit<_SyncOpts, 'onProgress' | 'signal'>
type SelectOptions = Parameters<SessionClient['activities']['select']>[0]
type ListOptions = Parameters<SessionClient['activities']['list']>[0]
type StreamActivitiesOptions = Parameters<SessionClient['stream']>[0]
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

        run: (config: SessionConfig): Promise<Pick<Awaited<ReturnType<JulesClient['run']>>, 'id'>> =>
            ipcRenderer.invoke('sdk:client.run', config),

        with: (options: JulesOptions): Promise<void> =>
            ipcRenderer.invoke('sdk:client.with', options),
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
        get: (filter: { github: string }): Promise<Source | undefined> =>
            ipcRenderer.invoke('sdk:sources.get', filter),
    },

    // ── artifact ──────────────────────────────────────────────────────────────────

    artifact: {
        save: (data: string, filepath: string): Promise<string> =>
            ipcRenderer.invoke('sdk:artifact.save', data, filepath),
    },
}

export type SdkIpc = typeof sdk