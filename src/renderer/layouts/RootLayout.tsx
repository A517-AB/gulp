import type { ReactNode } from 'react'
import { Outlet, useLocation, NavLink } from 'react-router'
import { TopBar } from '@renderer/shell/TopBar'
import { ThemeProvider } from '@renderer/providers/theme'
import { navRoutes } from '@renderer/router'
import { NotificationToast } from '@/components/notifications/NotificationToast'

export default function RootLayout(): ReactNode {
    const location = useLocation()

    if (import.meta.env.DEV) {
        console.log('[router] →', location.pathname)
    }

    const navLinks = navRoutes
        .filter(route => route.handle?.inNav)
        .map((route) => {
            const path = route.index ? '/' : `/${route.path ?? ''}`
            return (
                <NavLink 
                    key={path} 
                    to={path}
                    className={({ isActive }) => 
                        `px-3 py-1 text-sm rounded-md transition-colors ${
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
                <TopBar center={navLinks} />
                <main className="flex-1 overflow-hidden min-h-0 h-full">
                    <Outlet />
                </main>
                <NotificationToast />
            </div>
        </ThemeProvider>
    )
}