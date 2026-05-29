import { type ComponentType } from 'react'
import { type RouteObject } from 'react-router'
import { isElectron, isWeb } from '@/shared/bridge'

import HomePage     from '@/pages/shared/HomePage'
import SettingsPage from '@/pages/shared/SettingsPage'
import JulesPage    from '@/pages/shared/JulesPage'

import ProjectsPage from '@/pages/electron/ProjectsPage'
import ActivityPage from '@/pages/electron/ActivityPage'
import ReposPage    from '@/pages/electron/ReposPage'
import SnapshotPage from '@/pages/electron/SnapshotPage'
import QueuesPage   from '@/pages/electron/QueuesPage'
import SnippetsPage from '@/pages/electron/SnippetsPage'
import NotesPage    from '@/pages/electron/NotesPage'

import OverviewPage from '@/pages/electron/OverviewPage'

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
    { path: 'jules', Component: JulesPage, handle: { title: 'Jules', inNav: true } },
]

// ── electron ──────────────────────────────────────────────────────────────────

const electronRoutes: AppRoute[] = [
    { path: 'projects',     Component: ProjectsPage,  handle: { title: 'Projects', inNav: true } },
    { path: 'repos',        Component: ReposPage,     handle: { title: 'Repos', inNav: true } },
    { path: 'queues',        Component: QueuesPage,   handle: { title: 'Queues', inNav: true } },
    { path: 'snippets',      Component: SnippetsPage, handle: { title: 'Snippets', inNav: true } },
    { path: 'notes',         Component: NotesPage,    handle: { title: 'Notes', inNav: true } },
    { path: 'activity/:id', Component: ActivityPage },
    { path: 'snapshot/:id', Component: SnapshotPage },
    { path: 'overview', Component: OverviewPage, handle: { title: 'Overview', inNav: true } },
]

// ── web ───────────────────────────────────────────────────────────────────────

const webRoutes: AppRoute[] = []

// ── nav export ────────────────────────────────────────────────────────────────

export const navRoutes: AppRoute[] = [
    ...sharedRoutes,
    ...(isElectron ? electronRoutes : []),
    ...(isWeb      ? webRoutes      : []),
]
