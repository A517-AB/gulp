import type {WebContents} from 'electron'
import {app, ipcMain} from 'electron'
import fs from 'fs-extra'
import * as path from 'path'
import chokidar from 'chokidar'
import type {FuseManifest as FuseManifestType} from '../src/shared/fuse'
import {FUSE_ROOT, FuseManifest} from '../src/shared/fuse'
import {store} from './store'

const MANIFEST_PATH = path.join(app.getAppPath(), 'snippets.json')
const EMPTY_MANIFEST: FuseManifestType = {version: 1, items: []}

function getFuseRoot(): string {
    return (store.get('fuse.root') as string | undefined) ?? FUSE_ROOT
}

let manifestCache: FuseManifestType | null = null

async function readManifest(): Promise<FuseManifestType> {
    if (manifestCache) return manifestCache
    try {
        const raw: unknown = await fs.readJson(MANIFEST_PATH)
        const result = FuseManifest.safeParse(raw)
        if (!result.success) {
            console.warn('[snippets] manifest invalid, returning empty:', result.error.issues)
            return EMPTY_MANIFEST
        }
        manifestCache = result.data
        return result.data
    } catch {
        return EMPTY_MANIFEST
    }
}

export function registerSnippetsHandlers(getWebContents: () => WebContents | null): void {
    // ── manifest ──────────────────────────────────────────────────────────────

    ipcMain.handle('snippets.get', (): Promise<FuseManifestType> => readManifest())

    ipcMain.handle('snippets.save', async (_e, data: FuseManifestType) => {
        try {
            const result = FuseManifest.safeParse(data)
            if (!result.success) {
                console.error('[snippets] save → invalid manifest:', result.error.issues)
                return false
            }
            await fs.outputJson(MANIFEST_PATH, result.data, {spaces: 2})
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

    // ── watcher ───────────────────────────────────────────────────────────────

    const snippetsDir = path.join(getFuseRoot(), 'snippets')
    const watcher = chokidar.watch(snippetsDir, {
        ignoreInitial: true,
        depth: 3,
        ignored: [/(^|[/\\])\./, '**/node_modules/**', '**/dist/**'],
        awaitWriteFinish: {stabilityThreshold: 200, pollInterval: 100},
    })

    let debounceTimer: ReturnType<typeof setTimeout> | null = null

    watcher.on('all', (event, filePath) => {
        console.log(`[snippets] ${event}: ${filePath}`)
        if (debounceTimer) clearTimeout(debounceTimer)
        debounceTimer = setTimeout(() => {
            manifestCache = null
            getWebContents()?.send('snippets.changed', {event, path: filePath})
        }, 300)
    })

    watcher.on('error', (err) => {
        console.error('[snippets] watcher error:', err)
    })
}
