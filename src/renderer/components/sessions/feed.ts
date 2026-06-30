import {useCallback, useEffect, useSyncExternalStore} from 'react'
import type {Activity} from '@jules'

const snapshots = new Map<string, Activity[]>()
const listeners = new Set<() => void>()
const EMPTY: Activity[] = []

function subscribe(cb: () => void): () => void {
    listeners.add(cb)
    return () => {
        listeners.delete(cb)
    }
}

function notify(): void {
    for (const cb of listeners) cb()
}

export async function refreshActivities(sessionId: string): Promise<void> {
    const cache = window.jules?.cache
    if (!cache) {
        console.warn('[feed] window.jules.cache not ready')
        return
    }
    try {
        const list = await cache.activities(sessionId)
        console.log('[feed] activities', {sessionId, count: list.length})
        snapshots.set(sessionId, list as Activity[])
        notify()
    } catch (err) {
        console.error('[feed] refreshActivities failed:', err)
    }
}

export async function syncFeed(sessionId: string): Promise<void> {
    const cache = window.jules?.cache
    if (!cache) return
    try {
        await cache.sync()
        await refreshActivities(sessionId)
    } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        if (msg.includes('SyncInProgressError')) return
        console.error('[feed] sync failed:', err)
    }
}


export function useActivities(sessionId: string): Activity[] {
    const getSnapshot = useCallback(() => snapshots.get(sessionId) ?? EMPTY, [sessionId])
    const activities = useSyncExternalStore(subscribe, getSnapshot)
    useEffect(() => {
        void refreshActivities(sessionId)
        void syncFeed(sessionId)
    }, [sessionId])
    return activities
}
