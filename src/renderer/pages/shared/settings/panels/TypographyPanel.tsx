import { useCallback } from 'react'
import { useTheme } from '@renderer/providers/theme'

// ── font loading ──────────────────────────────────────────────────────────────

const GF_MAP: Record<string, string> = {
    'Inter':              'Inter:wght@300;400;500;600;700',
    'Outfit':             'Outfit:wght@300;400;500;600;700',
    'DM Sans':            'DM+Sans:wght@300;400;500;600;700',
    'Nunito':             'Nunito:wght@300;400;500;600;700',
    'Roboto':             'Roboto:wght@300;400;500;700',
    'Open Sans':          'Open+Sans:wght@300;400;500;600;700',
    'Geist':              'Geist:wght@300;400;500;600;700',
    'Plus Jakarta Sans':  'Plus+Jakarta+Sans:wght@300;400;500;600;700',
    'Lato':               'Lato:wght@300;400;700',
    'Raleway':            'Raleway:wght@300;400;500;600;700',
    'Poppins':            'Poppins:wght@300;400;500;600;700',
    'JetBrains Mono':     'JetBrains+Mono:wght@300;400;500;600;700',
    'Fira Code':          'Fira+Code:wght@300;400;500;600;700',
    'Geist Mono':         'Geist+Mono:wght@300;400;500;600;700',
    'Source Code Pro':    'Source+Code+Pro:wght@300;400;500;600;700',
    'Inconsolata':        'Inconsolata:wght@300;400;500;600;700',
    'IBM Plex Mono':      'IBM+Plex+Mono:wght@300;400;500;600;700',
}

function loadFont(name: string): void {
    const family = GF_MAP[name]
    if (!family) return
    const id = `gf-${name.replace(/\s+/g, '-').toLowerCase()}`
    if (document.getElementById(id)) return
    const link = document.createElement('link')
    link.id = id
    link.rel = 'stylesheet'
    link.href = `https://fonts.googleapis.com/css2?family=${family}&display=swap`
    document.head.appendChild(link)
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

    return (
        <div className="flex items-center justify-between text-3xs font-mono">
            <span className="text-fg-dim uppercase tracking-wider shrink-0 mr-4">{label}</span>
            <input
                type="text"
                list={listId}
                value={value}
                onChange={e => { handle(e.target.value) }}
                placeholder={fallback}
                className="bg-transparent border-none p-0 text-fg-primary font-mono text-3xs outline-none text-right w-40 placeholder-fg-ghost"
                style={{ fontFamily: `'${value}', ${fallback}` }}
                spellCheck={false}
            />
            <datalist id={listId}>
                {suggestions.map(s => <option key={s} value={s} />)}
            </datalist>
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
        <div className="flex items-center justify-between text-3xs font-mono">
            <span className="text-fg-dim uppercase tracking-wider">{label}</span>
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
        <div className="space-y-3 font-mono select-none">
            <div className="text-3xs text-fg-ghost pb-2 border-b border-hair leading-relaxed">
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
