import { ipcMain } from 'electron'
import chokidar from 'chokidar'
import { jules } from '@google/jules-sdk'
import * as path from 'node:path'

function serialize<T>(data: T): T {
  if (data === undefined || data === null) return data
  return JSON.parse(JSON.stringify(data)) as T
}

function send(sender: Electron.WebContents, ch: string, payload?: unknown) {
  if (!sender.isDestroyed()) { sender.send(ch, serialize(payload)) }
}

const watchers = new Map<string, ReturnType<typeof chokidar.watch>>()
const debounceTimers = new Map<string, ReturnType<typeof setTimeout>>()
const DEBOUNCE_MS = 500

export function registerWatcherHandlers() {
  ipcMain.handle('sdk:watcher.start', (event, dir: string) => {
    const watcherId = `watcher-${String(Date.now())}`
    const watchDir = path.resolve(dir)

    const watcher = chokidar.watch(watchDir, {
      ignored: /(^|[/\\])\../,
      persistent: true,
      ignoreInitial: true,
    })

    async function handleEvent(eventType: string, filepath: string) {
      const session = await jules.session({
        prompt: `File ${eventType}: ${filepath}. Review and suggest improvements.`,
      })
      send(event.sender, `sdk:watcher.session:${watcherId}`, {
        id: session.id,
        event: eventType,
        filepath,
      })
    }

    function debounced(eventType: string, filepath: string) {
      const existing = debounceTimers.get(filepath)
      if (existing) clearTimeout(existing)
      debounceTimers.set(filepath, setTimeout(() => {
        debounceTimers.delete(filepath)
        handleEvent(eventType, filepath).catch(console.error)
      }, DEBOUNCE_MS))
    }

    watcher
      .on('add',    (p) => { debounced('added',   p) })
      .on('change', (p) => { debounced('changed', p) })

    watchers.set(watcherId, watcher)
    return watcherId
  })

  ipcMain.handle('sdk:watcher.stop', async (_, watcherId: string) => {
    const watcher = watchers.get(watcherId)
    if (watcher) {
      await watcher.close()
      watchers.delete(watcherId)
    }
  })
}
