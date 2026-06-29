import {useEffect, useSyncExternalStore} from 'react'
import type {ListSessionsOptions} from '@jules'
import type {CachedSession} from './types.ts'

/**
 * The slice of the preload-exposed `window.jules.cache` bridge this folder uses.
 * `window.jules` is intentionally absent from the global Window type (see
 * src/shared/electron.d.ts) — we type it locally, at the boundary, instead of
 * polluting the global declaration. `sessions(options)` lists via the SDK's
 * SessionCursor (API order, real `limit`); it returns `CachedSession`
 * (SessionResource with optional fields the cache may omit).
 */
interface SessionsCacheBridge {
    sessions: (options?: ListSessionsOptions) => Promise<CachedSession[]>
}

function cacheBridge(): SessionsCacheBridge | undefined {
    return (window as unknown as { jules?: { cache?: SessionsCacheBridge } }).jules?.cache
}

// Module-level snapshot. It outlives any component, so navigating away from and
// back to the sidebar renders the last-known sessions immediately instead of
// flashing empty while the cache is re-read.
let snapshot: CachedSession[] = []
const listeners = new Set<() => void>()

function subscribe(onStoreChange: () => void): () => void {
    listeners.add(onStoreChange)
    return () => {
        listeners.delete(onStoreChange)
    }
}

function getSnapshot(): CachedSession[] {
    return snapshot
}

/** Re-read all sessions from the on-disk cache and publish to subscribers. */
export async function refreshSessions(): Promise<void> {
    const bridge = cacheBridge()
    if (!bridge) {
        console.warn('[sessions] window.jules.cache unavailable — preload not ready?')
        return
    }
    try {
        snapshot = await bridge.sessions({limit: 20})
        for (const notify of listeners) notify()
    } catch (error) {
        console.error('[sessions] failed to read sessions from cache:', error)
    }
}

/** Sessions from the local cache, persisted across mounts; refreshes on mount. */
export function useSessions(): CachedSession[] {
    const sessions = useSyncExternalStore(subscribe, getSnapshot)
    useEffect(() => {
        void refreshSessions()
    }, [])
    return sessions
}
