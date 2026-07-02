import {create} from 'zustand'

export type Theme = 'light' | 'dark'


interface ThemeCtx {
  theme: Theme
  toggle: () => void
  set: (t: Theme) => void
  fontSize: number // Base size in px (e.g., 16)
  setFontSize: (s: number) => void
  fontBasic: string // Basic UI font family
  setFontBasic: (f: string) => void
  fontMarkdown: string // Markdown render font family
  setFontMarkdown: (f: string) => void
  fontCode: string // Code block font family
  setFontCode: (f: string) => void
  fontWeight: number // Base normal weight (e.g., 400)
  setFontWeight: (w: number) => void
  spacing: number // Base spacing in rem (e.g., 0.25)
  setSpacing: (s: number) => void
  lineHeight: number // Line height (e.g. 1.5)
  setLineHeight: (l: number) => void
  letterSpacing: string // Letter spacing (e.g. 'normal')
  setLetterSpacing: (s: string) => void
  wordSpacing: string // Word spacing (e.g. 'normal')
  setWordSpacing: (s: string) => void
}

export const useThemeStore = create<ThemeCtx>((set) => ({
    theme: (() => {
    try {
        return (localStorage.getItem('gulp:theme') as Theme | null) ?? 'dark'
    } catch {
      return 'dark'
    }
    })(),
    toggle: () => {
        set((state) => ({theme: state.theme === 'dark' ? 'light' : 'dark'}))
    },
    set: (t: Theme) => {
        set({theme: t})
    },
    fontSize: (() => {
    try {
      const val = localStorage.getItem('gulp:fontSizeVal')
      return val ? parseInt(val, 10) : 16
    } catch {
      return 16
    }
    })(),
    setFontSize: (s: number) => {
        set({fontSize: s})
    },
    fontBasic: (() => {
    try {
      return localStorage.getItem('gulp:fontBasicVal') ?? 'Inter'
    } catch {
      return 'Inter'
    }
    })(),
    setFontBasic: (f: string) => {
        set({fontBasic: f})
    },
    fontMarkdown: (() => {
    try {
      return localStorage.getItem('gulp:fontMarkdownVal') ?? 'Inter'
    } catch {
      return 'Inter'
    }
    })(),
    setFontMarkdown: (f: string) => {
        set({fontMarkdown: f})
    },
    fontCode: (() => {
    try {
      return localStorage.getItem('gulp:fontCodeVal') ?? 'JetBrains Mono'
    } catch {
      return 'JetBrains Mono'
    }
    })(),
    setFontCode: (f: string) => {
        set({fontCode: f})
    },
    fontWeight: (() => {
    try {
      const val = localStorage.getItem('gulp:fontWeightVal')
      return val ? parseInt(val, 10) : 400
    } catch {
      return 400
    }
    })(),
    setFontWeight: (w: number) => {
        set({fontWeight: w})
    },
    spacing: (() => {
    try {
      const val = localStorage.getItem('gulp:spacingVal')
      return val ? parseFloat(val) : 0.25
    } catch {
      return 0.25
    }
    })(),
    setSpacing: (s: number) => {
        set({spacing: s})
    },
    lineHeight: (() => {
    try {
      const val = localStorage.getItem('gulp:lineHeightVal')
      return val ? parseFloat(val) : 1.5
    } catch {
      return 1.5
    }
    })(),
    setLineHeight: (l: number) => {
        set({lineHeight: l})
    },
    letterSpacing: (() => {
    try {
      return localStorage.getItem('gulp:letterSpacingVal') ?? 'normal'
    } catch {
      return 'normal'
    }
    })(),
    setLetterSpacing: (s: string) => {
        set({letterSpacing: s})
    },
    wordSpacing: (() => {
    try {
      return localStorage.getItem('gulp:wordSpacingVal') ?? 'normal'
    } catch {
      return 'normal'
    }
    })(),
    setWordSpacing: (s: string) => {
        set({wordSpacing: s})
    },
}))

const SYSTEM_FONTS = new Set(['system-ui', 'sans-serif', 'monospace', 'ui-monospace', 'ui-sans-serif', 'ui-serif', 'serif', 'cursive', 'fantasy'])
const formatFont = (name: string, fallback: 'sans-serif' | 'monospace') =>
    SYSTEM_FONTS.has(name) ? name : `'${name}', ${fallback}`

