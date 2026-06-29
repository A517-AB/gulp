import {useCallback, useEffect, useRef, useState} from 'react'
import {AnimatePresence, motion} from 'motion/react'
import {bus} from '@/library/notification/eventBus'

// ── types ─────────────────────────────────────────────────────────────────────

type TimerState = 'idle' | 'running' | 'paused' | 'done'

interface TimerEntry {
    id: string
    label: string
    duration: number   // seconds
    elapsed: number   // seconds
    state: TimerState
}

// ── helpers ───────────────────────────────────────────────────────────────────

function fmt(seconds: number): string {
    const h = Math.floor(seconds / 3600)
    const m = Math.floor((seconds % 3600) / 60)
    const s = seconds % 60
    if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

function makeTimer(label = 'Timer', duration = 25 * 60): TimerEntry {
    return {id: crypto.randomUUID(), label, duration, elapsed: 0, state: 'idle'}
}

// ── fullscreen overlay ────────────────────────────────────────────────────────

function Fullscreen({timer, onClose}: { timer: TimerEntry; onClose: () => void }) {
    const remaining = timer.duration - timer.elapsed
    const pct = timer.duration > 0 ? remaining / timer.duration : 0

    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose()
        }
        window.addEventListener('keydown', handler)
        return () => {
            window.removeEventListener('keydown', handler)
        }
    }, [onClose])

    return (
        <motion.div
            initial={{opacity: 0}}
            animate={{opacity: 1}}
            exit={{opacity: 0}}
            onClick={onClose}
            className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-base cursor-pointer select-none"
        >
            <p className="font-mono text-2xs text-fg-ghost mb-6 uppercase tracking-widest">{timer.label}</p>
            <span
                className="font-mono font-bold tabular-nums tracking-tight"
                style={{fontSize: 'clamp(5rem, 20vw, 18rem)', lineHeight: 1}}
            >
        {fmt(Math.max(0, remaining))}
      </span>

            {/* progress arc under the number */}
            <div className="mt-10 w-64 h-1 bg-hair rounded-full overflow-hidden">
                <motion.div
                    className="h-full bg-fg-muted rounded-full"
                    style={{width: `${pct * 100}%`}}
                    transition={{duration: 0.5}}
                />
            </div>

            <p className="mt-6 font-mono text-2xs text-fg-ghost">esc to close</p>
        </motion.div>
    )
}

// ── duration picker ───────────────────────────────────────────────────────────

const PRESETS = [
    {label: '5m', s: 5 * 60},
    {label: '10m', s: 10 * 60},
    {label: '15m', s: 15 * 60},
    {label: '25m', s: 25 * 60},
    {label: '45m', s: 45 * 60},
    {label: '1h', s: 60 * 60},
]

function DurationPicker({value, onChange}: { value: number; onChange: (s: number) => void }) {
    const [custom, setCustom] = useState('')
    return (
        <div className="flex flex-wrap gap-1.5">
            {PRESETS.map(p => (
                <button
                    key={p.s}
                    onClick={() => {
                        onChange(p.s)
                    }}
                    className={`font-mono text-2xs px-2 py-0.5 rounded transition-colors ${
                        value === p.s ? 'bg-active text-fg-primary' : 'text-fg-ghost hover:text-fg-secondary'
                    }`}
                >{p.label}</button>
            ))}
            <input
                placeholder="mm:ss"
                value={custom}
                onChange={e => {
                    setCustom(e.target.value)
                }}
                onKeyDown={e => {
                    if (e.key !== 'Enter') return
                    const [a = '0', b = '0'] = custom.split(':')
                    const s = Number(a) * 60 + Number(b)
                    if (s > 0) {
                        onChange(s);
                        setCustom('')
                    }
                }}
                className="w-16 bg-transparent font-mono text-2xs text-fg-primary border-b border-hair outline-none text-center"
            />
        </div>
    )
}

// ── single timer card ─────────────────────────────────────────────────────────

