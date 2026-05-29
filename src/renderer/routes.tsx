import { lazy, type ComponentType } from 'react'
import { type RouteObject } from 'react-router'
import { isElectron, isWeb } from '@/shared/bridge'

const HomePage     = lazy(() => import('@/pages/shared/HomePage'))
const SettingsPage = lazy(() => import('@/pages/shared/SettingsPage'))
const JulesPage    = lazy(() => import('@/pages/shared/JulesPage'))

const ProjectsPage = lazy(() => import('@/pages/electron/ProjectsPage'))
const ActivityPage = lazy(() => import('@/pages/electron/ActivityPage'))
const ReposPage    = lazy(() => import('@/pages/electron/ReposPage'))
const SnapshotPage = lazy(() => import('@/pages/electron/SnapshotPage'))
const QueuesPage   = lazy(() => import('@/pages/electron/QueuesPage'))
const SnippetsPage = lazy(() => import('@/pages/electron/SnippetsPage'))

const OverviewPage = lazy(() => import('@/pages/web/OverviewPage'))

// ── dev ───────────────────────────────────────────────────────────────────────

if (import.meta.env.DEV) {
    console.log('[router] platform:', { isElectron, isWeb })

    if (!isElectron && !isWeb) {
        console.warn('[router] neither isElectron nor isWeb is true — check @/shared/bridge')
    }

    if (isElectron && isWeb) {
        console.warn('[router] both isElectron and isWeb are true — this is probably wrong')
    }
}

// ── types ─────────────────────────────────────────────────────────────────────

export type AppRoute = Omit<RouteObject, 'handle'> & {
    handle?: { title: string; inNav?: boolean; lowPowerView?: ComponentType }
}

// ── shared ────────────────────────────────────────────────────────────────────

const sharedRoutes: AppRoute[] = [
    { index: true,        Component: HomePage,      handle: { title: 'Home',      inNav: true } },
    { path: 'settings',  Component: SettingsPage,  handle: { title: 'Settings',  inNav: true } },
    { path: 'jules', Component: JulesPage, handle: { title: 'Sessions', inNav: true } },
]

// ── electron ──────────────────────────────────────────────────────────────────

const electronRoutes: AppRoute[] = [
    { path: 'projects',     Component: ProjectsPage,  handle: { title: 'Projects', inNav: true } },
    { path: 'repos',        Component: ReposPage,     handle: { title: 'Repos', inNav: true } },
    { path: 'queues',        Component: QueuesPage,   handle: { title: 'Queues', inNav: true } },
    { path: 'snippets',      Component: SnippetsPage, handle: { title: 'Snippets', inNav: true } },
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
