export type TransportMode = 'ipc' | 'fetch'

export type Unsubscribe = () => void

export interface TransportEvent<T = unknown> {
  channel: string
  data: T
}

export interface Transport {
  readonly mode: TransportMode
  invoke<TResult>(channel: string, ...args: readonly unknown[]): Promise<TResult>
  subscribe(channel: string, handler: (event: unknown) => void): Unsubscribe
}

export interface TransportMonitorEvent {
  mode: TransportMode
  channel: string
  direction: 'invoke' | 'event'
  durationMs?: number
  ok: boolean
  error?: string
}
