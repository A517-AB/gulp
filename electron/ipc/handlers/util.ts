// Handler plumbing: a registrar that envelopes thrown errors uniformly, and a
// stream pump that drains an async-iterable to per-id channels and always closes
// with a `done` event (so the renderer's onDone fires even on early exit/error).

import { ipcMain } from 'electron'
import type { IpcMainInvokeEvent } from 'electron'
import { send } from '../serialize'
import { encodeError } from '../errors'
import type { StreamChannels } from '../channels'

export function handle(
  channel: string,
  fn: (event: IpcMainInvokeEvent, ...args: never[]) => unknown,
): void {
  ipcMain.handle(channel, async (event, ...args) => {
    try {
      return await fn(event, ...(args as never[]))
    } catch (err) {
      throw new Error(encodeError(err), { cause: err })
    }
  })
}

export async function pump<T>(
  event: IpcMainInvokeEvent,
  iterable: AsyncIterable<T>,
  ch: StreamChannels,
): Promise<void> {
  try {
    for await (const item of iterable) {
      if (event.sender.isDestroyed()) return
      send(event.sender, ch.item, item)
    }
  } finally {
    send(event.sender, ch.done)
  }
}
