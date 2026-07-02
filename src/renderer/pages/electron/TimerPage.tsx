import {useEffect, useState} from 'react'
import {AnimatePresence, motion} from 'motion/react'
import {type TimerEntry, useTimerStore} from '@/store/timer'
import {Popover, PopoverContent, PopoverTrigger} from '@renderer/ui/popover'

// ── helpers ───────────────────────────────────────────────────────────────────

function fmt(seconds: number): string {
    const h = Math.floor(seconds / 3600)
    const m = Math.floor((seconds % 3600) / 60)
    const s = seconds % 60
    if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

function remainingOf(t: TimerEntry): number {
    if (t.state === 'running' && t.endAt !== undefined) {
        return Math.max(0, Math.round((t.endAt - Date.now()) / 1000))
    }
    return t.remaining
}

// ── fullscreen overlay ────────────────────────────────────────────────────────

function Fullscreen({timer, onClose}: { timer: TimerEntry; onClose: () => void }) {
    const [, forceTick] = useState(0)
    useEffect(() => {
        if (timer.state !== 'running') return
        const id = setInterval(() => {
            forceTick(n => n + 1)
        }, 1000)
        return () => {
            clearInterval(id)
        }
    }, [timer.state])

    const remaining = remainingOf(timer)
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

function TimerCard({timer, onFullscreen}: { timer: TimerEntry; onFullscreen: (id: string) => void }) {
    const update = useTimerStore(s => s.update)
    const remove = useTimerStore(s => s.remove)
    const toggle = useTimerStore(s => s.toggle)
    const reset = useTimerStore(s => s.reset)

    // local re-render tick — authoritative time lives in the store (endAt), this just repaints
    const [, forceTick] = useState(0)
    useEffect(() => {
        if (timer.state !== 'running') return
        const id = setInterval(() => {
            forceTick(n => n + 1)
        }, 1000)
        return () => {
            clearInterval(id)
        }
    }, [timer.state])

    const remaining = remainingOf(timer)
    const pct = timer.duration > 0 ? remaining / timer.duration : 0

    const color = timer.state === 'done' ? '#10b981'
        : pct < 0.2 ? '#ef4444'
            : pct < 0.4 ? '#f59e0b'
                : 'currentColor'

    return (
        <div className="flex flex-col gap-2 p-4 w-[240px] border border-hair rounded-md">
            {/* label + remove */}
            <div className="flex items-center gap-2">
                <input
                    value={timer.label}
                    onChange={e => {
                        update(timer.id, {label: e.target.value})
                    }}
                    disabled={timer.state === 'running'}
                    className="flex-1 min-w-0 bg-transparent font-mono text-2xs text-fg-secondary outline-none border-b border-transparent hover:border-hair focus:border-hair transition-colors"
                />
                <button onClick={() => {
                    remove(timer.id)
                }}
                        className="font-mono text-2xs text-fg-ghost hover:text-destructive transition-colors">
                    ×
                </button>
            </div>

            {/* countdown + controls, same row */}
            <div className="flex items-center justify-between gap-2">
                <button
                    onClick={() => {
                        if (timer.state === 'idle' || timer.state === 'paused') toggle(timer.id)
                        else onFullscreen(timer.id)
                    }}
                    className="font-mono font-bold tabular-nums text-3xl tracking-tight text-left transition-colors hover:opacity-70"
                    style={{color}}
                >
                    {fmt(Math.max(0, remaining))}
                </button>
                <div className="flex items-center gap-2 shrink-0">
                    <button
                        onClick={() => {
                            toggle(timer.id)
                        }}
                        disabled={timer.state === 'done'}
                        className="font-mono text-2xs text-fg-primary hover:text-fg-secondary transition-colors disabled:opacity-30"
                    >
                        {timer.state === 'running' ? 'pause' : timer.state === 'done' ? 'done' : 'start'}
                    </button>
                    {timer.state !== 'idle' && (
                        <button onClick={() => {
                            reset(timer.id)
                        }}
                                className="font-mono text-2xs text-fg-ghost hover:text-fg-secondary transition-colors">
                            reset
                        </button>
                    )}
                </div>
            </div>

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
                        update(timer.id, {duration: s, remaining: s})
                    }}
                />
            )}
        </div>
    )
}

function AddTimerCard() {
    const add = useTimerStore(s => s.add)
    const start = useTimerStore(s => s.start)
    const [open, setOpen] = useState(false)
    const [custom, setCustom] = useState('')

    const createAndStart = (s: number) => {
        const id = add(undefined, s)
        start(id)
        setOpen(false)
        setCustom('')
    }

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <button
                    className="flex items-center justify-center w-[240px] h-[128px] border border-dashed border-hair rounded-md font-mono text-2xs text-fg-ghost hover:text-fg-secondary hover:border-fg-ghost transition-colors"
                >
                    + add
                </button>
            </PopoverTrigger>
            <PopoverContent align="start" className="w-auto p-3 border-subtle bg-overlay">
                <div className="flex flex-wrap gap-1.5 max-w-[220px]">
                    {PRESETS.map(p => (
                        <button
                            key={p.s}
                            onClick={() => {
                                createAndStart(p.s)
                            }}
                            className="font-mono text-2xs px-2 py-0.5 rounded text-fg-secondary hover:text-fg-primary hover:bg-hover transition-colors"
                        >{p.label}</button>
                    ))}
                    <input
                        autoFocus
                        placeholder="mm:ss"
                        value={custom}
                        onChange={e => {
                            setCustom(e.target.value)
                        }}
                        onKeyDown={e => {
                            if (e.key !== 'Enter') return
                            const [a = '0', b = '0'] = custom.split(':')
                            const s = Number(a) * 60 + Number(b)
                            if (s > 0) createAndStart(s)
                        }}
                        className="w-16 bg-transparent font-mono text-2xs text-fg-primary border-b border-hair outline-none text-center"
                    />
                </div>
            </PopoverContent>
        </Popover>
    )
}

// ── page ──────────────────────────────────────────────────────────────────────

export default function TimerPage() {
    const timers = useTimerStore(s => s.timers)
    const [fullscreenId, setFullscreen] = useState<string | null>(null)

    const fullscreenTimer = timers.find(t => t.id === fullscreenId)

    return (
        <div className="flex flex-col h-full overflow-auto">
            <div className="flex flex-wrap gap-3 p-4 content-start">
                {timers.map(t => (
                    <TimerCard
                        key={t.id}
                        timer={t}
                        onFullscreen={id => {
                            setFullscreen(id)
                        }}
                    />
                ))}

                <AddTimerCard/>
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
