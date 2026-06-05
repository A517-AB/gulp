import { createHashRouter, type RouteObject } from 'react-router'
// RouteObject cast needed: exactOptionalPropertyTypes makes children?: X[] incompatible with RouteObject[]
import { isElectron, isWeb } from '@shared/bridge'
import RootLayout from '@renderer/layouts/RootLayout'
import { RouteErrorBoundary } from '@renderer/core/ErrorBoundary'
import HomePage from '@renderer/pages/shared/HomePage'
import SettingsPage from '@renderer/pages/shared/settings/SettingsPage'
import JulesPage from '@renderer/pages/shared/JulesPage'
import JuliePage from '@renderer/pages/shared/JuliePage'
import NotesPage from '@renderer/pages/shared/NotesPage'
import ActivityPage from '@renderer/pages/electron/ActivityPage'
import ReposPage from '@renderer/pages/electron/ReposPage'
import SnapshotPage from '@renderer/pages/electron/SnapshotPage'
import QueuesPage from '@renderer/pages/electron/QueuesPage'
import { SnippetsPage } from '@renderer/pages/electron/SnippetsPage'
import HubPage from '@renderer/pages/electron/HubPage'
import SessionsPage from '@renderer/pages/electron/SessionsPage'
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
    { path: 'julie',     Component: JuliePage,    handle: { title: 'Julie',     inNav: true } },
    { path: 'overview',  Component: OverviewPage, handle: { title: 'Overview',  inNav: true } },
    { path: 'notes',     Component: NotesPage,    handle: { title: 'Notes',     inNav: true } },
]

// ── electron ──────────────────────────────────────────────────────────────────

const electronRoutes: AppRoute[] = [
    { path: 'repos',        Component: ReposPage,    handle: { title: 'Repos',    inNav: true } },
    { path: 'queues',       Component: QueuesPage,   handle: { title: 'Queues',   inNav: true } },
    { path: 'snippets',     Component: SnippetsPage, handle: { title: 'Snippets', inNav: true } },
    { path: 'hub',          Component: HubPage,      handle: { title: 'Hub',      inNav: true } },
    { path: 'sessions',     Component: SessionsPage, handle: { title: 'Sessions', inNav: true } },
    { path: 'activity/:id', Component: ActivityPage },
    { path: 'snapshot/:id', Component: SnapshotPage },
]

// ── web ───────────────────────────────────────────────────────────────────────

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
        errorElement: <RouteErrorBoundary />,
        children: navRoutes as RouteObject[],
    },
])
