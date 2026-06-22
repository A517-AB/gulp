import { ipcMain } from 'electron'
import type { WebContents } from 'electron'
import fs from 'fs-extra'
import * as path from 'path'
import chokidar from 'chokidar'
import { FuseManifest, FUSE_ROOT } from '../src/shared/fuse'
import type { FuseManifest as FuseManifestType } from '../src/shared/fuse'
import { store } from './store'

const EMPTY_MANIFEST: FuseManifestType = { version: 1, items: [] }

function getFuseRoot(): string {
  return (store.get('fuse.root') as string | undefined) ?? FUSE_ROOT
}

function getManifestPath(): string {
  return path.join(getFuseRoot(), 'snippets.json')
}

let manifestCache: FuseManifestType | null = null

async function readManifest(): Promise<FuseManifestType> {
  if (manifestCache) return manifestCache
  const manifestPath = getManifestPath()
  const t = Date.now()
  try {
    const exists = await fs.pathExists(manifestPath)
    if (!exists) {
      console.log(`[fuse] manifest not found at ${manifestPath} — starting empty`)
      return EMPTY_MANIFEST
    }
    const raw: unknown = await fs.readJson(manifestPath)
    const result = FuseManifest.safeParse(raw)
    if (!result.success) {
      console.warn('[fuse] manifest invalid, returning empty:', result.error.issues)
      return EMPTY_MANIFEST
    }
    manifestCache = result.data
    console.log(`[fuse] manifest loaded — ${result.data.items.length} snippets (${Date.now() - t}ms)`)
    return result.data
  } catch (err) {
    console.error(`[fuse] manifest read failed (${Date.now() - t}ms):`, err)
    return EMPTY_MANIFEST
  }
}

export function registerSnippetsHandlers(getWebContents: () => WebContents | null): void {
  // ── manifest ──────────────────────────────────────────────────────────────

  ipcMain.handle('snippets.save', async (_e, data: FuseManifestType) => {
    try {
      const result = FuseManifest.safeParse(data)
      if (!result.success) {
        console.error('[snippets] save → invalid manifest:', result.error.issues)
        return false
      }
      await fs.outputJson(getManifestPath(), result.data, { spaces: 2 })
      manifestCache = result.data
      return true
    } catch (err) {
      console.error('[snippets] save → failed:', err)
      return false
    }
  })

  // ── code file ops ─────────────────────────────────────────────────────────

  ipcMain.handle('snippets.readCode', async (_e, relPath: string): Promise<string> => {
    return fs.readFile(path.join(getFuseRoot(), relPath), 'utf-8')
  })

  ipcMain.handle('snippets.writeCode', async (_e, relPath: string, content: string): Promise<void> => {
    const abs = path.join(getFuseRoot(), relPath)
    await fs.ensureDir(path.dirname(abs))
    await fs.writeFile(abs, content, 'utf-8')
  })

  ipcMain.handle('snippets.deleteCode', async (_e, relPath: string): Promise<void> => {
    await fs.remove(path.join(getFuseRoot(), relPath))
  })

  ipcMain.handle('snippets.getRoot', (): string => getFuseRoot())

  ipcMain.handle('snippets.setRoot', (_e, newRoot: string) => {
    store.set('fuse.root', newRoot)
    manifestCache = null
  })

  // ── watcher (lazy — starts on first snippets.get) ────────────────────────

  let watcherStarted = false
  let debounceTimer: ReturnType<typeof setTimeout> | null = null

  function startWatcher() {
    if (watcherStarted) return
    watcherStarted = true
    const snippetsDir = path.join(getFuseRoot(), 'snippets')
    if (!fs.pathExistsSync(snippetsDir)) {
      console.log(`[fuse] snippets dir not found, skipping watcher (${snippetsDir})`)
      return
    }
    console.log(`[fuse] watching ${snippetsDir}`)
    const watcher = chokidar.watch(snippetsDir, {
      ignoreInitial: true,
      depth: 3,
      ignored: [/(^|[/\\])\./, '**/node_modules/**', '**/dist/**'],
      awaitWriteFinish: { stabilityThreshold: 200, pollInterval: 100 },
    })
    watcher.on('all', (event, filePath) => {
      if (debounceTimer) clearTimeout(debounceTimer)
      debounceTimer = setTimeout(() => {
        manifestCache = null
        console.log(`[fuse] change detected (${event}) — invalidating cache`)
        getWebContents()?.send('snippets.changed', { event, path: filePath })
      }, 300)
    })
    watcher.on('error', (err) => { console.error('[fuse] watcher error:', err) })
  }

  ipcMain.handle('snippets.get', async (): Promise<FuseManifestType> => {
    startWatcher()
    return readManifest()
  })
}
