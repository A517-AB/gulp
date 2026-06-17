import { useState, useEffect, useMemo } from 'react'
import type { ReactNode } from 'react'
import { Outlet, NavLink, useNavigate } from 'react-router'
import { TopBar } from '@renderer/shell/TopBar'
import { ThemeProvider } from '@renderer/providers/theme'
import { navRoutes } from '@renderer/router'
import { useAppSync } from '@/hooks/use-app-sync'

export default function RootLayout(): ReactNode {
    useAppSync()
    const navigate = useNavigate()
    const [topbarVisible, setTopbarVisible] = useState(true)

    const inNavRoutes = useMemo(
        () => navRoutes.filter(r => r.handle?.inNav),
        [],
    )

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
                className={({ isActive }) =>
                    `px-3 py-1 text-xs font-mono rounded transition-colors whitespace-nowrap ${
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
                        <TopBar center={navLinks} />
                    </div>
                </div>
                <main className="flex-1 overflow-hidden min-h-0">
                    <Outlet />
                </main>
            </div>
        </ThemeProvider>
    )
}
