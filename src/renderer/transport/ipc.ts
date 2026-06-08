import { transportMonitor } from './index'
import type { Transport, TransportMode, Unsubscribe } from './types'

function assertIpc(): NonNullable<typeof window.electron> {
  if (!window.electron) throw new Error('[transport:ipc] window.electron is not available — are you in Electron?')
  return window.electron
}

type AnyHandler = Record<string, (...a: unknown[]) => Promise<unknown>>

export class IpcTransport implements Transport {
  readonly mode: TransportMode = 'ipc'

  invoke<TResult>(channel: string, ...args: readonly unknown[]): Promise<TResult> {
    if (!channel) throw new Error('[transport:ipc] invoke called with empty channel')
    const el = assertIpc()
    const t0 = performance.now()
    console.log(`[transport:ipc] invoke "${channel}"`, args.length ? args : '')
    const handler = (el as unknown as AnyHandler)[channel]
    if (!handler) return Promise.reject(new Error(`[transport:ipc] no handler for channel "${channel}"`))
    return handler(...args)
      .then((result) => {
        const durationMs = performance.now() - t0
        console.log(`[transport:ipc] invoke "${channel}" — ${durationMs.toFixed(1)}ms`)
        transportMonitor.emit('activity', { mode: 'ipc', channel, direction: 'invoke', durationMs, ok: true })
        return result as TResult
      })
      .catch((err: unknown) => {
        const durationMs = performance.now() - t0
        const error = err instanceof Error ? err.message : String(err)
        console.error(`[transport:ipc] invoke "${channel}" — FAILED: ${error}`)
        transportMonitor.emit('activity', { mode: 'ipc', channel, direction: 'invoke', durationMs, ok: false, error })
        throw err
      })
  }

  subscribe(channel: string, handler: (event: unknown) => void): Unsubscribe {
    if (!channel) throw new Error('[transport:ipc] subscribe called with empty channel')
    assertIpc()
    console.log(`[transport:ipc] subscribe "${channel}"`)
    const el = window.electron as unknown as {
      on?: (ch: string, h: (e: unknown) => void) => void
      off?: (ch: string, h: (e: unknown) => void) => void
    }
    el.on?.(channel, handler)
    return () => {
      console.log(`[transport:ipc] unsubscribe "${channel}"`)
      el.off?.(channel, handler)
    }
  }
}
