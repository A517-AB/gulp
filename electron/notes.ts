import type {WebContents} from 'electron'
import {app, ipcMain} from 'electron'
import fs from 'fs-extra'
import * as path from 'path'
import chokidar from 'chokidar'
import type {NoteMeta} from '../src/shared/local-data'

const NOTES_DIR = path.join(app.getPath('userData'), 'notes')

interface NoteFile {
    meta: NoteMeta
    blocks: object[]
}

async function readNote(id: string): Promise<NoteFile | null> {
    try {
        const file = path.join(NOTES_DIR, `${id}.json`)
        if (!(await fs.pathExists(file))) return null
        return (await fs.readJson(file)) as NoteFile
    } catch {
        return null
    }
}

export function registerNotesHandlers(getWebContents: () => WebContents | null): void {
    console.log('[notes] registering, dir:', NOTES_DIR)

    ipcMain.handle('notes.list', async (): Promise<NoteMeta[]> => {
        try {
            await fs.ensureDir(NOTES_DIR)
            const files = await fs.readdir(NOTES_DIR)
            const metas = await Promise.all(
                files
                    .filter((f) => f.endsWith('.json'))
                    .map(async (f) => {
                        const note = await readNote(f.replace('.json', ''))
                        return note?.meta ?? null
                    })
            )
            return (metas.filter((m): m is NoteMeta => m !== null))
                .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
        } catch {
            return []
        }
    })

    ipcMain.handle('notes.get', async (_e, id: string): Promise<object[] | null> => {
        const note = await readNote(id)
        return note?.blocks ?? null
    })

    let lastSaveId = ''
    let lastSaveAt = 0

    ipcMain.handle('notes.save', async (_e, id: string, title: string, blocks: object[]): Promise<boolean> => {
        try {
            await fs.ensureDir(NOTES_DIR)
            const meta: NoteMeta = {id, title, updatedAt: new Date().toISOString()}
            const data: NoteFile = {meta, blocks}
            lastSaveId = id
            lastSaveAt = Date.now()
            await fs.outputJson(path.join(NOTES_DIR, `${id}.json`), data, {spaces: 2})
            return true
        } catch (err) {
            console.error('[notes] save failed:', err)
            return false
        }
    })

    ipcMain.handle('notes.delete', async (_e, id: string): Promise<boolean> => {
        try {
            await fs.remove(path.join(NOTES_DIR, `${id}.json`))
            return true
        } catch {
            return false
        }
    })

    fs.ensureDirSync(NOTES_DIR)
    const watcher = chokidar.watch(NOTES_DIR, {
        ignoreInitial: true,
        awaitWriteFinish: {stabilityThreshold: 200, pollInterval: 100},
    })

    watcher.on('all', (_event, filePath: string) => {
        if (!filePath.endsWith('.json')) return
        if (Date.now() - lastSaveAt < 500 && path.basename(filePath) === `${lastSaveId}.json`) return
        getWebContents()?.send('notes.changed')
    })
}
