import type {IpcRendererEvent} from 'electron'
import {ipcRenderer} from 'electron'
import type {SdkIpc} from '@/jules'

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

function invoke<T>(channel: string, ...args: unknown[]): Promise<T> {
    console.log(`[ipc →] ${channel}`, args.length ? args : '')
    const t = performance.now()
    return ipcRenderer.invoke(channel, ...args).then((result: T) => {
        console.log(`[ipc ←] ${channel} (${Math.round(performance.now() - t)}ms)`, result)
        return result
    }).catch((err: unknown) => {
        console.error(`[ipc ✗] ${channel} (${Math.round(performance.now() - t)}ms)`, err)
        throw err
    })
}

function onStreamLogged(
    itemCh: string,
    doneCh: string,
    onItem: (item: unknown) => void,
    onDone?: () => void,
): Unsubscribe {
    let count = 0
    return onStream(itemCh, doneCh, (item) => {
        count++
        console.log(`[ipc stream] ${itemCh} #${count}`, item)
        onItem(item)
    }, () => {
        console.log(`[ipc stream done] ${itemCh} — ${count} items total`)
        onDone?.()
    })
}

export const sdk: SdkIpc = {

    client: {
        sessions: (options?) => invoke('sdk:client.sessions', options),
        streamSessions: (onItem, onDone?, options?) => {
            invoke('sdk:client.sessions.stream.start', options).catch(console.error)
            return onStreamLogged('sdk:client.sessions.item', 'sdk:client.sessions.done', onItem as (item: unknown) => void, onDone)
        },
        sync: (options?) => invoke('sdk:client.sync', options),
        onSyncProgress: (cb) => {
            const handler = (_: IpcRendererEvent, p: Parameters<typeof cb>[0]) => {
                console.log('[ipc sync progress]', p)
                cb(p)
            }
            ipcRenderer.on('sdk:client.sync.progress', handler)
            return () => ipcRenderer.removeListener('sdk:client.sync.progress', handler)
        },
        select: (query) => invoke('sdk:client.select', query),
        getSessionResource: (id) => invoke('sdk:client.getSessionResource', id),
        run: (config) => invoke('sdk:client.run', config),
        with: (options) => invoke('sdk:client.with', options),
        all: (configs, options?) => invoke('sdk:client.all', configs, options),
    },

    session: {
        create: (config) => invoke('sdk:session.create', config),
        send: (id, prompt) => invoke('sdk:session.send', id, prompt),
        ask: (id, prompt) => invoke('sdk:session.ask', id, prompt),
        approve: (id) => invoke('sdk:session.approve', id),
        info: (id) => invoke('sdk:session.info', id),
        result: (id) => invoke('sdk:session.result', id),
        waitFor: (id, state) => invoke('sdk:session.waitFor', id, state),
        snapshot: (id, options?) => invoke('sdk:session.snapshot', id, options),
        archive: (id) => invoke('sdk:session.archive', id),
        unarchive: (id) => invoke('sdk:session.unarchive', id),
        select: (id, options?) => invoke('sdk:session.select', id, options),
        hydrate: (id) => invoke('sdk:session.hydrate', id),
        applyPatch: (id, options) => invoke('sdk:session.applyPatch', id, options),
        stream: (id, onItem, onDone?, options?) => {
            invoke('sdk:session.stream.start', id, options).catch(console.error)
            return onStreamLogged(`sdk:session.stream:${id}`, `sdk:session.stream.done:${id}`, onItem as (item: unknown) => void, onDone)
        },
        history: (id, onItem, onDone?) => {
            invoke('sdk:session.history.start', id).catch(console.error)
            return onStreamLogged(`sdk:session.history:${id}`, `sdk:session.history.done:${id}`, onItem as (item: unknown) => void, onDone)
        },
        updates: (id, onItem, onDone?) => {
            invoke('sdk:session.updates.start', id).catch(console.error)
            return onStreamLogged(`sdk:session.updates:${id}`, `sdk:session.updates.done:${id}`, onItem as (item: unknown) => void, onDone)
        },
    },

    activities: {
        hydrate: (id) => invoke('sdk:activities.hydrate', id),
        select: (id, options?) => invoke('sdk:activities.select', id, options),
        list: (id, options?) => invoke('sdk:activities.list', id, options),
        get: (id, activityId) => invoke('sdk:activities.get', id, activityId),
        history: (id, onItem, onDone?) => {
            invoke('sdk:activities.history.start', id).catch(console.error)
            return onStreamLogged(`sdk:activities.history:${id}`, `sdk:activities.history.done:${id}`, onItem as (item: unknown) => void, onDone)
        },
        updates: (id, onItem, onDone?) => {
            invoke('sdk:activities.updates.start', id).catch(console.error)
            return onStreamLogged(`sdk:activities.updates:${id}`, `sdk:activities.updates.done:${id}`, onItem as (item: unknown) => void, onDone)
        },
        stream: (id, onItem, onDone?) => {
            invoke('sdk:activities.stream.start', id).catch(console.error)
            return onStreamLogged(`sdk:activities.stream:${id}`, `sdk:activities.stream.done:${id}`, onItem as (item: unknown) => void, onDone)
        },
    },

    sources: {
        list: () => invoke('sdk:sources.list'),
        get: (filter) => invoke('sdk:sources.get', filter),
        resolve: (cwd?) => invoke('sdk:sources.resolve', cwd),
    },

    artifact: {
        save: (data, filepath) => invoke('sdk:artifact.save', data, filepath),
        parseUnidiff: (patch?) => invoke('sdk:artifact.parseUnidiff', patch),
    },

    util: {
        toSummary: (activity) => invoke('sdk:util.toSummary', activity),
        toSummaries: (activities) => invoke('sdk:util.toSummaries', activities),
    },

    query: {
        validate: (query) => invoke('sdk:query.validate', query),
        format: (result) => invoke('sdk:query.format', result),
        schema: (domain) => invoke('sdk:query.schema', domain),
        schemas: () => invoke('sdk:query.schemas'),
        typeDef: (domain) => invoke('sdk:query.typeDef', domain),
        markdownDocs: () => invoke('sdk:query.markdownDocs'),
    },
}
