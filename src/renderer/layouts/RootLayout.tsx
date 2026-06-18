import { useState, useEffect, useRef, useMemo } from 'react'
import type { ReactNode } from 'react'
import { Outlet, NavLink, useNavigate } from 'react-router'
import { TopBar } from '@renderer/shell/TopBar'
import { ThemeProvider } from '@renderer/providers/theme'
import { mainNavRoutes, secretNavRoutes } from '@renderer/router'
import { useAppSync } from '@/hooks/use-app-sync'

function SecretButton() {
    const [open, setOpen] = useState(false)
    const ref = useRef<HTMLDivElement>(null)
    const navigate = useNavigate()

    useEffect(() => {
        if (!open) return
        const handler = (e: MouseEvent) => {
            if (!ref.current?.contains(e.target as Node)) setOpen(false)
        }
        document.addEventListener('mousedown', handler)
        return () => { document.removeEventListener('mousedown', handler) }
    }, [open])

    return (
        <div ref={ref} className="relative">
            <button
                onClick={() => { setOpen(o => !o) }}
                className="w-5 h-5 rounded-sm bg-transparent border-none outline-none cursor-pointer transition-all duration-75 active:shadow-[inset_0_2px_5px_rgba(0,0,0,0.5)] active:translate-y-px select-none"
                aria-label="More pages"
            />
            {open && (
                <div className="absolute top-full left-0 mt-1 z-50 min-w-[120px] rounded-md border border-subtle bg-overlay shadow-xl py-1">
                    {secretNavRoutes.map(route => {
                        const path = route.index ? '/' : `/${route.path ?? ''}`
                        return (
                            <button
                                key={path}
                                onClick={() => { void navigate(path); setOpen(false) }}
                                className="w-full text-left px-3 py-1.5 text-2xs font-mono text-fg-muted hover:text-fg-primary hover:bg-hover transition-colors"
                            >
                                {route.handle?.title}
                            </button>
                        )
                    })}
                </div>
            )}
        </div>
    )
}

export default function RootLayout(): ReactNode {
    useAppSync()
    const navigate = useNavigate()
    const [topbarVisible, setTopbarVisible] = useState(true)

    const inNavRoutes = useMemo(() => mainNavRoutes, [])

    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if (!(e.ctrlKey || e.metaKey)) return
            if (e.key === '\\') {
                e.preventDefault()
                setTopbarVisible(v => !v)
                return
            }
            const num = parseInt(e.key, 10)
            if (num >= 1 && num <= 9) {
                const route = inNavRoutes[num - 1]
                if (!route) return
                e.preventDefault()
                const path = route.index ? '/' : `/${route.path ?? ''}`
                void navigate(path)
            }
        }
        window.addEventListener('keydown', onKey)
        return () => { window.removeEventListener('keydown', onKey) }
    }, [navigate, inNavRoutes])

    const navLinks = inNavRoutes.map((route) => {
        const path = route.index ? '/' : `/${route.path ?? ''}`
        return (
            <NavLink
                key={path}
                to={path}
                style={{ fontFamily: 'system-ui, sans-serif' }}
                className={({ isActive }) =>
                    `px-3 py-1 text-3xs font-medium rounded transition-colors whitespace-nowrap ${
                        isActive
                            ? 'bg-active text-fg-primary'
                            : 'text-fg-secondary hover:text-fg-primary hover:bg-hover'
                    }`
                }
            >
                {route.handle?.title}
            </NavLink>
        )
    })

    return (
        <ThemeProvider>
            <div className="flex flex-col h-screen w-screen overflow-hidden bg-base">
                <div
                    style={{ height: topbarVisible ? 'var(--height-toolbar)' : '0px' }}
                    className="shrink-0 overflow-hidden transition-[height] duration-300 ease-in-out"
                >
                    <div
                        style={{ transform: topbarVisible ? 'translateY(0)' : 'translateY(-100%)' }}
                        className="transition-transform duration-300 ease-in-out"
                    >
                        <TopBar left={<SecretButton />} center={navLinks} />
                    </div>
                </div>
                <main className="flex-1 overflow-hidden min-h-0">
                    <Outlet />
                </main>
            </div>
        </ThemeProvider>
    )
}
