import {useCallback, useEffect, useSyncExternalStore} from 'react'
import {jules} from '@jules'
import type {Activity} from './types.ts'

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

export function useActivities(sessionId: string): Activity[] {
    const getSnapshot = useCallback(() => snapshots.get(sessionId) ?? EMPTY, [sessionId])
    const activities = useSyncExternalStore(subscribe, getSnapshot)

    useEffect(() => {
        let cancelled = false
        let iter: AsyncIterator<Activity> | null = null

        void (async () => {
            try {
                const stream = jules.session(sessionId).stream()
                iter = stream[Symbol.asyncIterator]() as AsyncIterator<Activity>
                const list: Activity[] = []

                while (true) {
                    const {value, done} = await iter.next()
                    if (done || cancelled) break
                    list.push(value)
                    snapshots.set(sessionId, [...list])
                    notify()
                }
            } catch (err) {
                if (!cancelled) console.error('[feed] stream failed:', err)
            }
        })()

        return () => {
            cancelled = true
            void iter?.return?.()
        }
    }, [sessionId])

    return activities
}