function TimerCard({
                       timer, onUpdate, onRemove, onFullscreen,
                   }: {
    timer: TimerEntry
    onUpdate: (id: string, patch: Partial<TimerEntry>) => void
    onRemove: (id: string) => void
    onFullscreen: (id: string) => void
}) {
    const remaining = Math.max(0, timer.duration - timer.elapsed)
    const pct = timer.duration > 0 ? remaining / timer.duration : 0
    const tickRef = useRef<ReturnType<typeof setInterval> | null>(null)

    const clearTick = useCallback(() => {
        if (tickRef.current) {
            clearInterval(tickRef.current);
            tickRef.current = null
        }
    }, [])

    const start = useCallback(() => {
        onUpdate(timer.id, {state: 'running'})
        tickRef.current = setInterval(() => {
            onUpdate(timer.id, {})    // triggers re-render; real tick via functional update below
        }, 1000)
    }, [timer.id, onUpdate])

    // tick via setInterval → actual elapsed increment handled in parent
    useEffect(() => {
        if (timer.state !== 'running') {
            clearTick();
            return
        }
        tickRef.current = setInterval(() => {
            onUpdate(timer.id, {elapsed: timer.elapsed + 1})
        }, 1000)
        return clearTick
    }, [timer.state, timer.elapsed, timer.id, onUpdate, clearTick])

    // warning + done side effects
    useEffect(() => {
        const remaining = timer.duration - timer.elapsed
        if (timer.state === 'running' && remaining === 30) {
            bus.emit('timer.warning', {label: timer.label, secondsLeft: 30})
        }
        if (timer.state === 'running' && remaining <= 0) {
            bus.emit('timer.done', {label: timer.label})
            onUpdate(timer.id, {state: 'done', elapsed: timer.duration})
        }
    }, [timer.elapsed, timer.state, timer.duration, timer.label, timer.id, onUpdate])

    const toggle = () => {
        if (timer.state === 'idle' || timer.state === 'paused') start()
        else if (timer.state === 'running') onUpdate(timer.id, {state: 'paused'})
    }

    const reset = () => {
        clearTick()
        onUpdate(timer.id, {elapsed: 0, state: 'idle'})
    }

    const color = timer.state === 'done' ? '#10b981'
        : pct < 0.2 ? '#ef4444'
            : pct < 0.4 ? '#f59e0b'
                : 'currentColor'

    return (
        <div className="flex flex-col gap-3 p-5 min-w-[200px]">
            {/* label */}
            <input
                value={timer.label}
                onChange={e => {
                    onUpdate(timer.id, {label: e.target.value})
                }}
                disabled={timer.state === 'running'}
                className="bg-transparent font-mono text-xs text-fg-secondary outline-none border-b border-transparent hover:border-hair focus:border-hair transition-colors w-full"
            />

            {/* countdown */}
            <button
                onClick={() => {
                    onFullscreen(timer.id)
                }}
                className="font-mono font-bold tabular-nums text-5xl tracking-tight text-left transition-colors hover:opacity-70"
                style={{color}}
            >
                {fmt(Math.max(0, remaining))}
            </button>

            {/* progress bar */}
            <div className="h-px bg-hair rounded-full overflow-hidden">
                <motion.div
                    className="h-full rounded-full"
                    style={{width: `${pct * 100}%`, background: color}}
                    transition={{duration: 0.4}}
                />
            </div>

            {/* duration picker — only when idle */}
            {timer.state === 'idle' && (
                <DurationPicker
                    value={timer.duration}
                    onChange={s => {
                        onUpdate(timer.id, {duration: s})
                    }}
                />
            )}

            {/* controls */}
            <div className="flex items-center gap-3 mt-1">
                <button
                    onClick={toggle}
                    disabled={timer.state === 'done'}
                    className="font-mono text-2xs text-fg-primary hover:text-fg-secondary transition-colors disabled:opacity-30"
                >
                    {timer.state === 'running' ? 'pause' : timer.state === 'done' ? 'done' : 'start'}
                </button>
                {timer.state !== 'idle' && (
                    <button onClick={reset}
                            className="font-mono text-2xs text-fg-ghost hover:text-fg-secondary transition-colors">
                        reset
                    </button>
                )}
                <button onClick={() => {
                    onRemove(timer.id)
                }} className="font-mono text-2xs text-fg-ghost hover:text-destructive transition-colors ml-auto">
                    ×
                </button>
            </div>
        </div>
    )
}

// ── page ──────────────────────────────────────────────────────────────────────

export default function TimerPage() {
    const [timers, setTimers] = useState<TimerEntry[]>([makeTimer('Focus', 25 * 60), makeTimer('Break', 5 * 60)])
    const [fullscreenId, setFullscreen] = useState<string | null>(null)

    const update = useCallback((id: string, patch: Partial<TimerEntry>) => {
        setTimers(ts => ts.map(t => t.id === id ? {...t, ...patch} : t))
    }, [])

    const remove = useCallback((id: string) => {
        setTimers(ts => ts.filter(t => t.id !== id))
    }, [])

    const fullscreenTimer = timers.find(t => t.id === fullscreenId)

    return (
        <div className="flex flex-col h-full overflow-hidden">
            <div className="flex flex-1 overflow-x-auto overflow-y-hidden divide-x divide-hair">
                {timers.map(t => (
                    <TimerCard
                        key={t.id}
                        timer={t}
                        onUpdate={update}
                        onRemove={remove}
                        onFullscreen={id => {
                            setFullscreen(id)
                        }}
                    />
                ))}

                <div className="flex items-start p-5">
                    <button
                        onClick={() => {
                            setTimers(ts => [...ts, makeTimer(`Timer ${ts.length + 1}`)])
                        }}
                        className="font-mono text-2xs text-fg-ghost hover:text-fg-secondary transition-colors"
                    >
                        + add
                    </button>
                </div>
            </div>

            <AnimatePresence>
                {fullscreenTimer && (
                    <Fullscreen
                        timer={fullscreenTimer}
                        onClose={() => {
                            setFullscreen(null)
                        }}
                    />
                )}
            </AnimatePresence>
        </div>
    )
}
