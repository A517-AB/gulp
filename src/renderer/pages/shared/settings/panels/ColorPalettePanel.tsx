import {useCallback, useMemo, useRef, useState} from 'react'
import {createPortal} from 'react-dom'
import {useTheme} from '@renderer/providers/theme'
import {AnimatePresence, motion} from 'framer-motion'
import {cn} from '@/utils'

interface ThemeOverrides {
    light: Record<string, string>;
    dark: Record<string, string>
}

const PALETTE_KEY = 'gulp:palette'

const VARS: { key: string; label: string }[] = [
    {key: '--surface-base', label: 'Background'},
    {key: '--surface-mid', label: 'Panels'},
    {key: '--surface-raised', label: 'Cards'},
    {key: '--fg-primary', label: 'Text'},
    {key: '--fg-secondary', label: 'Text dim'},
    {key: '--primary', label: 'Accent'},
]

const COLORS = [
    '#ffffff', '#f8fafc', '#f1f5f9', '#e2e8f0', '#cbd5e1',
    '#000000', '#121212', '#18181b', '#282828', '#374151',
    '#ef4444', '#f97316', '#f59e0b', '#eab308', '#84cc16',
    '#22c55e', '#14b8a6', '#0ea5e9', '#3b82f6', '#8b5cf6',
    '#a855f7', '#d946ef', '#ec4899', '#f43f5e', '#52525b',
]

function cssColorToHex(color: string): string {
    try {
        const canvas = document.createElement('canvas')
        canvas.width = canvas.height = 1
        const ctx = canvas.getContext('2d')
        if (!ctx) return '#000000'
        ctx.fillStyle = color
        ctx.fillRect(0, 0, 1, 1)
        const d = ctx.getImageData(0, 0, 1, 1).data
        return '#' + [d[0] ?? 0, d[1] ?? 0, d[2] ?? 0].map(v => v.toString(16).padStart(2, '0')).join('')
    } catch {
        return '#000000'
    }
}

function getComputedHex(varName: string): string {
    const raw = getComputedStyle(document.documentElement).getPropertyValue(varName).trim()
    return raw ? cssColorToHex(raw) : '#000000'
}

function loadStored(): ThemeOverrides {
    try {
        return JSON.parse(localStorage.getItem(PALETTE_KEY) ?? '{"light":{},"dark":{}}') as ThemeOverrides
    } catch {
        return {light: {}, dark: {}}
    }
}

function saveStored(o: ThemeOverrides): void {
    localStorage.setItem(PALETTE_KEY, JSON.stringify(o))
}

function buildStyleContent(o: ThemeOverrides): string {
    const lightRules = Object.entries(o.light).map(([k, v]) => `  ${k}: ${v} !important;`).join('\n')
    const darkRules = Object.entries(o.dark).map(([k, v]) => `  ${k}: ${v} !important;`).join('\n')
    const parts: string[] = []
    if (lightRules) parts.push(`:root {\n${lightRules}\n}`)
    if (darkRules) parts.push(`.dark {\n${darkRules}\n}`)
    return parts.join('\n')
}

function applyOverrides(o: ThemeOverrides): void {
    const id = 'app-palette-override'
    let el = document.getElementById(id) as HTMLStyleElement | null
    if (!el) {
        el = document.createElement('style')
        el.id = id
        document.head.appendChild(el)
    }
    el.textContent = buildStyleContent(o)
}

applyOverrides(loadStored())

const swatchItem = {
    hidden: {opacity: 0, scale: 0.7},
    visible: (i: number) => ({
        opacity: 1,
        scale: 1,
        transition: {delay: i * 0.022, type: 'spring' as const, stiffness: 400, damping: 22}
    }),
}

