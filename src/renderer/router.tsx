import {createHashRouter, type RouteObject} from 'react-router'
// RouteObject cast needed: exactOptionalPropertyTypes makes children?: X[] incompatible with RouteObject[]
import {isElectron, isWeb} from '@shared/bridge'
import {useStore} from '@renderer/store/app'
import RootLayout from '@renderer/layouts/RootLayout'
import {RouteErrorBoundary} from '@renderer/core/ErrorBoundary'
import HomePage from '@renderer/pages/shared/HomePage'
import SettingsPage from '@renderer/pages/shared/settings/SettingsPage'
import JulesPage from '@renderer/pages/shared/JulesPage'
import NotesPage from '@renderer/pages/shared/NotesPage'
import ActivityPage from '@renderer/pages/electron/ActivityPage'
import SnapshotPage from '@renderer/pages/electron/SnapshotPage'
import QueuesPage from '@renderer/pages/electron/QueuesPage'
import {SnippetsPage} from '@renderer/pages/electron/SnippetsPage'
import {ExplorerPage} from '@renderer/pages/electron/ExplorerPage'
import TardisPage from '@renderer/pages/electron/TardisPage'
import ShipPage from '@renderer/pages/electron/ShipPage'
import KitPage from '@renderer/pages/electron/KitPage'
import TimePage from '@renderer/pages/electron/TimePage'
import OverviewPage from '@renderer/pages/web/OverviewPage'

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
    handle?: { title: string; inNav?: boolean }
}

// ── shared ────────────────────────────────────────────────────────────────────

const sharedRoutes: AppRoute[] = [
    { index: true,       Component: HomePage,     handle: { title: 'Home',      inNav: true } },
    { path: 'settings',  Component: SettingsPage, handle: { title: 'Settings',  inNav: true } },
    { path: 'session',   Component: JulesPage,    handle: { title: 'Sessions',  inNav: true } },
    { path: 'overview',  Component: OverviewPage, handle: { title: 'Overview',  inNav: true } },
    { path: 'notes',     Component: NotesPage,    handle: { title: 'Notes',     inNav: true } },
    { path: 'gantt',     lazy: () => import('@renderer/pages/electron/GanttPage').then(m => ({ Component: m.default })), handle: { title: 'Gantt',     inNav: true } },
]

// ── electron ──────────────────────────────────────────────────────────────────

const electronRoutes: AppRoute[] = [
    { path: 'queues',       Component: QueuesPage,   handle: { title: 'Queues',   inNav: true } },
    { path: 'snippets',     Component: SnippetsPage, handle: { title: 'Snippets', inNav: true } },
    {path: 'explorer', Component: ExplorerPage, handle: {title: 'Explorer', inNav: true}},
    {path: 'tardis', Component: TardisPage, handle: {title: 'Tardis', inNav: true}},
    {path: 'time',   Component: TimePage,   handle: {title: 'Time',   inNav: true}},
    {path: 'ship',  Component: ShipPage,  handle: {title: 'Ship',  inNav: true}},
    ...(import.meta.env.DEV ? [{ path: 'kit', Component: KitPage, handle: { title: 'Kit', inNav: true } }] : []),
    { path: 'activity/:id', Component: ActivityPage },
    { path: 'snapshot/:id', Component: SnapshotPage },
]

// ── web ───────────────────────────────────────────────────────────────────────
// keeping the web idea for just backup, don't remove or fickle or didle iwth
const webRoutes: AppRoute[] = []

// ── nav export ────────────────────────────────────────────────────────────────

export const navRoutes: AppRoute[] = [
    ...sharedRoutes,
    ...(isElectron ? electronRoutes : []),
    ...(isWeb      ? webRoutes      : []),
]

// ── router ────────────────────────────────────────────────────────────────────

export const router = createHashRouter([
    {
        path: '/',
        Component: RootLayout,
        HydrateFallback: () => null,
        errorElement: <RouteErrorBoundary />,
        loader: () => useStore.getState().sync().then(() => null),
        children: navRoutes as RouteObject[],
    },
])
