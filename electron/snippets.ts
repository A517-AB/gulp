import { ipcMain, app } from 'electron'
import type { WebContents } from 'electron'
import fs from 'fs-extra'
import * as path from 'path'
import chokidar from 'chokidar'
import {FuseManifest, FUSE_ROOT} from '../src/shared/fuse'
import type { FuseManifest as FuseManifestType } from '../src/shared/fuse'

const MANIFEST_PATH = path.join(app.getAppPath(), 'snippets.json')

const EMPTY_MANIFEST: FuseManifestType = { version: 1, items: [] }

export function registerSnippetsHandlers(getWebContents: () => WebContents | null): void {
  console.log('[snippets] registering handlers')
  console.log('[snippets] manifest path:', MANIFEST_PATH)
  console.log('[snippets] fuse root:', FUSE_ROOT)

  // ── manifest (D:\LAST\snippets.json) ──────────────────────────────────────

  ipcMain.handle('snippets.get', async (): Promise<FuseManifestType> => {
    console.log('[snippets] get → reading', MANIFEST_PATH)
    try {
        const raw: unknown = await fs.readJson(MANIFEST_PATH)
      const result = FuseManifest.safeParse(raw)
      if (!result.success) {
        console.warn('[snippets] get → manifest invalid, returning empty:', result.error.issues)
        return EMPTY_MANIFEST
      }
        console.log(`[snippets] get → ok, ${String(result.data.items.length)} items`)
      return result.data
    } catch (err) {
      console.warn('[snippets] get → no manifest yet, returning empty:', (err as Error).message)
      return EMPTY_MANIFEST
    }
  })

  ipcMain.handle('snippets.save', async (_e, data: FuseManifestType) => {
      console.log(`[snippets] save → ${String(data.items.length)} items → ${MANIFEST_PATH}`)
    try {
      const result = FuseManifest.safeParse(data)
      if (!result.success) {
        console.error('[snippets] save → invalid manifest, rejected:', result.error.issues)
        return false
      }
      await fs.outputJson(MANIFEST_PATH, result.data, { spaces: 2 })
      console.log('[snippets] save → ok')
      return true
    } catch (err) {
      console.error('[snippets] save → failed:', err)
      return false
    }
  })

    // ── code file ops (relative to FUSE_ROOT) ────────────────────────────────

    ipcMain.handle('snippets.readCode', async (_e, relPath: string): Promise<string> => {
        const abs = path.join(FUSE_ROOT, relPath)
        return fs.readFile(abs, 'utf-8')
    })

    ipcMain.handle('snippets.writeCode', async (_e, relPath: string, content: string): Promise<void> => {
        const abs = path.join(FUSE_ROOT, relPath)
        await fs.ensureDir(path.dirname(abs))
        await fs.writeFile(abs, content, 'utf-8')
    })

    ipcMain.handle('snippets.deleteCode', async (_e, relPath: string): Promise<void> => {
        const abs = path.join(FUSE_ROOT, relPath)
        await fs.remove(abs)
    })

  // ── watcher ───────────────────────────────────────────────────────────────

    const snippetsDir = path.join(FUSE_ROOT, 'snippets')
    console.log('[snippets] watching', snippetsDir)
    const watcher = chokidar.watch(snippetsDir, {
    ignoreInitial: true,
    depth: 3,
        ignored: [/(^|[\/\\])\../, '**/node_modules/**', '**/dist/**'],
    awaitWriteFinish: { stabilityThreshold: 200, pollInterval: 100 },
  })

  watcher.on('ready', () => {
      console.log('[snippets] watcher ready on', snippetsDir)
  })

  watcher.on('all', (event, filePath) => {
    console.log(`[snippets] watcher → ${event}: ${filePath}`)
    getWebContents()?.send('snippets.changed', { event, path: filePath })
  })

  watcher.on('error', (err) => {
    console.error('[snippets] watcher error:', err)
  })
}
