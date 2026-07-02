import {create} from 'zustand'
import {persist} from 'zustand/middleware'

export type TimerState = 'idle' | 'running' | 'paused' | 'done'

export interface TimerEntry {
    id: string
    label: string
    duration: number      // seconds, total
    remaining: number     // seconds left — authoritative when idle/paused/done
    endAt?: number | undefined  // ms epoch — authoritative when running
    state: TimerState
    warned30: boolean
}

interface TimerStoreState {
    timers: TimerEntry[]
    lastActiveId: string | null

    add: (label?: string, duration?: number) => string
    update: (id: string, patch: Partial<TimerEntry>) => void
    remove: (id: string) => void
    start: (id: string) => void
    pause: (id: string) => void
    reset: (id: string) => void
    toggle: (id: string) => void
    /** Recomputes remaining for running timers and flips them to 'done' once expired. */
    tick: () => void
}

function makeTimer(label = 'Timer', duration = 25 * 60): TimerEntry {
    return {id: crypto.randomUUID(), label, duration, remaining: duration, state: 'idle', warned30: false}
}

export const useTimerStore = create<TimerStoreState>()(persist(
    (set, get) => ({
        timers: [makeTimer('Focus', 25 * 60), makeTimer('Break', 5 * 60)],
        lastActiveId: null,

        add: (label, duration) => {
            const t = makeTimer(label ?? `Timer ${get().timers.length + 1}`, duration)
            set(s => ({timers: [...s.timers, t]}))
            return t.id
        },

        update: (id, patch) => {
            set(s => ({timers: s.timers.map(t => t.id === id ? {...t, ...patch} : t)}))
        },

        remove: (id) => {
            set(s => ({
                timers: s.timers.filter(t => t.id !== id),
                lastActiveId: s.lastActiveId === id ? null : s.lastActiveId,
            }))
        },

        start: (id) => {
            set(s => ({
                timers: s.timers.map(t => t.id === id
                    ? {...t, state: 'running', endAt: Date.now() + t.remaining * 1000}
                    : t),
                lastActiveId: id,
            }))
        },

        pause: (id) => {
            set(s => ({
                timers: s.timers.map(t => {
                    if (t.id !== id || t.state !== 'running') return t
                    const remaining = Math.max(0, Math.round(((t.endAt ?? Date.now()) - Date.now()) / 1000))
                    return {...t, state: 'paused', remaining, endAt: undefined}
                }),
                lastActiveId: id,
            }))
        },

        reset: (id) => {
            set(s => ({
                timers: s.timers.map(t => t.id === id
                    ? {...t, state: 'idle', remaining: t.duration, endAt: undefined, warned30: false}
                    : t),
            }))
        },

        toggle: (id) => {
            const t = get().timers.find(x => x.id === id)
            if (!t) return
            if (t.state === 'running') get().pause(id)
            else if (t.state === 'idle' || t.state === 'paused') get().start(id)
        },

        tick: () => {
            const now = Date.now()
            set(s => ({
                timers: s.timers.map(t => {
                    if (t.state !== 'running' || t.endAt === undefined) return t
                    const remaining = Math.max(0, Math.round((t.endAt - now) / 1000))
                    if (remaining <= 0) return {...t, remaining: 0, state: 'done', endAt: undefined}
                    if (remaining <= 30 && !t.warned30) return {...t, remaining, warned30: true}
                    return {...t, remaining}
                }),
            }))
        },
    }),
    {name: 'timer-store'}
))
