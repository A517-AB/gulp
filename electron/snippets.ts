import { ipcMain, app } from 'electron'
import type { WebContents } from 'electron'
import fs from 'fs-extra'
import * as path from 'path'
import chokidar from 'chokidar'
import { FuseManifest } from '../src/shared/fuse'
import type { FuseManifest as FuseManifestType } from '../src/shared/fuse'

const MANIFEST_PATH = path.join(app.getAppPath(), 'snippets.json')
export const FUSE_ROOT = 'D:/fuse'

const EMPTY_MANIFEST: FuseManifestType = { version: 1, items: [] }

export function registerSnippetsHandlers(getWebContents: () => WebContents | null): void {
  console.log('[snippets] registering handlers')
  console.log('[snippets] manifest path:', MANIFEST_PATH)
  console.log('[snippets] fuse root:', FUSE_ROOT)

  // ── manifest (D:\LAST\snippets.json) ──────────────────────────────────────

  ipcMain.handle('snippets.get', async (): Promise<FuseManifestType> => {
    console.log('[snippets] get → reading', MANIFEST_PATH)
    try {
      const raw = await fs.readJson(MANIFEST_PATH)
      const result = FuseManifest.safeParse(raw)
      if (!result.success) {
        console.warn('[snippets] get → manifest invalid, returning empty:', result.error.issues)
        return EMPTY_MANIFEST
      }
      console.log(`[snippets] get → ok, ${result.data.items.length} items`)
      return result.data
    } catch (err) {
      console.warn('[snippets] get → no manifest yet, returning empty:', (err as Error).message)
      return EMPTY_MANIFEST
    }
  })

  ipcMain.handle('snippets.save', async (_e, data: FuseManifestType) => {
    console.log(`[snippets] save → ${data.items?.length ?? 0} items → ${MANIFEST_PATH}`)
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

  // ── watcher ───────────────────────────────────────────────────────────────

  console.log('[snippets] watching', FUSE_ROOT)
  const watcher = chokidar.watch(FUSE_ROOT, {
    ignoreInitial: true,
    depth: 3,
    awaitWriteFinish: { stabilityThreshold: 200, pollInterval: 100 },
  })

  watcher.on('ready', () => {
    console.log('[snippets] watcher ready on', FUSE_ROOT)
  })

  watcher.on('all', (event, filePath) => {
    console.log(`[snippets] watcher → ${event}: ${filePath}`)
    getWebContents()?.send('snippets.changed', { event, path: filePath })
  })

  watcher.on('error', (err) => {
    console.error('[snippets] watcher error:', err)
  })
}
