import type {ReactNode} from 'react'
import {useEffect, useMemo, useState} from 'react'
import {NavLink, Outlet, useNavigate} from 'react-router'
import {KBarProvider} from 'kbar'
import {TopBar} from '@renderer/shell/TopBar'
import {ThemeProvider} from '@renderer/providers/theme-provider'
import {mainNavRoutes, secretNavRoutes} from '@renderer/router'
import {Popover, PopoverContent, PopoverTrigger} from '@renderer/ui/popover'
import {CommandPalette, CommandPaletteActions} from '@renderer/library/command-palette'
import {useNotification} from '@/library/notification'
import {scheduler} from '@shared/bridge'
import {useTimerEngine} from '@/hooks/useTimerEngine'
import {useTimerStore} from '@/store/timer'
import {matchesShortcut} from '@renderer/base/keyboard'

const TIMER_RESET_SHORTCUT = 'ctrl+shift+r'

async function handleReminderAction(actionId: string, extraData: unknown): Promise<void> {
    const data = extraData as { itemId?: string } | undefined
    if (!data?.itemId) return
    const baseId = data.itemId.replace('_lead', '')

    if (actionId.startsWith('snooze')) {
        const mins = actionId === 'snooze' ? 10 : Number(actionId.split('-')[1]) || 10
        try {
            await scheduler?.snooze(baseId, mins)
        } catch (err) {
            console.error('[RootLayout] Snooze failed:', err)
        }
        return
    }

    if (actionId === 'done') {
        try {
            await scheduler?.markDone(baseId)
        } catch (err) {
            console.error('[RootLayout] Mark done failed:', err)
        }
    }
}

// Lives at the root so reminder snooze/done clicks work no matter which page is open.
function useReminderActions(): void {
    useNotification({
        onAction: (actionId, extraData) => {
            void handleReminderAction(actionId, extraData)
        }
    })
}

function SecretButton() {
    const [open, setOpen] = useState(false)
    const navigate = useNavigate()

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <button
                    className="w-5 h-5 rounded-sm bg-transparent border-none outline-none cursor-pointer select-none"
                    aria-label="More pages"
                />
            </PopoverTrigger>
            <PopoverContent align="start" sideOffset={4} className="p-0 w-auto border-subtle bg-overlay shadow-xl rounded-md">
                <div className="flex flex-col py-1">
                    {secretNavRoutes.map(route => {
                        const path = route.index ? '/' : `/${route.path ?? ''}`
                        return (
                            <button
                                key={path}
                                onClick={() => { void navigate(path); setOpen(false) }}
                                className="text-left px-2 py-0.5 text-3xs font-mono text-fg-muted hover:text-fg-primary hover:bg-hover transition-colors whitespace-nowrap"
                            >
                                {route.handle?.title}
                            </button>
                        )
                    })}
                </div>
            </PopoverContent>
        </Popover>
    )
}

export default function RootLayout(): ReactNode {
    const navigate = useNavigate()
    const [topbarVisible, setTopbarVisible] = useState(() => localStorage.getItem('topbar-visible') !== 'false')

    useReminderActions()
    useTimerEngine()

    const inNavRoutes = useMemo(() => mainNavRoutes, [])

    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if (e.ctrlKey && e.shiftKey) {
                if (matchesShortcut(e, TIMER_RESET_SHORTCUT)) {
                    e.preventDefault()
                    const {lastActiveId, reset} = useTimerStore.getState()
                    if (lastActiveId) reset(lastActiveId)
                    return
                }
                const num = parseInt(e.key, 10)
                if (num >= 1 && num <= 9) {
                    const timer = useTimerStore.getState().timers[num - 1]
                    if (!timer) return
                    e.preventDefault()
                    useTimerStore.getState().toggle(timer.id)
                    return
                }
            }
            if (!(e.ctrlKey || e.metaKey)) return
            if (e.key === '\\') {
                e.preventDefault()
                setTopbarVisible(v => { const next = !v; localStorage.setItem('topbar-visible', String(next)); return next; })
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
                style={{ fontFamily: "'Roboto', sans-serif" }}
                className={({ isActive }) =>
                    `px-3 py-1.5 text-3xs font-light uppercase tracking-[0.1em] rounded transition-colors whitespace-nowrap ${
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
            <KBarProvider options={{ toggleShortcut: "$mod+F24" }}>
                <CommandPaletteActions />
                <CommandPalette />
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
            </KBarProvider>
        </ThemeProvider>
    )
}
