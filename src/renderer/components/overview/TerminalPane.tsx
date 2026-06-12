import { useEffect, useRef } from 'react'
import { Terminal } from '@xterm/xterm'
import { FitAddon } from '@xterm/addon-fit'
import '@xterm/xterm/css/xterm.css'
import { terminal } from '@shared/bridge'
import { useTheme } from '@renderer/providers/theme'

interface TerminalPaneProps {
    active: boolean
}

function cssVar(name: string): string {
    return getComputedStyle(document.documentElement).getPropertyValue(name).trim()
}

function buildTheme() {
    return {
        background:    'transparent',
        foreground:    cssVar('--fg-primary'),
        cursor:        cssVar('--fg-primary'),
        cursorAccent:  cssVar('--surface-base'),
        selectionBackground: cssVar('--interactive-selected'),
        // ANSI — One Dark palette, works in both themes
        black:         '#282c34',
        red:           '#e06c75',
        green:         '#98c379',
        yellow:        '#e5c07b',
        blue:          '#61afef',
        magenta:       '#c678dd',
        cyan:          '#56b6c2',
        white:         '#abb2bf',
        brightBlack:   '#5c6370',
        brightRed:     '#e06c75',
        brightGreen:   '#98c379',
        brightYellow:  '#e5c07b',
        brightBlue:    '#61afef',
        brightMagenta: '#c678dd',
        brightCyan:    '#56b6c2',
        brightWhite:   '#ffffff',
    }
}

export function TerminalPane({ active }: TerminalPaneProps) {
    const { theme } = useTheme()
    const containerRef = useRef<HTMLDivElement>(null)
    const termRef      = useRef<Terminal | null>(null)
    const fitRef       = useRef<FitAddon | null>(null)

    useEffect(() => {
        if (!containerRef.current) return

        const term = new Terminal({
            theme:        buildTheme(),
            fontFamily:   'JetBrainsMono NF, JetBrainsMono Nerd Font, JetBrains Mono, monospace',
            fontSize:     13,
            lineHeight:   1.5,
            letterSpacing: 0,
            cursorStyle:  'bar',
            cursorBlink:  true,
            disableStdin: true,
            scrollback:   5000,
        })
        const fit = new FitAddon()
        term.loadAddon(fit)
        term.open(containerRef.current)
        fit.fit()
        termRef.current = term
        fitRef.current  = fit

        const unsubOutput = terminal?.onOutput(data => { term.write(data) })
        const unsubExit   = terminal?.onExit(code => {
            term.writeln(`\r\n\x1b[${code === 0 ? '32' : '31'}m[exited ${String(code)}]\x1b[0m`)
        })

        const ro = new ResizeObserver(() => { fitRef.current?.fit() })
        ro.observe(containerRef.current)

        return () => {
            unsubOutput?.()
            unsubExit?.()
            ro.disconnect()
            term.dispose()
            termRef.current = null
        }
    }, [])

    useEffect(() => {
        if (termRef.current) {
            termRef.current.options.theme = buildTheme()
        }
    }, [theme])

    useEffect(() => {
        if (active) { fitRef.current?.fit() }
    }, [active])

    return (
        <div
            ref={containerRef}
            className="h-full w-full"
            style={{ display: active ? 'block' : 'none' }}
        />
    )
}