function Swatch({stored, currentHex, onSet}: {
    stored: string | undefined
    currentHex: string
    onSet: (hex: string) => void
}) {
    const [isOpen, setIsOpen] = useState(false)
    const [pos, setPos] = useState({top: 0, right: 0})
    const triggerRef = useRef<HTMLButtonElement>(null)
    const display = stored ?? currentHex

    const open = () => {
        if (!triggerRef.current) return
        const r = triggerRef.current.getBoundingClientRect()
        setPos({top: r.bottom + 8, right: window.innerWidth - r.right})
        setIsOpen(true)
    }

    return (
        <div className="flex items-center gap-2">
            {stored && (
                <button
                    onClick={() => {
                        onSet('')
                    }}
                    className="w-4 h-4 rounded-full flex items-center justify-center text-[10px] text-fg-ghost hover:text-red-400 transition-colors"
                    title="Reset"
                >×</button>
            )}
            <button
                ref={triggerRef}
                onClick={() => {
                    isOpen ? setIsOpen(false) : open()
                }}
                className="w-5 h-5 rounded-md border border-hair flex-shrink-0 transition-transform hover:scale-105 shadow-sm"
                style={{background: display}}
            />

            {isOpen && createPortal(
                <>
                    <div className="fixed inset-0 z-40" onClick={() => {
                        setIsOpen(false)
                    }}/>
                    <AnimatePresence>
                        <motion.div
                            className="fixed z-50 grid grid-cols-5 gap-1.5 p-2 rounded-lg border border-subtle bg-overlay shadow-xl"
                            style={{top: pos.top, right: pos.right}}
                            initial={{opacity: 0, y: -6, scale: 0.95}}
                            animate={{opacity: 1, y: 0, scale: 1}}
                            exit={{opacity: 0, y: -6, scale: 0.95}}
                            transition={{duration: 0.13, ease: 'easeOut'}}
                        >
                            {COLORS.map((c, i) => (
                                <motion.button
                                    key={c}
                                    custom={i}
                                    variants={swatchItem}
                                    initial="hidden"
                                    animate="visible"
                                    onClick={() => {
                                        onSet(c);
                                        setIsOpen(false)
                                    }}
                                    className={cn(
                                        'w-5 h-5 rounded-md hover:scale-110 transition-transform shadow-sm',
                                        c === display && 'ring-1 ring-fg-primary ring-offset-1 ring-offset-base'
                                    )}
                                    style={{backgroundColor: c}}
                                    title={c}
                                />
                            ))}
                        </motion.div>
                    </AnimatePresence>
                </>,
                document.body
            )}
        </div>
    )
}

export function ColorPalettePanel() {
    const {theme} = useTheme()
    const [overrides, setOverrides] = useState<ThemeOverrides>(loadStored)
    const [editTheme, setEditTheme] = useState<'light' | 'dark'>(theme)

    const computedHex = useMemo(() => {
        const out: Record<string, string> = {}
        for (const {key} of VARS) {
            out[key] = getComputedHex(key)
        }
        return out
    }, [editTheme, theme])

    const set = useCallback((varKey: string, hex: string) => {
        setOverrides(prev => {
            const next: ThemeOverrides = {light: {...prev.light}, dark: {...prev.dark}}
            if (hex) {
                next[editTheme][varKey] = hex
            } else {
                const {[varKey]: _removed, ...rest} = next[editTheme]
                next[editTheme] = rest
            }
            saveStored(next)
            applyOverrides(next)
            return next
        })
    }, [editTheme])

    const resetAll = useCallback(() => {
        const empty: ThemeOverrides = {light: {}, dark: {}}
        setOverrides(empty)
        saveStored(empty)
        applyOverrides(empty)
    }, [])

    const current = overrides[editTheme]
    const hasAny = Object.keys(overrides.light).length + Object.keys(overrides.dark).length > 0

    return (
        <div className="space-y-6 font-sans">
            <div className="flex items-center gap-1 bg-surface-raised p-1 rounded-md w-fit border border-hair">
                <button
                    onClick={() => {
                        setEditTheme('light')
                    }}
                    className={cn(
                        'px-3 py-1 rounded text-3xs uppercase tracking-wider transition-colors',
                        editTheme === 'light' ? 'bg-hover text-fg-primary shadow-sm' : 'text-fg-ghost hover:text-fg-dim'
                    )}
                >Light
                </button>
                <button
                    onClick={() => {
                        setEditTheme('dark')
                    }}
                    className={cn(
                        'px-3 py-1 rounded text-3xs uppercase tracking-wider transition-colors',
                        editTheme === 'dark' ? 'bg-hover text-fg-primary shadow-sm' : 'text-fg-ghost hover:text-fg-dim'
                    )}
                >Dark
                </button>
            </div>

            <div className="space-y-4">
                {VARS.map(({key, label}) => (
                    <div key={key} className="flex flex-col gap-1.5 relative">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <span className="text-3xs text-fg-primary uppercase tracking-wider">{label}</span>
                                {current[key] && (
                                    <span className="text-[9px] text-purple-400/80 font-mono">{current[key]}</span>
                                )}
                            </div>
                            <Swatch
                                stored={current[key]}
                                currentHex={computedHex[key] ?? '#000000'}
                                onSet={hex => {
                                    set(key, hex)
                                }}
                            />
                        </div>
                    </div>
                ))}
            </div>

            {hasAny && (
                <button
                    onClick={resetAll}
                    className="px-3 py-1.5 text-[10px] font-mono border border-hair rounded text-fg-ghost hover:text-red-400 hover:border-red-500/30 transition-all"
                >
                    Reset
                </button>
            )}
        </div>
    )
}
