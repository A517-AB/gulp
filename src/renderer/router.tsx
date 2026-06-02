import { createHashRouter, type RouteObject } from 'react-router'
// RouteObject cast needed: exactOptionalPropertyTypes makes children?: X[] incompatible with RouteObject[]
import { isElectron, isWeb } from '@shared/bridge'
import RootLayout from '@renderer/layouts/RootLayout'
import { RouteErrorBoundary } from '@renderer/core/ErrorBoundary'

// ── types ─────────────────────────────────────────────────────────────────────

export type AppRoute = Omit<RouteObject, 'handle'> & {
    handle?: { title: string; inNav?: boolean }
}

// ── shared ────────────────────────────────────────────────────────────────────

const sharedRoutes: AppRoute[] = [
    { index: true,       lazy: async () => ({ Component: (await import('@renderer/pages/shared/HomePage')).default }), handle: { title: 'Home',      inNav: true } },
    { path: 'settings',  lazy: async () => ({ Component: (await import('@renderer/pages/shared/settings/SettingsPage')).default }), handle: { title: 'Settings',  inNav: true } },
    { path: 'session',   lazy: async () => ({ Component: (await import('@renderer/pages/shared/JulesPage')).default }), handle: { title: 'Sessions',  inNav: true } },
    { path: 'overview',  lazy: async () => ({ Component: (await import('@renderer/pages/web/overview/OverviewPage')).default }), handle: { title: 'Overview',  inNav: true } },
    { path: 'notes',     lazy: async () => ({ Component: (await import('@renderer/pages/shared/NotesPage')).default }), handle: { title: 'Notes',     inNav: true } },
]

// ── electron ──────────────────────────────────────────────────────────────────

const electronRoutes: AppRoute[] = [
    { path: 'repos',        lazy: async () => ({ Component: (await import('@renderer/pages/electron/ReposPage')).default }), handle: { title: 'Repos',    inNav: true } },
    { path: 'queues',       lazy: async () => ({ Component: (await import('@renderer/pages/electron/QueuesPage')).default }), handle: { title: 'Queues',   inNav: true } },
    { path: 'snippets',     lazy: async () => ({ Component: (await import('@renderer/pages/electron/SnippetsPage')).SnippetsPage }), handle: { title: 'Snippets', inNav: true } },
    { path: 'hub',           lazy: async () => ({ Component: (await import('@renderer/pages/electron/HubPage')).default }),    handle: { title: 'Hub',      inNav: true } },
    { path: 'activity/:id', lazy: async () => ({ Component: (await import('@renderer/pages/electron/ActivityPage')).default }) },
    { path: 'snapshot/:id', lazy: async () => ({ Component: (await import('@renderer/pages/electron/SnapshotPage')).default }) },
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
        HydrateFallback: () => null,
        errorElement: <RouteErrorBoundary />,
        children: navRoutes as RouteObject[],
    },
])