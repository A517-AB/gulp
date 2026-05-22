import type { DiagnosticItem, DesktopBridge, ShellSnapshot, WorkspacePreferences } from '../shared/bridge'
import { createDefaultPreferences } from '../shared/bridge'

interface OverviewCard {
  label: string
  value: string
  hint: string
}

export interface OverviewData {
  cards: OverviewCard[]
  recentFiles: ShellSnapshot['files']
  folders: string[]
  lastScanAt: string
  projectRoot: string
  cacheMode: string
  crashGuard: boolean
}

export interface WorkspacePageData {
  preferences: WorkspacePreferences
  scripts: string[]
  folders: string[]
  files: ShellSnapshot['files']
  projectRoot: string
}

export interface DiagnosticsPageData {
  items: DiagnosticItem[]
  inspectedAt: string
}

const browserPreferencesKey = 'last.workspace.preferences'
const cacheStore = new Map<string, { expiresAt: number; promise: Promise<unknown> }>()

function getBridge(): DesktopBridge | null {
  if (typeof window === 'undefined') {
    return null
  }

  if (!window.lastBridge) {
    console.info('[renderer:bridge] lastBridge unavailable, using browser fallback')
  }

  return window.lastBridge ?? null
}

function toTitleCase(input: string) {
  return input.charAt(0).toUpperCase() + input.slice(1)
}

function withCache<T>(key: string, ttlMs: number, factory: () => Promise<T>, force = false) {
  const cached = cacheStore.get(key)

  if (!force && cached && cached.expiresAt > Date.now()) {
    return cached.promise as Promise<T>
  }

  const promise = factory()
  cacheStore.set(key, {
    expiresAt: Date.now() + ttlMs,
    promise,
  })

  return promise
}

function readBrowserPreferences() {
  const fallback = createDefaultPreferences()

  if (typeof window === 'undefined') {
    return fallback
  }

  try {
    const raw = window.localStorage.getItem(browserPreferencesKey)

    if (!raw) {
      return fallback
    }

    return {
      ...fallback,
      ...(JSON.parse(raw) as WorkspacePreferences),
    }
  } catch {
    return fallback
  }
}

function writeBrowserPreferences(input: WorkspacePreferences) {
  if (typeof window === 'undefined') {
    return
  }

  window.localStorage.setItem(browserPreferencesKey, JSON.stringify(input))
}

function createBrowserSnapshot(): ShellSnapshot {
  const preferences = readBrowserPreferences()

  return {
    appName: 'last',
    appVersion: '0.1.0',
    platform: navigator.platform || 'web',
    projectRoot: 'browser://renderer',
    sourceFolders: ['src/renderer', 'src/electron'],
    scripts: ['dev', 'build', 'typecheck', 'lint', 'start'],
    preferences,
    files: [
      {
        name: 'router.tsx',
        path: 'src/renderer/router.tsx',
        bytes: 4096,
        updatedAt: new Date().toISOString(),
      },
      {
        name: 'main.mts',
        path: 'src/electron/main.mts',
        bytes: 3072,
        updatedAt: new Date().toISOString(),
      },
      {
        name: 'preload.mts',
        path: 'src/electron/preload.mts',
        bytes: 1024,
        updatedAt: new Date().toISOString(),
      },
    ],
    lastScanAt: new Date().toISOString(),
  }
}

function createBrowserDiagnostics(): DiagnosticItem[] {
  const now = new Date().toISOString()

  return [
    {
      id: 'browser-router',
      level: 'stable',
      title: 'Hash data router is active',
      detail: 'The browser fallback still exercises the same route loaders and action shapes.',
      hint: 'You can keep building route modules before switching the Electron shell fully on.',
      updatedAt: now,
    },
    {
      id: 'browser-bridge',
      level: 'warning',
      title: 'Electron bridge is not attached in pure web mode',
      detail: 'The renderer is running with a browser-safe fallback so route code can stay alive.',
      hint: 'Once Electron boots, the same loader calls will pick up the preload bridge automatically.',
      updatedAt: now,
    },
    {
      id: 'runtime-boundary',
      level: 'stable',
      title: 'Runtime boundary wraps RouterProvider',
      detail: 'A top-level React error boundary prevents a render crash from blanking the entire shell.',
      hint: 'Only consider removing it after the route tree and bridge contract stop changing daily.',
      updatedAt: now,
    },
  ]
}

export async function loadShellSnapshot(force = false) {
  return withCache('shell', 12_000, async () => {
    const bridge = getBridge()

    if (bridge) {
      console.info('[renderer:bridge] loading shell snapshot from preload bridge', { force })
      return bridge.getShellSnapshot()
    }

    console.info('[renderer:bridge] loading shell snapshot from browser fallback', { force })
    return createBrowserSnapshot()
  }, force)
}

export async function loadOverviewPageData(force = false): Promise<OverviewData> {
  const snapshot = await loadShellSnapshot(force)

  return {
    cards: [
      {
        label: 'Runtime',
        value: `${snapshot.appName} ${snapshot.appVersion}`,
        hint: `Running on ${snapshot.platform}`,
      },
      {
        label: 'Cache policy',
        value: toTitleCase(snapshot.preferences.cacheStrategy),
        hint: 'Loader data is memoized with short-lived route-safe caches.',
      },
      {
        label: 'Crash guard',
        value: snapshot.preferences.crashGuard ? 'Enabled' : 'Disabled',
        hint: 'The outer runtime boundary stays up while route code is still moving.',
      },
    ],
    recentFiles: snapshot.files.slice(0, 4),
    folders: snapshot.sourceFolders,
    lastScanAt: snapshot.lastScanAt,
    projectRoot: snapshot.projectRoot,
    cacheMode: snapshot.preferences.cacheStrategy,
    crashGuard: snapshot.preferences.crashGuard,
  }
}

export async function loadWorkspacePageData(force = false): Promise<WorkspacePageData> {
  const snapshot = await loadShellSnapshot(force)

  return {
    preferences: snapshot.preferences,
    scripts: snapshot.scripts,
    folders: snapshot.sourceFolders,
    files: snapshot.files,
    projectRoot: snapshot.projectRoot,
  }
}

export async function loadDiagnosticsPageData(force = false): Promise<DiagnosticsPageData> {
  return withCache('diagnostics', 6_000, async () => {
    const bridge = getBridge()
    console.info('[renderer:bridge] loading diagnostics', {
      force,
      source: bridge ? 'preload' : 'browser',
    })
    const items = bridge ? await bridge.getDiagnostics(force) : createBrowserDiagnostics()

    return {
      items,
      inspectedAt: new Date().toISOString(),
    }
  }, force)
}

export async function saveWorkspacePreferences(input: WorkspacePreferences) {
  const bridge = getBridge()

  if (bridge) {
    const saved = await bridge.savePreferences(input)
    cacheStore.delete('shell')
    cacheStore.delete('diagnostics')
    return saved
  }

  writeBrowserPreferences(input)
  cacheStore.delete('shell')
  cacheStore.delete('diagnostics')

  return input
}