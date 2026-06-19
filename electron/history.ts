import { ipcMain } from 'electron'
import fs from 'fs-extra'
import type {HistoryEntry} from '@shared/history.ts'

const HISTORY_PATH = 'D:/fuse/history.json'
const MAX_ENTRIES = 200

async function read(): Promise<HistoryEntry[]> {
  try {
    const exists = await fs.pathExists(HISTORY_PATH)
    if (!exists) return []
    const raw: unknown = await fs.readJson(HISTORY_PATH)
    return Array.isArray(raw) ? (raw as HistoryEntry[]) : []
  } catch {
    return []
  }
}

async function write(entries: HistoryEntry[]): Promise<void> {
  await fs.outputJson(HISTORY_PATH, entries, { spaces: 2 })
}

export function registerHistoryHandlers(): void {
  console.log('[history] registering, path:', HISTORY_PATH)

  ipcMain.handle('history.get', async (): Promise<HistoryEntry[]> => {
    return read()
  })

  ipcMain.handle('history.push', async (_e, text: string): Promise<HistoryEntry[]> => {
    const entries = await read()
    // skip duplicate of most recent
    if (entries[0]?.text === text) return entries
    const entry: HistoryEntry = { id: crypto.randomUUID(), text, timestamp: new Date().toISOString() }
    const next = [entry, ...entries].slice(0, MAX_ENTRIES)
    await write(next)
    return next
  })

  ipcMain.handle('history.remove', async (_e, id: string): Promise<HistoryEntry[]> => {
    const next = (await read()).filter(e => e.id !== id)
    await write(next)
    return next
  })
}
