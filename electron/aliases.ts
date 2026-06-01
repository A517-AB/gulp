import { ipcMain, app } from 'electron'
import type { WebContents } from 'electron'
import fs from 'fs-extra'
import * as path from 'path'
import chokidar from 'chokidar'
import type { JulesAlias } from '../src/shared/aliases'

const ALIASES_PATH = path.join(app.getAppPath(), 'aliases.json')

export function registerAliasesHandlers(getWebContents: () => WebContents | null): void {
  console.log('[aliases] registering, path:', ALIASES_PATH)

  ipcMain.handle('aliases.get', async (): Promise<{ aliases: JulesAlias[]; fileFound: boolean }> => {
    try {
      const exists = await fs.pathExists(ALIASES_PATH)
      if (!exists) return { aliases: [], fileFound: false }
      const raw = await fs.readJson(ALIASES_PATH)
      return { aliases: Array.isArray(raw) ? (raw as JulesAlias[]) : [], fileFound: true }
    } catch {
      return { aliases: [], fileFound: false }
    }
  })

  let lastSaveAt = 0

  ipcMain.handle('aliases.save', async (_e, aliases: JulesAlias[]): Promise<boolean> => {
    try {
      lastSaveAt = Date.now()
      await fs.outputJson(ALIASES_PATH, aliases, { spaces: 2 })
      return true
    } catch (err) {
      console.error('[aliases] save failed:', err)
      return false
    }
  })

  const watcher = chokidar.watch(ALIASES_PATH, {
    ignoreInitial: true,
    awaitWriteFinish: { stabilityThreshold: 200, pollInterval: 100 },
  })

  watcher.on('change', async () => {
    if (Date.now() - lastSaveAt < 500) return  // own write, skip
    try {
      const raw = await fs.readJson(ALIASES_PATH)
      const aliases = Array.isArray(raw) ? (raw as JulesAlias[]) : []
      getWebContents()?.send('aliases.changed', aliases)
    } catch { /* unreadable */ }
  })

  watcher.on('unlink', () => {
    getWebContents()?.send('aliases.changed', null)
  })
}
