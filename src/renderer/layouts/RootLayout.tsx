// ─── TODO ────────────────────────────────────────────────────────────────────
// [ ] Fix Jules API firing 3× on load — useCallback-in-useEffect deps trap
//     — files: src/renderer/hooks/use-activity-feed-api.ts
//              src/renderer/hooks/use-session-list.ts
//     — fix: inline fetch logic directly in useEffect, depend on [client, session.id] only
//     — also fix: early-return bug in use-activity-feed-api leaks initialLoad timeout
// ─────────────────────────────────────────────────────────────────────────────

import type { ReactNode } from 'react'
import { NavLink } from 'react-router'
import { Outlet } from 'react-router'
import { TopBar } from '@/shell'
import { ThemeProvider } from '@/providers/theme'
import { navRoutes } from '@/renderer/routes'
import { Notifications } from '@/components/shared/Notifications'

export default function RootLayout(): ReactNode {
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
            </div>
            <Notifications />
        </ThemeProvider>
    )
}