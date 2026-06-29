import {createHashRouter, type RouteObject} from 'react-router'

// RouteObject cast needed: exactOptionalPropertyTypes makes children?: X[] incompatible with RouteObject[]
import {isElectron, isWeb} from '@shared/bridge'
import RootLayout from '@renderer/layouts/RootLayout'
import {RouteErrorBoundary} from '@renderer/core/ErrorBoundary'
import HomePage from '@renderer/pages/shared/HomePage'
import NotesPage from '@renderer/pages/shared/NotesPage'
import JulesPage from '@renderer/pages/shared/JulesPage'
import {ExplorerPage} from '@renderer/pages/electron/ExplorerPage'
import ShipPage from '@renderer/pages/electron/ShipPage'
import SessionsPage from '@renderer/pages/electron/SessionsPage'
import OverviewPage from '@renderer/pages/web/OverviewPage'
import QueuesPage from '@renderer/pages/electron/QueuesPage'
import TardisPage from '@renderer/pages/electron/TardisPage'
import ReplPage from '@renderer/pages/electron/ReplPage'

// ── dev ───────────────────────────────────────────────────────────────────────

if (import.meta.env.DEV) {
    console.log('[router] platform:', { isElectron, isWeb })

    if (!isElectron && !isWeb) {
        console.warn('[router] neither isElectron nor isWeb is true — check @shared/bridge')
    }

    if (isElectron && isWeb) {
        console.warn('[router] both isElectron and isWeb are true — this is probably wrong')
    }
}

// ── types ─────────────────────────────────────────────────────────────────────

export type AppRoute = Omit<RouteObject, 'handle'> & {
    handle?: { title: string; inNav?: boolean; inSecretNav?: boolean }
}

// ── shared ────────────────────────────────────────────────────────────────────

const sharedRoutes: AppRoute[] = [
    {index: true, Component: HomePage, handle: {title: 'Home', inNav: true}},
    { path: 'session', Component: JulesPage,  handle: { title: 'Sessions', inNav: true } },
    { path: 'overview', Component: OverviewPage, handle: { title: 'Overview', inNav: true } },
    {path: 'notes', Component: NotesPage, handle: {title: 'Notes', inNav: true}},
    {path: 'queues', Component: QueuesPage, handle: {title: 'Queues', inNav: true}},
    { path: 'settings', lazy: () => import('@renderer/pages/shared/settings/SettingsPage').then(m => ({ Component: m.default })), handle: { title: 'Settings', inSecretNav: true } },
    // 2026-06-22: For later, not for dev
    // { path: 'gantt',    lazy: () => import('@renderer/pages/electron/GanttPage').then(m => ({ Component: m.default })),           handle: { title: 'Gantt',    inSecretNav: true } },
    // { path: 'jules', lazy: () => import('@renderer/pages/web/jules/JulesWebPage').then(m => ({ Component: m.default })), handle: { title: 'Jules (Web)', inNav: true } },
    { path: 'kit',       lazy: () => import('@renderer/pages/electron/KitPage').then(m => ({ Component: m.default })),       handle: { title: 'Kit',       inSecretNav: true } },

]

// ── electron ──────────────────────────────────────────────────────────────────

const electronRoutes: AppRoute[] = [
    { path: 'snippets',  lazy: () => import('@renderer/pages/electron/SnippetsPage').then(m => ({ Component: m.SnippetsPage })), handle: { title: 'Snippets', inSecretNav: true } },
    { path: 'explorer',  Component: ExplorerPage, handle: { title: 'Explorer',  inNav: true } },
    { path: 'tardis',    Component: TardisPage,    handle: { title: 'Tardis',    inNav: true } },
    { path: 'time',      lazy: () => import('@renderer/pages/electron/TimePage').then(m => ({ Component: m.default })),      handle: { title: 'Time',      inSecretNav: true } },
    { path: 'timer',     lazy: () => import('@renderer/pages/electron/TimerPage').then(m => ({ Component: m.default })),     handle: { title: 'Timer',     inSecretNav: true } },
    { path: 'ship',      Component: ShipPage, handle: { title: 'Ship', inNav: true } },
    { path: 'sessions',  Component: SessionsPage, handle: { title: 'Sessions', inNav: true } },
    { path: 'reminders', lazy: () => import('@renderer/pages/electron/RemindersPage').then(m => ({ Component: m.default })), handle: { title: 'Reminders', inSecretNav: true } },
    { path: 'repl',      Component: ReplPage, handle: { title: 'REPL', inNav: true } },
    // 2026-06-22: For later, not for dev
    // { path: 'reading',   lazy: () => import('@renderer/pages/electron/ReadingPage').then(m => ({ Component: m.default })),   handle: { title: 'Reading',   inSecretNav: true } },
]

// ── web ───────────────────────────────────────────────────────────────────────
// keeping the web idea for just backup, don't remove or fickle or didle iwth
const webRoutes: AppRoute[] = []

// ── nav export ────────────────────────────────────────────────────────────────

const allRoutes: AppRoute[] = [
    ...sharedRoutes,
    ...(isElectron ? electronRoutes : []),
    ...(isWeb      ? webRoutes      : []),
]

export const navRoutes       = allRoutes
export const mainNavRoutes   = allRoutes.filter(r => r.handle?.inNav)
export const secretNavRoutes = allRoutes.filter(r => r.handle?.inSecretNav)

// ── router ────────────────────────────────────────────────────────────────────

export const router = createHashRouter([
    {
        path: '/',
        id: 'root',
        Component: RootLayout,
        HydrateFallback: () => null,
        errorElement: <RouteErrorBoundary />,
        children: navRoutes as RouteObject[],
    },
])
