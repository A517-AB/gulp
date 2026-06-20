import type { IpcRendererEvent } from 'electron'
import { ipcRenderer } from 'electron'
import type { SdkIpc } from '@/jules'
import { invoke, stream } from '../transport'
import { CH, EV, streams } from '../channels'

export const clientApi: SdkIpc['client'] = {
  sessions: (options?) => invoke(CH.client.sessions, options),

  streamSessions: (onItem, onDone, options?) =>
    stream(streams.sessions(), onItem as (item: unknown) => void, onDone, [options]),

  sync: (options?) => invoke(CH.client.sync, options),

  onSyncProgress: (cb) => {
    const handler = (_: IpcRendererEvent, p: Parameters<typeof cb>[0]) => { cb(p) }
    ipcRenderer.on(EV.syncProgress, handler)
    return () => ipcRenderer.removeListener(EV.syncProgress, handler)
  },

  select: (query) => invoke(CH.client.select, query),
  getSessionResource: (id) => invoke(CH.client.getSessionResource, id),
  run: (config) => invoke(CH.client.run, config),
  with: (options) => invoke(CH.client.with, options),
  all: (configs, options?) => invoke(CH.client.all, configs, options),
}
