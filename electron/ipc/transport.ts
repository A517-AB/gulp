// Renderer-side transport. The one place that talks to ipcRenderer: logged
// request/response, enveloped-error decoding, and the start-stream-subscribe
// dance for streaming channels. Domain clients (client/*.ts) build on these.

import type { IpcRendererEvent } from 'electron'
import { ipcRenderer } from 'electron'
import { decodeError } from './wire'
import type { StreamChannels } from './channels'

type Unsubscribe = () => void

export function invoke<T>(channel: string, ...args: unknown[]): Promise<T> {
  const t = performance.now()
  console.log(`[ipc →] ${channel}`, args.length ? args : '')
  return ipcRenderer.invoke(channel, ...args).then(
    (result: T) => {
      console.log(`[ipc ←] ${channel} (${Math.round(performance.now() - t)}ms)`, result)
      return result
    },
    (err: unknown) => {
      const e = decodeError(err)
      console.error(`[ipc ✗] ${channel} (${Math.round(performance.now() - t)}ms)`, e)
      throw e
    },
  )
}

export function onStream(
  ch: StreamChannels,
  onItem: (item: unknown) => void,
  onDone?: () => void,
): Unsubscribe {
  let count = 0
  const onItemEv = (_: IpcRendererEvent, item: unknown) => {
    count++
    onItem(item)
  }
  const onDoneEv = () => {
    ipcRenderer.removeListener(ch.item, onItemEv)
    console.log(`[ipc stream done] ${ch.item} — ${count} items`)
    onDone?.()
  }
  ipcRenderer.on(ch.item, onItemEv)
  ipcRenderer.once(ch.done, onDoneEv)
  return () => {
    ipcRenderer.removeListener(ch.item, onItemEv)
    ipcRenderer.removeListener(ch.done, onDoneEv)
  }
}

/** Kick off a streaming handler and subscribe in one call. */
export function stream(
  ch: StreamChannels,
  onItem: (item: unknown) => void,
  onDone: (() => void) | undefined,
  args: unknown[] = [],
): Unsubscribe {
  invoke(ch.start, ...args).catch((err: unknown) => {
    console.error(err)
    onDone?.()
  })
  return onStream(ch, onItem, onDone)
}
