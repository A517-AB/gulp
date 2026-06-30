import {useEffect, useSyncExternalStore} from 'react'
import {jules} from '@jules'
import type {CachedSession} from './types.ts'

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

export async function refreshSessions(): Promise<void> {
    try {
        const list: CachedSession[] = []
        for await (const s of jules.sessions({limit: 20})) list.push(s as CachedSession)
        snapshot = list
        for (const notify of listeners) notify()
    } catch (error) {
        console.error('[sessions] failed to load sessions:', error)
    }
}

export function useSessions(): CachedSession[] {
    const sessions = useSyncExternalStore(subscribe, getSnapshot)
    useEffect(() => {
        void refreshSessions()
    }, [])
    return sessions
}
