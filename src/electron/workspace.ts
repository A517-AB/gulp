import { promises as fs } from 'node:fs'
import { join, relative } from 'node:path'
import type { DiagnosticItem, ShellSnapshot, SourceFileSummary } from '../shared/bridge'
import { projectRoot } from './paths'
import { readPreferences } from './preferences'

async function pathExists(targetPath: string) {
  try {
    await fs.access(targetPath)
    return true
  } catch {
    return false
  }
}

async function readPackageMeta() {
  const packagePath = join(projectRoot, 'package.json')
  const raw = await fs.readFile(packagePath, 'utf8')
  const parsed = JSON.parse(raw) as {
    name?: string
    version?: string
    scripts?: Record<string, string>
  }

  return {
    name: parsed.name ?? 'last',
    version: parsed.version ?? '0.1.0',
    scripts: Object.keys(parsed.scripts ?? {}),
  }
}

async function collectDirectoryFiles(relativeDirectory: string, limit: number) {
  const directoryPath = join(projectRoot, relativeDirectory)

  try {
    const entries = await fs.readdir(directoryPath, { withFileTypes: true })
    const files = await Promise.all(
      entries
        .filter((entry) => entry.isFile())
        .slice(0, limit)
        .map(async (entry): Promise<SourceFileSummary> => {
          const absolutePath = join(directoryPath, entry.name)
          const stats = await fs.stat(absolutePath)

          return {
            name: entry.name,
            path: relative(projectRoot, absolutePath).replaceAll('\\', '/'),
            bytes: stats.size,
            updatedAt: stats.mtime.toISOString(),
          }
        }),
    )

    return files.sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))
  } catch {
    return []
  }
}

export async function getShellSnapshot(): Promise<ShellSnapshot> {
  const [packageMeta, preferences, rendererFiles, electronFiles] = await Promise.all([
    readPackageMeta(),
    readPreferences(),
    collectDirectoryFiles('src/renderer', 6),
    collectDirectoryFiles('src/electron', 8),
  ])

  return {
    appName: packageMeta.name,
    appVersion: packageMeta.version,
    platform: process.platform,
    projectRoot,
    sourceFolders: ['src/renderer', 'src/electron'],
    scripts: packageMeta.scripts,
    preferences,
    files: [...rendererFiles, ...electronFiles].slice(0, 10),
    lastScanAt: new Date().toISOString(),
  }
}

export async function getDiagnostics(): Promise<DiagnosticItem[]> {
  const [snapshot, hasRouterFile, hasMainFile, hasPreloadFile] = await Promise.all([
    getShellSnapshot(),
    pathExists(join(projectRoot, 'src', 'renderer', 'router.tsx')),
    pathExists(join(projectRoot, 'src', 'electron', 'main.mts')),
    pathExists(join(projectRoot, 'src', 'electron', 'preload.mts')),
  ])

  return [
    {
      id: 'router-shape',
      level: hasRouterFile ? 'stable' : 'blocking',
      title: 'Hash data router surface',
      detail: hasRouterFile
        ? 'The renderer route tree is present and can host nested pages, loaders, and actions.'
        : 'The route tree file is missing, so the renderer cannot compose nested routes yet.',
      hint: 'Keep the root layout and route error boundary while the route map is still growing.',
      updatedAt: snapshot.lastScanAt,
    },
    {
      id: 'electron-main',
      level: hasMainFile ? 'stable' : 'blocking',
      title: 'Electron main process entry',
      detail: hasMainFile
        ? 'The main process entry exists and now emits a real .mjs output for Electron.'
        : 'The main process entry is missing, so Electron cannot boot the shell.',
      hint: 'Keep window creation and IPC registration separated so failures stay local.',
      updatedAt: snapshot.lastScanAt,
    },
    {
      id: 'electron-preload',
      level: hasPreloadFile ? 'stable' : 'blocking',
      title: 'Preload bridge contract',
      detail: hasPreloadFile
        ? 'The preload entry exists and emits a matching .mjs file for the BrowserWindow bridge.'
        : 'The preload entry is missing, so the renderer has no safe bridge into Electron.',
      hint: 'Keep the exposed API narrow so later route loaders do not become a dumping ground.',
      updatedAt: snapshot.lastScanAt,
    },
    {
      id: 'crash-guard',
      level: snapshot.preferences.crashGuard ? 'stable' : 'warning',
      title: 'Crash guard preference',
      detail: snapshot.preferences.crashGuard
        ? 'The outer runtime boundary is enabled in your saved workspace preferences.'
        : 'The crash guard preference is off, so route-level failures will be more visible during edits.',
      hint: 'Turn it off only after the bridge contract and route actions are routine instead of volatile.',
      updatedAt: snapshot.lastScanAt,
    },
  ]
}