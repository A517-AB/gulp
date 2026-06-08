import mitt from 'mitt'
import { IpcTransport } from './ipc'
import { FetchTransport } from './fetch'
import type { Transport, TransportMode, TransportMonitorEvent } from './types'

// ── sanity check — this folder must never import jules or the sdk ─────────────
// enforced by ESLint no-restricted-imports; this comment is the human-readable contract.

export type { Transport, TransportMode, TransportMonitorEvent, Unsubscribe } from './types'
export type { TransportContextValue } from './_context'
export { IpcTransport } from './ipc'
export { FetchTransport } from './fetch'
export { TransportProvider } from './context'
export { useTransport } from './use-transport'

// ── monitor bus ───────────────────────────────────────────────────────────────

export const transportMonitor = mitt<Record<'activity', TransportMonitorEvent>>()

// ── active transport ──────────────────────────────────────────────────────────

function resolveDefault(): Transport {
  if (typeof window !== 'undefined' && window.electron) {
    console.log('[transport] mode: ipc (window.electron present)')
    return new IpcTransport()
  }
  const baseUrl = import.meta.env['VITE_API_URL'] as string | undefined
  if (!baseUrl) {
    console.warn('[transport] mode: fetch — VITE_API_URL not set, defaulting to /api')
  } else {
    console.log(`[transport] mode: fetch — base: ${baseUrl}`)
  }
  return new FetchTransport(baseUrl ?? '/api')
}

let _active: Transport = resolveDefault()

export function getTransport(): Transport {
  return _active
}

export function setTransport(t: Transport): void {
  console.log(`[transport] switched: ${_active.mode} → ${t.mode}`)
  _active = t
}

export function getMode(): TransportMode {
  return _active.mode
}
