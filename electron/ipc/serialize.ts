// Main-side serialization. SDK objects often carry class instances, getters and
// non-cloneable bits that the structured-clone algorithm chokes on, so everything
// crossing IPC is flattened to plain JSON once, here — not re-spelled per handler.

import type { WebContents } from 'electron'

export function serialize<T>(data: T): T {
  if (data === undefined || data === null) return data
  return JSON.parse(JSON.stringify(data)) as T
}

export function send(sender: WebContents, channel: string, payload?: unknown): void {
  if (!sender.isDestroyed()) sender.send(channel, serialize(payload))
}
