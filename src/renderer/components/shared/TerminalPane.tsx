import {useEffect, useRef} from 'react'
import {Terminal} from '@xterm/xterm'
import {FitAddon} from '@xterm/addon-fit'
import {WebLinksAddon} from '@xterm/addon-web-links'
import {SearchAddon} from '@xterm/addon-search'
import {Unicode11Addon} from '@xterm/addon-unicode11'
// import { WebglAddon } from '@xterm/addon-webgl'
import '@xterm/xterm/css/xterm.css'
import {terminal} from '@shared/bridge'
import {useTheme} from '@renderer/providers/theme'
import {Clipboard, Copy, Eraser} from 'lucide-react'

import {useExplorerStore} from '@/store/explorer'
import {SessionContextMenu} from '@/ui/session-context-menu'

interface TerminalPaneProps {
    active: boolean
    disableStdin?: boolean
    variant?: 'transparent' | 'system'
}

function cssVar(name: string): string {
    return getComputedStyle(document.documentElement).getPropertyValue(name).trim()
}

function buildTheme(variant: 'transparent' | 'system') {
    return {
        background: variant === 'system' ? cssVar('--surface-base') : 'transparent',
        foreground: cssVar('--fg-primary'),
        cursor: cssVar('--fg-primary'),
        cursorAccent: cssVar('--surface-base'),
        selectionBackground: cssVar('--interactive-selected'),
        // ANSI — One Dark palette, works in both themes
        black: '#282c34',
        red: '#e06c75',
        green: '#98c379',
        yellow: '#e5c07b',
        blue: '#61afef',
        magenta: '#c678dd',
        cyan: '#56b6c2',
        white: '#abb2bf',
        brightBlack: '#5c6370',
        brightRed: '#e06c75',
        brightGreen: '#98c379',
        brightYellow: '#e5c07b',
        brightBlue: '#61afef',
        brightMagenta: '#c678dd',
        brightCyan: '#56b6c2',
        brightWhite: '#ffffff',
    }
}

// Survives page navigation — the pty and its xterm buffer keep running
// in the background instead of being killed/disposed on every unmount.
interface TerminalSingleton {
    term: Terminal
    fit: FitAddon
    shellStarted: boolean
}

let singleton: TerminalSingleton | null = null

export function TerminalPane({active, disableStdin = true, variant = 'transparent'}: TerminalPaneProps) {
    const {theme} = useTheme()
    const rootDir = useExplorerStore(s => s.rootDir)
    const containerRef = useRef<HTMLDivElement>(null)
    const termRef = useRef<Terminal | null>(null)
    const fitRef = useRef<FitAddon | null>(null)

    useEffect(() => {
        if (!containerRef.current) return
        const container = containerRef.current

        if (!singleton) {
            const term = new Terminal({
                allowProposedApi: true,  // required for Unicode11Addon's term.unicode API
                allowTransparency: true,  // required for background: transparent on canvas
                theme: buildTheme(variant),
                fontFamily: "'Cascadia Mono NF', 'JetBrains Mono', monospace",
                fontSize: 13,
                lineHeight: 1.5,
                letterSpacing: 0,
                cursorStyle: 'bar',
                cursorBlink: true,
                disableStdin: disableStdin,
                scrollback: 5000,
            })

            const fit = new FitAddon()
            const webLinks = new WebLinksAddon()
            const search = new SearchAddon()
            const unicode11 = new Unicode11Addon()

            term.loadAddon(fit)
            term.loadAddon(webLinks)
            term.loadAddon(search)
            term.loadAddon(unicode11)
            term.unicode.activeVersion = '11'

            // const webgl = new WebglAddon()
            // webgl.onContextLoss(() => { webgl.dispose() })
            // term.loadAddon(webgl)

            // Subscribed once, forever — keeps writing into the buffer even
            // while no TerminalPane is mounted to look at it
            terminal?.onOutput(data => {
                term.write(data)
            })
            terminal?.onExit(code => {
                term.writeln(`\r\n\x1b[${code === 0 ? '32' : '31'}m[exited ${String(code)}]\x1b[0m`)
            })

            singleton = {term, fit, shellStarted: false}
        }

        const {term, fit} = singleton
        term.open(container) // safe to call again — reparents into the new container, buffer is untouched
        term.options.disableStdin = disableStdin
        term.options.theme = buildTheme(variant)
        fit.fit()

        termRef.current = term
        fitRef.current = fit

        // Refresh after fonts are guaranteed loaded so NF icons render correctly
        void document.fonts.ready.then(() => {
            term.refresh(0, term.rows - 1)
            fit.fit()
        })

        let disposeOnData: { dispose: () => void } | undefined
        if (!disableStdin) {
            if (!singleton.shellStarted) {
                terminal?.start(rootDir ?? '.')
                singleton.shellStarted = true
            }
            disposeOnData = term.onData(data => {
                terminal?.input(data)
            })
        }

        const ro = new ResizeObserver(() => {
            fitRef.current?.fit()
        })
        ro.observe(container)

        return () => {
            disposeOnData?.dispose()
            ro.disconnect()
            // term/pty intentionally kept alive — resumed on next mount
            termRef.current = null
        }
    }, [disableStdin, rootDir, variant])

    useEffect(() => {
        if (!termRef.current) return
        // Wait a frame so CSS custom properties have applied before reading them
        requestAnimationFrame(() => {
            if (!termRef.current) return
            termRef.current.options.theme = buildTheme(variant)
            termRef.current.refresh(0, termRef.current.rows - 1)
        })
    }, [theme, variant])

    useEffect(() => {
        if (active) {
            fitRef.current?.fit()
        }
    }, [active])

    return (
        <SessionContextMenu
            actions={[
                {
                    label: 'Copy',
                    icon: <Copy className="h-full w-full"/>,
                    onSelect: () => {
                        const selection = termRef.current?.getSelection()
                        if (selection) void navigator.clipboard.writeText(selection)
                    },
                },
                {
                    label: 'Paste',
                    icon: <Clipboard className="h-full w-full"/>,
                    onSelect: () => {
                        void navigator.clipboard.readText().then(text => {
                            termRef.current?.paste(text)
                        })
                    },
                },
                {
                    label: 'Clear',
                    icon: <Eraser className="h-full w-full"/>,
                    onSelect: () => {
                        termRef.current?.clear()
                    },
                },
            ]}
        >
            <div
                ref={containerRef}
                className={`h-full w-full cursor-text ${variant === 'system' ? 'bg-base p-4 rounded-lg overflow-hidden' : ''}`}
                style={{display: active ? 'block' : 'none'}}
                onClick={() => {
                    termRef.current?.focus()
                }}
            />
        </SessionContextMenu>
    )
}
