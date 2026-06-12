import type {IpcRendererEvent} from 'electron'
import {ipcRenderer} from 'electron'
import type {SdkIpc} from '@/jules/sdk-ipc'

type Unsubscribe = () => void

function onStream(
    itemCh: string,
    doneCh: string,
    onItem: (item: unknown) => void,
    onDone?: () => void,
): Unsubscribe {
    const onItemEv = (_: IpcRendererEvent, item: unknown) => { onItem(item) }
    const onDoneEv = () => {
        ipcRenderer.removeListener(itemCh, onItemEv)
        onDone?.()
    }
    ipcRenderer.on(itemCh, onItemEv)
    ipcRenderer.once(doneCh, onDoneEv)
    return () => {
        ipcRenderer.removeListener(itemCh, onItemEv)
        ipcRenderer.removeListener(doneCh, onDoneEv)
    }
}

// ── sdk bridge ────────────────────────────────────────────────────────────────

export const sdk: SdkIpc = {

    client: {
        sessions: (options?) => ipcRenderer.invoke('sdk:client.sessions', options),
        streamSessions: (onItem, onDone?, options?) => {
            ipcRenderer.invoke('sdk:client.sessions.stream.start', options).catch(console.error)
            return onStream('sdk:client.sessions.item', 'sdk:client.sessions.done', onItem as (item: unknown) => void, onDone)
        },
        sync: (options?) => ipcRenderer.invoke('sdk:client.sync', options),
        onSyncProgress: (cb) => {
            const handler = (_: IpcRendererEvent, p: Parameters<typeof cb>[0]) => { cb(p) }
            ipcRenderer.on('sdk:client.sync.progress', handler)
            return () => ipcRenderer.removeListener('sdk:client.sync.progress', handler)
        },
        select: (query) => ipcRenderer.invoke('sdk:client.select', query),
        getSessionResource: (id) => ipcRenderer.invoke('sdk:client.getSessionResource', id),
        run: (config) => ipcRenderer.invoke('sdk:client.run', config),
        with: (options) => ipcRenderer.invoke('sdk:client.with', options),
        all: (configs, options?) => ipcRenderer.invoke('sdk:client.all', configs, options),
    },

    session: {
        create: (config) => ipcRenderer.invoke('sdk:session.create', config),
        send: (id, prompt) => ipcRenderer.invoke('sdk:session.send', id, prompt),
        ask: (id, prompt) => ipcRenderer.invoke('sdk:session.ask', id, prompt),
        approve: (id) => ipcRenderer.invoke('sdk:session.approve', id),
        info: (id) => ipcRenderer.invoke('sdk:session.info', id),
        result: (id) => ipcRenderer.invoke('sdk:session.result', id),
        waitFor: (id, state) => ipcRenderer.invoke('sdk:session.waitFor', id, state),
        snapshot: (id, options?) => ipcRenderer.invoke('sdk:session.snapshot', id, options),
        archive: (id) => ipcRenderer.invoke('sdk:session.archive', id),
        unarchive: (id) => ipcRenderer.invoke('sdk:session.unarchive', id),
        select: (id, options?) => ipcRenderer.invoke('sdk:session.select', id, options),
        hydrate: (id) => ipcRenderer.invoke('sdk:session.hydrate', id),
        applyPatch: (id, options) => ipcRenderer.invoke('sdk:session.applyPatch', id, options),
        stream: (id, onItem, onDone?, options?) => {
            ipcRenderer.invoke('sdk:session.stream.start', id, options).catch(console.error)
            return onStream(`sdk:session.stream:${id}`, `sdk:session.stream.done:${id}`, onItem as (item: unknown) => void, onDone)
        },
        history: (id, onItem, onDone?) => {
            ipcRenderer.invoke('sdk:session.history.start', id).catch(console.error)
            return onStream(`sdk:session.history:${id}`, `sdk:session.history.done:${id}`, onItem as (item: unknown) => void, onDone)
        },
        updates: (id, onItem, onDone?) => {
            ipcRenderer.invoke('sdk:session.updates.start', id).catch(console.error)
            return onStream(`sdk:session.updates:${id}`, `sdk:session.updates.done:${id}`, onItem as (item: unknown) => void, onDone)
        },
    },

    activities: {
        hydrate: (id) => ipcRenderer.invoke('sdk:activities.hydrate', id),
        select: (id, options?) => ipcRenderer.invoke('sdk:activities.select', id, options),
        list: (id, options?) => ipcRenderer.invoke('sdk:activities.list', id, options),
        get: (id, activityId) => ipcRenderer.invoke('sdk:activities.get', id, activityId),
        history: (id, onItem, onDone?) => {
            ipcRenderer.invoke('sdk:activities.history.start', id).catch(console.error)
            return onStream(`sdk:activities.history:${id}`, `sdk:activities.history.done:${id}`, onItem as (item: unknown) => void, onDone)
        },
        updates: (id, onItem, onDone?) => {
            ipcRenderer.invoke('sdk:activities.updates.start', id).catch(console.error)
            return onStream(`sdk:activities.updates:${id}`, `sdk:activities.updates.done:${id}`, onItem as (item: unknown) => void, onDone)
        },
        stream: (id, onItem, onDone?) => {
            ipcRenderer.invoke('sdk:activities.stream.start', id).catch(console.error)
            return onStream(`sdk:activities.stream:${id}`, `sdk:activities.stream.done:${id}`, onItem as (item: unknown) => void, onDone)
        },
    },

    sources: {
        list: () => ipcRenderer.invoke('sdk:sources.list'),
        get: (filter) => ipcRenderer.invoke('sdk:sources.get', filter),
        resolve: (cwd?) => ipcRenderer.invoke('sdk:sources.resolve', cwd),
    },

    artifact: {
        save: (data, filepath) => ipcRenderer.invoke('sdk:artifact.save', data, filepath),
        parseUnidiff: (patch?) => ipcRenderer.invoke('sdk:artifact.parseUnidiff', patch),
    },

    util: {
        toSummary: (activity) => ipcRenderer.invoke('sdk:util.toSummary', activity),
        toSummaries: (activities) => ipcRenderer.invoke('sdk:util.toSummaries', activities),
    },

    query: {
        validate: (query) => ipcRenderer.invoke('sdk:query.validate', query),
        format: (result) => ipcRenderer.invoke('sdk:query.format', result),
        schema: (domain) => ipcRenderer.invoke('sdk:query.schema', domain),
        schemas: () => ipcRenderer.invoke('sdk:query.schemas'),
        typeDef: (domain) => ipcRenderer.invoke('sdk:query.typeDef', domain),
        markdownDocs: () => ipcRenderer.invoke('sdk:query.markdownDocs'),
    },
}
