import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'

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

const Ctx = createContext<ThemeCtx | null>(null)

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>(() => {
    try {
        // 2026-06-23: Commented out gulp:theme reference while investigating theme issues and settings data
        // return (localStorage.getItem('gulp:theme') as Theme | null) ?? 'dark'
        return 'dark'
    } catch {
      return 'dark'
    }
  })

  const [fontSize, setFontSize] = useState<number>(() => {
    try {
      const val = localStorage.getItem('gulp:fontSizeVal')
      return val ? parseInt(val, 10) : 16
    } catch {
      return 16
    }
  })

  const [fontBasic, setFontBasic] = useState<string>(() => {
    try {
      return localStorage.getItem('gulp:fontBasicVal') ?? 'Inter'
    } catch {
      return 'Inter'
    }
  })

  const [fontMarkdown, setFontMarkdown] = useState<string>(() => {
    try {
      return localStorage.getItem('gulp:fontMarkdownVal') ?? 'Inter'
    } catch {
      return 'Inter'
    }
  })

  const [fontCode, setFontCode] = useState<string>(() => {
    try {
      return localStorage.getItem('gulp:fontCodeVal') ?? 'JetBrains Mono'
    } catch {
      return 'JetBrains Mono'
    }
  })

  const [fontWeight, setFontWeight] = useState<number>(() => {
    try {
      const val = localStorage.getItem('gulp:fontWeightVal')
      return val ? parseInt(val, 10) : 400
    } catch {
      return 400
    }
  })

  const [spacing, setSpacing] = useState<number>(() => {
    try {
      const val = localStorage.getItem('gulp:spacingVal')
      return val ? parseFloat(val) : 0.25
    } catch {
      return 0.25
    }
  })

  const [lineHeight, setLineHeight] = useState<number>(() => {
    try {
      const val = localStorage.getItem('gulp:lineHeightVal')
      return val ? parseFloat(val) : 1.5
    } catch {
      return 1.5
    }
  })

  const [letterSpacing, setLetterSpacing] = useState<string>(() => {
    try {
      return localStorage.getItem('gulp:letterSpacingVal') ?? 'normal'
    } catch {
      return 'normal'
    }
  })

  const [wordSpacing, setWordSpacing] = useState<string>(() => {
    try {
      return localStorage.getItem('gulp:wordSpacingVal') ?? 'normal'
    } catch {
      return 'normal'
    }
  })

  useEffect(() => {
    const root = document.documentElement

    // Base Theme
    root.classList.toggle('dark', theme === 'dark')
      // 2026-06-23: Commented out gulp:theme reference while investigating theme issues and settings data
      // localStorage.setItem('gulp:theme', theme)

    // Apply Dynamic Sizing (1rem = fontSize)
    root.style.fontSize = `${fontSize}px`
    localStorage.setItem('gulp:fontSizeVal', String(fontSize))

    const SYSTEM_FONTS = new Set(['system-ui', 'sans-serif', 'monospace', 'ui-monospace', 'ui-sans-serif', 'ui-serif', 'serif', 'cursive', 'fantasy'])
    const formatFont = (name: string, fallback: 'sans-serif' | 'monospace') =>
      SYSTEM_FONTS.has(name) ? name : `'${name}', ${fallback}`

    // Apply Font Families
    root.style.setProperty('--font-sans', formatFont(fontBasic, 'sans-serif'))
    root.style.setProperty('--font-markdown', formatFont(fontMarkdown, 'sans-serif'))
    root.style.setProperty('--font-mono', formatFont(fontCode, 'monospace'))

    localStorage.setItem('gulp:fontBasicVal', fontBasic)
    localStorage.setItem('gulp:fontMarkdownVal', fontMarkdown)
    localStorage.setItem('gulp:fontCodeVal', fontCode)

    // Apply Dynamic Weights
    const w = fontWeight
    root.style.setProperty('--font-weight-thin', `${Math.max(100, w - 300)}`)
    root.style.setProperty('--font-weight-light', `${Math.max(100, w - 100)}`)
    root.style.setProperty('--font-weight-normal', `${w}`)
    root.style.setProperty('--font-weight-medium', `${Math.min(900, w + 100)}`)
    root.style.setProperty('--font-weight-semibold', `${Math.min(900, w + 200)}`)
    root.style.setProperty('--font-weight-bold', `${Math.min(900, w + 300)}`)
    localStorage.setItem('gulp:fontWeightVal', String(fontWeight))

    // Apply Dynamic Spacing
    root.style.setProperty('--spacing', `${spacing}rem`)
    localStorage.setItem('gulp:spacingVal', String(spacing))

    // Apply Line Height, Letter Spacing, and Word Spacing variables
    root.style.setProperty('--line-height-base', String(lineHeight))
    root.style.setProperty('--letter-spacing-base', letterSpacing)
    root.style.setProperty('--word-spacing-base', wordSpacing)

    localStorage.setItem('gulp:lineHeightVal', String(lineHeight))
    localStorage.setItem('gulp:letterSpacingVal', letterSpacing)
    localStorage.setItem('gulp:wordSpacingVal', wordSpacing)
  }, [theme, fontSize, fontBasic, fontMarkdown, fontCode, fontWeight, spacing, lineHeight, letterSpacing, wordSpacing])

  const toggle = () => { setTheme(t => (t === 'dark' ? 'light' : 'dark')) }

  return (
    <Ctx.Provider value={{
      theme,
      toggle,
      set: setTheme,
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
    }}>
      {children}
    </Ctx.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export function useTheme(): ThemeCtx {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useTheme requires ThemeProvider')
  return ctx
}
