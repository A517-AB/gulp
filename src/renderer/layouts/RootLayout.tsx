import type { ReactNode } from 'react'
import { useEffect } from 'react'
import { Outlet, useLocation, NavLink, useMatches } from 'react-router'
import { TopBar } from '@renderer/shell'
import { ThemeProvider } from '@renderer/providers/theme'
import { navRoutes, type AppRoute } from '@renderer/router'
import { useStore } from '@/store/app'
import { lowPower as lowPowerBridge, popup as popupBridge } from '@shared/bridge'
import { notify } from '@/store/notifications'
import { Clock } from '@renderer/components/shared/Clock'
import { Notifications } from '@renderer/components/shared/Notifications'

export default function RootLayout(): ReactNode {
    const location = useLocation()
    const matches = useMatches()
    const { isLowPower, enterLowPower, exitLowPower, setAlwaysOnTop } = useStore()

    useEffect(() => {
        if (!lowPowerBridge) return
        const unEnter = lowPowerBridge.onEnter(enterLowPower)
        const unExit  = lowPowerBridge.onExit(exitLowPower)
        const unAOT   = lowPowerBridge.onAlwaysOnTop(setAlwaysOnTop)
        return () => { unEnter(); unExit(); unAOT() }
    }, [enterLowPower, exitLowPower, setAlwaysOnTop])

    useEffect(() => {
        if (!popupBridge) return
        return popupBridge.onNotification((payload) => {
            notify({
                type: payload.type === 'completed' ? 'success'
                    : payload.type === 'failed'    ? 'error'
                    : 'info',
                title:    payload.title,
                body:     payload.body,
                duration: 5000,
            })
        })
    }, [])

    const currentHandle = matches[matches.length - 1]?.handle as AppRoute['handle']
    const LowPowerView  = currentHandle?.lowPowerView

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
                    {isLowPower ? (
                        <div className="flex items-center justify-center h-full bg-base">
                            {LowPowerView ? <LowPowerView /> : <Clock size={220} />}
                        </div>
                    ) : (
                        <Outlet />
                    )}
                </main>
            </div>
            <Notifications />
        </ThemeProvider>
    )
}