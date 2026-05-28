import { ipcMain, dialog } from 'electron'
import * as fs from 'fs/promises'
import * as path from 'path'

export interface FsEntry {
  name: string
  isDir: boolean
  ext: string
  size: number
  modifiedAt: string
}

export function registerFilesystemHandlers(): void {
  // ── read ──────────────────────────────────────────────────────────────────────

  ipcMain.handle('fs.readdir', async (_e, dir: string): Promise<FsEntry[]> => {
    const entries = await fs.readdir(dir, { withFileTypes: true })
    const results = await Promise.all(
      entries
        .filter(e => !e.name.startsWith('.'))
        .map(async e => {
          const stat = await fs.stat(path.join(dir, e.name)).catch(() => null)
          return {
            name: e.name,
            isDir: e.isDirectory(),
            ext: path.extname(e.name).toLowerCase(),
            size: stat?.size ?? 0,
            modifiedAt: stat?.mtime.toISOString() ?? '',
          }
        })
    )
    return results.sort((a, b) => {
      if (a.isDir !== b.isDir) return a.isDir ? -1 : 1
      return a.name.localeCompare(b.name)
    })
  })

  ipcMain.handle('fs.readFile', async (_e, filePath: string): Promise<string> => {
    const stat = await fs.stat(filePath)
    if (stat.size > 2 * 1024 * 1024) {
      return `[File too large to preview: ${(stat.size / 1024 / 1024).toFixed(1)} MB]`
    }
    return fs.readFile(filePath, 'utf-8')
  })

  ipcMain.handle('fs.exists', async (_e, filePath: string): Promise<boolean> => {
    return fs.access(filePath).then(() => true).catch(() => false)
  })

  ipcMain.handle('fs.stat', async (_e, filePath: string) => {
    const stat = await fs.stat(filePath)
    return {
      size: stat.size,
      isDir: stat.isDirectory(),
      isFile: stat.isFile(),
      createdAt: stat.birthtime.toISOString(),
      modifiedAt: stat.mtime.toISOString(),
    }
  })

  // ── write ─────────────────────────────────────────────────────────────────────

  ipcMain.handle('fs.writeFile', async (_e, filePath: string, content: string): Promise<void> => {
    await fs.mkdir(path.dirname(filePath), { recursive: true })
    await fs.writeFile(filePath, content, 'utf-8')
  })

  ipcMain.handle('fs.appendFile', async (_e, filePath: string, content: string): Promise<void> => {
    await fs.appendFile(filePath, content, 'utf-8')
  })

  ipcMain.handle('fs.mkdir', async (_e, dirPath: string): Promise<void> => {
    await fs.mkdir(dirPath, { recursive: true })
  })

  // ── delete ────────────────────────────────────────────────────────────────────

  ipcMain.handle('fs.deleteFile', async (_e, filePath: string): Promise<void> => {
    await fs.unlink(filePath)
  })

  ipcMain.handle('fs.deleteDir', async (_e, dirPath: string): Promise<void> => {
    await fs.rm(dirPath, { recursive: true, force: true })
  })

  // ── move / copy / rename ──────────────────────────────────────────────────────

  ipcMain.handle('fs.rename', async (_e, oldPath: string, newPath: string): Promise<void> => {
    await fs.rename(oldPath, newPath)
  })

  ipcMain.handle('fs.move', async (_e, src: string, dest: string): Promise<void> => {
    await fs.mkdir(path.dirname(dest), { recursive: true })
    await fs.rename(src, dest)
  })

  ipcMain.handle('fs.copy', async (_e, src: string, dest: string): Promise<void> => {
    await fs.mkdir(path.dirname(dest), { recursive: true })
    await fs.copyFile(src, dest)
  })

  ipcMain.handle('fs.copyDir', async (_e, src: string, dest: string): Promise<void> => {
    await fs.cp(src, dest, { recursive: true })
  })

  // ── dialogs ───────────────────────────────────────────────────────────────────

  ipcMain.handle('fs.showOpenDialog', async (): Promise<string | null> => {
    const result = await dialog.showOpenDialog({
      properties: ['openDirectory'],
      title: 'Select working directory',
    })
    return result.canceled ? null : (result.filePaths[0] ?? null)
  })

  ipcMain.handle('fs.showOpenFileDialog', async (_e, filters?: Electron.FileFilter[]): Promise<string | null> => {
    const result = await dialog.showOpenDialog({
      properties: ['openFile'],
      filters: filters ?? [],
    })
    return result.canceled ? null : (result.filePaths[0] ?? null)
  })

  ipcMain.handle('fs.showSaveDialog', async (_e, defaultName?: string): Promise<string | null> => {
    const result = await dialog.showSaveDialog(
      defaultName !== undefined ? { defaultPath: defaultName } : {},
    )
    return result.canceled ? null : result.filePath
  })

}
