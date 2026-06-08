import { transportMonitor } from './index'
import type { Transport, TransportMode, Unsubscribe } from './types'

export class FetchTransport implements Transport {
  readonly mode: TransportMode = 'fetch'
  private readonly baseUrl: string
  private readonly listeners = new Map<string, Set<(event: unknown) => void>>()

  constructor(baseUrl: string) {
    if (!baseUrl) throw new Error('[transport:fetch] baseUrl is required')
    this.baseUrl = baseUrl.replace(/\/$/, '')
  }

  invoke<TResult>(channel: string, ...args: readonly unknown[]): Promise<TResult> {
    if (!channel) throw new Error('[transport:fetch] invoke called with empty channel')
    const url = `${this.baseUrl}/${channel}`
    const t0 = performance.now()
    console.log(`[transport:fetch] POST "${url}"`, args.length ? args : '')
    const body = args.length ? JSON.stringify(args.length === 1 ? args[0] : args) : null
    return fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      ...(body !== null ? { body } : {}),
    })
      .then(async (res) => {
        const ms = (performance.now() - t0).toFixed(1)
        if (!res.ok) {
          const text = await res.text().catch(() => res.statusText)
          console.error(`[transport:fetch] POST "${url}" — ${String(res.status)} FAILED in ${ms}ms: ${text}`)
          throw new Error(`[transport:fetch] ${String(res.status)} ${res.statusText}: ${text}`)
        }
        const durationMs = performance.now() - t0
        console.log(`[transport:fetch] POST "${url}" — ${String(res.status)} OK in ${durationMs.toFixed(1)}ms`)
        transportMonitor.emit('activity', { mode: 'fetch', channel, direction: 'invoke', durationMs, ok: true })
        return res.json() as Promise<TResult>
      })
      .catch((err: unknown) => {
        const durationMs = performance.now() - t0
        if (err instanceof Error && err.message.startsWith('[transport:fetch]')) {
          transportMonitor.emit('activity', { mode: 'fetch', channel, direction: 'invoke', durationMs, ok: false, error: err.message })
          throw err
        }
        const error = err instanceof Error ? err.message : String(err)
        console.error(`[transport:fetch] POST "${url}" — network error: ${error}`)
        transportMonitor.emit('activity', { mode: 'fetch', channel, direction: 'invoke', durationMs, ok: false, error })
        throw err
      })
  }

  subscribe(channel: string, handler: (event: unknown) => void): Unsubscribe {
    if (!channel) throw new Error('[transport:fetch] subscribe called with empty channel')
    console.log(`[transport:fetch] subscribe "${channel}"`)
    if (!this.listeners.has(channel)) this.listeners.set(channel, new Set())
    const set = this.listeners.get(channel) ?? new Set<(event: unknown) => void>()
    this.listeners.set(channel, set)
    set.add(handler)
    return () => {
      console.log(`[transport:fetch] unsubscribe "${channel}"`)
      this.listeners.get(channel)?.delete(handler)
    }
  }

  emit(channel: string, event: unknown): void {
    this.listeners.get(channel)?.forEach(h => { h(event) })
  }
}
