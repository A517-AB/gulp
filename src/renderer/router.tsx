import { createHashRouter, type RouteObject } from 'react-router'
// RouteObject cast needed: exactOptionalPropertyTypes makes children?: X[] incompatible with RouteObject[]
import { isElectron, isWeb } from '@shared/bridge'
import { RootLayout } from '@renderer/layouts'
import { RouteErrorBoundary } from '@renderer/core'
import {
    HomePage, SettingsPage, JulesPage,
} from '@renderer/pages/shared'
import {
    ProjectsPage, SessionsPage,
    ActivityPage, ReposPage, SnapshotPage, QueuesPage
} from '@renderer/pages/electron'
import {
    OverviewPage,
} from '@renderer/pages/web'

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
    { index: true,        Component: HomePage,      handle: { title: 'Home',      inNav: true } },
    { path: 'settings',  Component: SettingsPage,  handle: { title: 'Settings',  inNav: true } },
    { path: 'jules', Component: JulesPage, handle: { title: 'Jules', inNav: true } },
]

// ── electron ──────────────────────────────────────────────────────────────────

const electronRoutes: AppRoute[] = [
    { path: 'projects',     Component: ProjectsPage,  handle: { title: 'Projects', inNav: true } },
    { path: 'sessions',     Component: SessionsPage,  handle: { title: 'Sessions', inNav: true } },
    { path: 'queues',       Component: QueuesPage,    handle: { title: 'Queues', inNav: true } },
    { path: 'repos',        Component: ReposPage,     handle: { title: 'Repos', inNav: true } },
    { path: 'activity/:id', Component: ActivityPage },
    { path: 'snapshot/:id', Component: SnapshotPage },
]

// ── web ───────────────────────────────────────────────────────────────────────

const webRoutes: AppRoute[] = [
    { path: 'overview', Component: OverviewPage, handle: { title: 'Overview', inNav: true } },
]

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