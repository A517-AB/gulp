import {useCallback, useEffect, useState} from 'react'
import {loadFont, useTheme} from '@renderer/providers/theme'

const SYSTEM_FONTS = new Set(['system-ui', 'sans-serif', 'monospace', 'ui-monospace', 'ui-sans-serif', 'serif'])

function useFontLoaded(family: string): boolean | null {
    const isSystem = !family || SYSTEM_FONTS.has(family)
    const [result, setResult] = useState<{ family: string; loaded: boolean | null }>({family, loaded: null})

    // Reset during render when the family changes — avoids a synchronous
    // setState inside the effect (react-hooks/set-state-in-effect)
    if (result.family !== family) {
        setResult({family, loaded: null})
    }

    useEffect(() => {
        if (isSystem) return
        const check = () => {
            void document.fonts.load(`16px '${family}'`).then(faces => {
                setResult(prev => prev.family === family ? {family, loaded: faces.length > 0} : prev)
            })
        }
        check()
        document.fonts.addEventListener('loadingdone', check)
        return () => {
            document.fonts.removeEventListener('loadingdone', check)
        }
    }, [family, isSystem])

    if (isSystem) return true
    return result.family === family ? result.loaded : null
}

// ── font suggestions ──────────────────────────────────────────────────────────

const SANS_SUGGESTIONS = [
    'Inter', 'Outfit', 'DM Sans', 'Nunito', 'Roboto', 'Open Sans',
    'Geist', 'Plus Jakarta Sans', 'Lato', 'Raleway', 'Poppins', 'system-ui',
]

const MONO_SUGGESTIONS = [
    'JetBrains Mono', 'Fira Code', 'Geist Mono', 'Source Code Pro',
    'Inconsolata', 'IBM Plex Mono', 'Cascadia Code', 'monospace',
]

// ── row ───────────────────────────────────────────────────────────────────────

function FontRow({
    label, value, listId, suggestions, fallback, onChange,
}: {
    label: string
    value: string
    listId: string
    suggestions: string[]
    fallback: 'sans-serif' | 'monospace'
    onChange: (v: string) => void
}) {
    const handle = useCallback((v: string) => {
        loadFont(v)
        onChange(v)
    }, [onChange])

    const loaded = useFontLoaded(value)
    const fontFamily = SYSTEM_FONTS.has(value) ? value : `'${value}', ${fallback}`

    return (
        <div className="space-y-1">
            <div className="flex items-center justify-between text-3xs">
                <span className="text-fg-dim uppercase tracking-wider shrink-0 mr-4 font-sans">{label}</span>
                <div className="flex items-center gap-1.5">
                    {loaded === false && (
                        <span className="text-destructive text-3xs" title="Font not loaded">✗</span>
                    )}
                    {loaded === true && (
                        <span className="text-emerald-500 text-3xs" title="Font loaded">✓</span>
                    )}
                    <input
                        type="text"
                        list={listId}
                        value={value}
                        onChange={e => {
                            handle(e.target.value)
                        }}
                        placeholder={fallback}
                        className="bg-transparent border-none p-0 text-fg-primary font-mono text-3xs outline-none text-right w-40 placeholder-fg-ghost"
                        spellCheck={false}
                    />
                </div>
                <datalist id={listId}>
                    {suggestions.map(s => <option key={s} value={s} />)}
                </datalist>
            </div>
            <p
                className="text-fg-ghost/50 text-[13px] leading-tight pl-0 truncate"
                style={{ fontFamily }}
            >
                Aa &mdash; The quick brown fox
            </p>
        </div>
    )
}

function NumRow({
    label, value, options, onChange,
}: {
    label: string
    value: number | string
    options: { value: number | string; label: string }[]
    onChange: (v: string) => void
}) {
    return (
        <div className="flex items-center justify-between text-3xs">
            <span className="text-fg-dim uppercase tracking-wider font-sans">{label}</span>
            <select
                value={String(value)}
                onChange={e => { onChange(e.target.value) }}
                className="bg-transparent border-none p-0 text-fg-primary font-mono text-3xs cursor-pointer outline-none"
            >
                {options.map(o => (
                    <option key={String(o.value)} value={String(o.value)}>{o.label}</option>
                ))}
            </select>
        </div>
    )
}

