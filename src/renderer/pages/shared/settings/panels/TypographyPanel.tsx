import { useTheme } from '@renderer/providers/theme'
import { Component, type ReactNode } from 'react'

// Simple Error Boundary to catch any render errors and keep the app active
class PanelErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean }> {
  override state = { hasError: false }
  
  static getDerivedStateFromError() {
    return { hasError: true }
  }
  
  override componentDidCatch(error: unknown, errorInfo: unknown) {
    console.error("TypographyPanel crashed:", error, errorInfo)
  }
  
  override render() {
    if (this.state.hasError) {
      return (
        <div className="text-3xs font-mono text-red-400 py-4">
          Failed to load typography settings.
          <button
            onClick={() => {
              localStorage.clear()
              window.location.reload()
            }}
            className="ml-2 underline hover:text-red-300"
          >
            Reset defaults
          </button>
        </div>
      )
    }
    return this.props.children
  }
}

export function TypographyPanel() {
  const {
    fontSize,
    setFontSize,
    fontBasic,
    setFontBasic,
    fontMarkdown,
    setFontMarkdown,
    fontCode,
    setFontCode,
    fontWeight,
    setFontWeight,
    spacing,
    setSpacing,
    lineHeight,
    setLineHeight,
    letterSpacing,
    setLetterSpacing,
    wordSpacing,
    setWordSpacing
  } = useTheme()

  const SANS_FAMILIES = [
    { value: 'Inter', label: 'Inter' },
    { value: 'Outfit', label: 'Outfit (Geometric)' },
    { value: 'Roboto', label: 'Roboto' },
    { value: 'system-ui', label: 'System Default' }
  ]

  const MONO_FAMILIES = [
    { value: 'JetBrains Mono', label: 'JetBrains Mono' },
    { value: 'Fira Code', label: 'Fira Code' },
    { value: 'monospace', label: 'System Monospace' }
  ]

  const SIZES = Array.from({ length: 12 }, (_, i) => i + 13) // 13px to 24px

  const WEIGHTS = [
    { value: 100, label: '100 - Thin' },
    { value: 200, label: '200 - Extra Light' },
    { value: 300, label: '300 - Light' },
    { value: 400, label: '400 - Regular' },
    { value: 500, label: '500 - Medium' },
    { value: 600, label: '600 - Semibold' },
    { value: 700, label: '700 - Bold' },
    { value: 800, label: '800 - Extra Bold' },
    { value: 900, label: '900 - Black' }
  ]

  const SPACINGS = [
    { value: 0.15, label: '0.15rem (Ultra Compact)' },
    { value: 0.18, label: '0.18rem (Compact)' },
    { value: 0.20, label: '0.20rem (Tight)' },
    { value: 0.22, label: '0.22rem (Close)' },
    { value: 0.25, label: '0.25rem (Cozy)' },
    { value: 0.28, label: '0.28rem (Comfortable)' },
    { value: 0.30, label: '0.30rem (Relaxed)' },
    { value: 0.32, label: '0.32rem (Spacious)' },
    { value: 0.35, label: '0.35rem (Loose)' },
    { value: 0.40, label: '0.40rem (Wide)' },
    { value: 0.45, label: '0.45rem (Ultra Wide)' }
  ]

  const LINE_HEIGHTS = [
    { value: 1.2, label: '1.2 (Tight)' },
    { value: 1.3, label: '1.3 (Snug)' },
    { value: 1.4, label: '1.4 (Average)' },
    { value: 1.5, label: '1.5 (Normal)' },
    { value: 1.6, label: '1.6 (Relaxed)' },
    { value: 1.8, label: '1.8 (Loose)' }
  ]

  const LETTER_SPACINGS = [
    { value: '-0.05em', label: '-0.05em (Tighter)' },
    { value: '-0.02em', label: '-0.02em (Tight)' },
    { value: 'normal', label: 'normal (Normal)' },
    { value: '0.025em', label: '0.025em (Wide)' },
    { value: '0.05em', label: '0.05em (Wider)' },
    { value: '0.1em', label: '0.1em (Widest)' }
  ]

  const WORD_SPACINGS = [
    { value: '-0.05em', label: '-0.05em (Tight)' },
    { value: 'normal', label: 'normal (Normal)' },
    { value: '0.05em', label: '0.05em (Wide)' },
    { value: '0.1em', label: '0.1em (Wider)' },
    { value: '0.15em', label: '0.15em (Widest)' }
  ]

  return (
    <PanelErrorBoundary>
      <div className="space-y-4 font-sans select-none text-fg-secondary">
        
        {/* Top Summary Dashboard */}
        <div className="text-3xs font-mono uppercase tracking-widest text-fg-primary py-2 leading-relaxed select-text border-b border-hair pb-4">
          UI: {fontBasic} &bull; MD: {fontMarkdown} &bull; CODE: {fontCode} <br />
          SIZE: {fontSize}px &bull; WEIGHT: {fontWeight} &bull; SPACING: {spacing}rem <br />
          HEIGHT: {lineHeight} &bull; LETTER: {letterSpacing} &bull; WORD: {wordSpacing}
        </div>

        {/* Minimal Controls List */}
        <div className="space-y-3 pt-2">
          
          {/* Font Family Categories */}
          <div className="flex items-center justify-between text-3xs font-mono">
            <span className="text-fg-dim uppercase tracking-wider">Basic (UI) Font</span>
            <select
              value={fontBasic}
              onChange={e => { setFontBasic(e.target.value); }}
              className="bg-transparent border-none p-0 text-fg-primary font-mono text-3xs cursor-pointer outline-none hover:text-green-400 transition-colors"
            >
              {SANS_FAMILIES.map(f => (
                <option key={f.value} value={f.value} className="bg-surface text-fg-primary">
                  {f.label}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center justify-between text-3xs font-mono">
            <span className="text-fg-dim uppercase tracking-wider">Markdown Font</span>
            <select
              value={fontMarkdown}
              onChange={e => { setFontMarkdown(e.target.value); }}
              className="bg-transparent border-none p-0 text-fg-primary font-mono text-3xs cursor-pointer outline-none hover:text-green-400 transition-colors"
            >
              {[...SANS_FAMILIES, ...MONO_FAMILIES].map(f => (
                <option key={f.value} value={f.value} className="bg-surface text-fg-primary">
                  {f.label}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center justify-between text-3xs font-mono">
            <span className="text-fg-dim uppercase tracking-wider">Code (Editor/Term) Font</span>
            <select
              value={fontCode}
              onChange={e => { setFontCode(e.target.value); }}
              className="bg-transparent border-none p-0 text-fg-primary font-mono text-3xs cursor-pointer outline-none hover:text-green-400 transition-colors"
            >
              {MONO_FAMILIES.map(f => (
                <option key={f.value} value={f.value} className="bg-surface text-fg-primary">
                  {f.label}
                </option>
              ))}
            </select>
          </div>

          {/* Size & Weight */}
          <div className="flex items-center justify-between text-3xs font-mono">
            <span className="text-fg-dim uppercase tracking-wider">Base Font Size</span>
            <select
              value={fontSize}
              onChange={e => { setFontSize(Number(e.target.value)); }}
              className="bg-transparent border-none p-0 text-fg-primary font-mono text-3xs cursor-pointer outline-none hover:text-green-400 transition-colors"
            >
              {SIZES.map(s => (
                <option key={s} value={s} className="bg-surface text-fg-primary">
                  {s}px
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center justify-between text-3xs font-mono">
            <span className="text-fg-dim uppercase tracking-wider">Normal Font Weight</span>
            <select
              value={fontWeight}
              onChange={e => { setFontWeight(Number(e.target.value)); }}
              className="bg-transparent border-none p-0 text-fg-primary font-mono text-3xs cursor-pointer outline-none hover:text-green-400 transition-colors"
            >
              {WEIGHTS.map(w => (
                <option key={w.value} value={w.value} className="bg-surface text-fg-primary">
                  {w.label}
                </option>
              ))}
            </select>
          </div>

          {/* Spacing & Details */}
          <div className="flex items-center justify-between text-3xs font-mono">
            <span className="text-fg-dim uppercase tracking-wider">Line Height</span>
            <select
              value={lineHeight}
              onChange={e => { setLineHeight(Number(e.target.value)); }}
              className="bg-transparent border-none p-0 text-fg-primary font-mono text-3xs cursor-pointer outline-none hover:text-green-400 transition-colors"
            >
              {LINE_HEIGHTS.map(lh => (
                <option key={lh.value} value={lh.value} className="bg-surface text-fg-primary">
                  {lh.label}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center justify-between text-3xs font-mono">
            <span className="text-fg-dim uppercase tracking-wider">Letter Spacing</span>
            <select
              value={letterSpacing}
              onChange={e => { setLetterSpacing(e.target.value); }}
              className="bg-transparent border-none p-0 text-fg-primary font-mono text-3xs cursor-pointer outline-none hover:text-green-400 transition-colors"
            >
              {LETTER_SPACINGS.map(ls => (
                <option key={ls.value} value={ls.value} className="bg-surface text-fg-primary">
                  {ls.label}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center justify-between text-3xs font-mono">
            <span className="text-fg-dim uppercase tracking-wider">Word Spacing</span>
            <select
              value={wordSpacing}
              onChange={e => { setWordSpacing(e.target.value); }}
              className="bg-transparent border-none p-0 text-fg-primary font-mono text-3xs cursor-pointer outline-none hover:text-green-400 transition-colors"
            >
              {WORD_SPACINGS.map(ws => (
                <option key={ws.value} value={ws.value} className="bg-surface text-fg-primary">
                  {ws.label}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center justify-between text-3xs font-mono">
            <span className="text-fg-dim uppercase tracking-wider">Layout Density</span>
            <select
              value={spacing}
              onChange={e => { setSpacing(Number(e.target.value)); }}
              className="bg-transparent border-none p-0 text-fg-primary font-mono text-3xs cursor-pointer outline-none hover:text-green-400 transition-colors"
            >
              {SPACINGS.map(s => (
                <option key={s.value} value={s.value} className="bg-surface text-fg-primary">
                  {s.label}
                </option>
              ))}
            </select>
          </div>

        </div>
      </div>
    </PanelErrorBoundary>
  )
}