const GF_MAP: Record<string, string> = {
    'Inter': 'Inter:wght@300;400;500;600;700',
    'Outfit': 'Outfit:wght@300;400;500;600;700',
    'DM Sans': 'DM+Sans:wght@300;400;500;600;700',
    'Nunito': 'Nunito:wght@300;400;500;600;700',
    'Roboto': 'Roboto:wght@300;400;500;700',
    'Open Sans': 'Open+Sans:wght@300;400;500;600;700',
    'Geist': 'Geist:wght@300;400;500;600;700',
    'Plus Jakarta Sans': 'Plus+Jakarta+Sans:wght@300;400;500;600;700',
    'Lato': 'Lato:wght@300;400;700',
    'Raleway': 'Raleway:wght@300;400;500;600;700',
    'Poppins': 'Poppins:wght@300;400;500;600;700',
    'JetBrains Mono': 'JetBrains+Mono:wght@300;400;500;600;700',
    'Fira Code': 'Fira+Code:wght@300;400;500;600;700',
    'Geist Mono': 'Geist+Mono:wght@300;400;500;600;700',
    'Source Code Pro': 'Source+Code+Pro:wght@300;400;500;600;700',
    'Inconsolata': 'Inconsolata:wght@300;400;500;600;700',
    'IBM Plex Mono': 'IBM+Plex+Mono:wght@300;400;500;600;700',
}

export function loadFont(name: string): void {
    if (typeof document === 'undefined') return
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

export function applyThemeStyles(state: ThemeCtx): void {
    if (typeof document === 'undefined') return
    const root = document.documentElement

    root.classList.toggle('dark', state.theme === 'dark')
    localStorage.setItem('gulp:theme', state.theme)

    loadFont(state.fontBasic)
    loadFont(state.fontMarkdown)
    loadFont(state.fontCode)

    // Apply Dynamic Sizing (1rem = fontSize)
    root.style.fontSize = `${state.fontSize}px`
    localStorage.setItem('gulp:fontSizeVal', String(state.fontSize))

    // Apply Font Families
    root.style.setProperty('--font-sans', formatFont(state.fontBasic, 'sans-serif'))
    root.style.setProperty('--font-markdown', formatFont(state.fontMarkdown, 'sans-serif'))
    root.style.setProperty('--font-mono', formatFont(state.fontCode, 'monospace'))

    localStorage.setItem('gulp:fontBasicVal', state.fontBasic)
    localStorage.setItem('gulp:fontMarkdownVal', state.fontMarkdown)
    localStorage.setItem('gulp:fontCodeVal', state.fontCode)

    // Keep BlockNote in sync with markdown font + base size
    const bnId = 'bn-font-sync'
    let bnEl = document.getElementById(bnId) as HTMLStyleElement | null
    if (!bnEl) {
        bnEl = document.createElement('style')
        bnEl.id = bnId
        document.head.appendChild(bnEl)
    }
    bnEl.textContent = `.bn-editor .ProseMirror, .bn-editor .ProseMirror p { font-family: ${formatFont(state.fontMarkdown, 'sans-serif')}; font-size: ${state.fontSize}px; }`

    // Apply Dynamic Weights
    const w = state.fontWeight
    root.style.setProperty('--font-weight-thin', `${Math.max(100, w - 300)}`)
    root.style.setProperty('--font-weight-light', `${Math.max(100, w - 100)}`)
    root.style.setProperty('--font-weight-normal', `${w}`)
    root.style.setProperty('--font-weight-medium', `${Math.min(900, w + 100)}`)
    root.style.setProperty('--font-weight-semibold', `${Math.min(900, w + 200)}`)
    root.style.setProperty('--font-weight-bold', `${Math.min(900, w + 300)}`)
    localStorage.setItem('gulp:fontWeightVal', String(state.fontWeight))

    // Apply Dynamic Spacing
    root.style.setProperty('--spacing', `${state.spacing}rem`)
    localStorage.setItem('gulp:spacingVal', String(state.spacing))

    // Apply Line Height, Letter Spacing, and Word Spacing variables
    root.style.setProperty('--line-height-base', String(state.lineHeight))
    root.style.setProperty('--letter-spacing-base', state.letterSpacing)
    root.style.setProperty('--word-spacing-base', state.wordSpacing)

    localStorage.setItem('gulp:lineHeightVal', String(state.lineHeight))
    localStorage.setItem('gulp:letterSpacingVal', state.letterSpacing)
    localStorage.setItem('gulp:wordSpacingVal', state.wordSpacing)
}

// Subscribe to store updates to apply DOM adjustments
const _unsub = useThemeStore.subscribe((state) => {
    applyThemeStyles(state)
})

// Initialize stylesheets on load
if (typeof document !== 'undefined') {
    applyThemeStyles(useThemeStore.getState())
}

if (import.meta.hot) {
    import.meta.hot.dispose(() => {
        _unsub()
    })
}

export function useTheme(): ThemeCtx {
    return useThemeStore()
}