// ── panel ─────────────────────────────────────────────────────────────────────

const SIZES = Array.from({ length: 12 }, (_, i): { value: number; label: string } => ({ value: i + 13, label: `${i + 13}px` }))

const WEIGHTS = [100, 200, 300, 400, 500, 600, 700, 800, 900].map(w => ({ value: w, label: `${w}` }))

const LINE_HEIGHTS = [1.2, 1.3, 1.4, 1.5, 1.6, 1.8].map(v => ({ value: v, label: String(v) }))

const LETTER_SPACINGS = [
    { value: '-0.12em',  label: '-0.12em' },
    { value: '-0.08em',  label: '-0.08em' },
    { value: '-0.05em',  label: '-0.05em' },
    { value: '-0.03em',  label: '-0.03em' },
    { value: 'normal',   label: 'normal'  },
    { value: '0.025em',  label: '+0.025em' },
    { value: '0.05em',   label: '+0.05em' },
    { value: '0.1em',    label: '+0.1em'  },
    { value: '0.15em',   label: '+0.15em' },
]

const WORD_SPACINGS = [
    { value: '-0.05em', label: '-0.05em' },
    { value: 'normal',  label: 'normal' },
    { value: '0.05em',  label: '+0.05em' },
    { value: '0.1em',   label: '+0.1em' },
    { value: '0.15em',  label: '+0.15em' },
]

const SPACINGS = [0.15, 0.18, 0.20, 0.22, 0.25, 0.28, 0.30, 0.32, 0.35, 0.40].map(v => ({ value: v, label: `${v}rem` }))

export function TypographyPanel() {
    const {
        fontSize, setFontSize,
        fontBasic, setFontBasic,
        fontMarkdown, setFontMarkdown,
        fontCode, setFontCode,
        fontWeight, setFontWeight,
        spacing, setSpacing,
        lineHeight, setLineHeight,
        letterSpacing, setLetterSpacing,
        wordSpacing, setWordSpacing,
    } = useTheme()

    return (
        <div className="space-y-3 select-none">
            <div className="text-3xs text-fg-ghost pb-2 border-b border-hair leading-relaxed font-sans">
                Type any font name — system fonts work directly, Google Fonts load on demand.
            </div>

            <FontRow label="UI font"       value={fontBasic}    listId="dl-sans"  suggestions={SANS_SUGGESTIONS} fallback="sans-serif" onChange={setFontBasic} />
            <FontRow label="Markdown font" value={fontMarkdown}  listId="dl-md"   suggestions={[...SANS_SUGGESTIONS, ...MONO_SUGGESTIONS]} fallback="sans-serif" onChange={setFontMarkdown} />
            <FontRow label="Code font"     value={fontCode}      listId="dl-mono" suggestions={MONO_SUGGESTIONS}  fallback="monospace"  onChange={setFontCode} />

            <div className="border-t border-hair pt-3 space-y-3">
                <NumRow label="Size"          value={fontSize}      options={SIZES}          onChange={v => { setFontSize(Number(v)) }} />
                <NumRow label="Weight"        value={fontWeight}    options={WEIGHTS}        onChange={v => { setFontWeight(Number(v)) }} />
                <NumRow label="Line height"   value={lineHeight}    options={LINE_HEIGHTS}   onChange={v => { setLineHeight(Number(v)) }} />
                <NumRow label="Letter space"  value={letterSpacing} options={LETTER_SPACINGS} onChange={setLetterSpacing} />
                <NumRow label="Word space"    value={wordSpacing}   options={WORD_SPACINGS}  onChange={setWordSpacing} />
                <NumRow label="Density"       value={spacing}       options={SPACINGS}       onChange={v => { setSpacing(Number(v)) }} />
            </div>
        </div>
    )
}
