import { type RouteObject } from 'react-router'
import { isElectron, isWeb } from '@/shared/bridge'

import {
  HomePage,
  SettingsPage,
  JulesPage,
  ProjectsPage,
  ActivityPage,
  ReposPage,
  SnapshotPage,
  QueuesPage,
  SnippetsPage,
  NotesPage,
  OverviewPage,
} from '@/pages'

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

// ── shared ────────────────────────────────────────────────────────────────────

const sharedRoutes: RouteObject[] = [
    { index: true,        Component: HomePage,      handle: { title: 'Home',      inNav: true } },
    { path: 'settings',  Component: SettingsPage,  handle: { title: 'Settings',  inNav: true } },
    { path: 'jules', Component: JulesPage, handle: { title: 'Jules', inNav: true } },
]

// ── electron ──────────────────────────────────────────────────────────────────

const electronRoutes: RouteObject[] = [
    { path: 'projects',     Component: ProjectsPage,  handle: { title: 'Projects', inNav: true } },
    { path: 'repos',        Component: ReposPage,     handle: { title: 'Repos', inNav: true } },
    { path: 'queues',        Component: QueuesPage,   handle: { title: 'Queues', inNav: true } },
    { path: 'snippets',      Component: SnippetsPage, handle: { title: 'Snippets', inNav: true } },
    { path: 'notes',         Component: NotesPage,    handle: { title: 'Notes', inNav: true } },
    { path: 'activity/:id', Component: ActivityPage },
    { path: 'snapshot/:id', Component: SnapshotPage },
    { path: 'overview', Component: OverviewPage, handle: { title: 'Overview', inNav: true } },
]

// ── nav export ────────────────────────────────────────────────────────────────

export const navRoutes: RouteObject[] = [
    ...sharedRoutes,
    ...(isElectron ? electronRoutes : []),
    ...(isWeb      ? webRoutes      : []),
]
