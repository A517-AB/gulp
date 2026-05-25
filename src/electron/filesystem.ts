import { ipcMain, dialog } from 'electron'
import * as fs from 'fs/promises'

export interface FsEntry {
  name: string
  isDir: boolean
}

export function registerFilesystemHandlers(): void {
  ipcMain.handle('fs.readdir', async (_e, dir: string): Promise<FsEntry[]> => {
    const entries = await fs.readdir(dir, { withFileTypes: true })
    return entries
      .map(e => ({ name: e.name, isDir: e.isDirectory() }))
      .filter(e => !e.name.startsWith('.'))
      .sort((a, b) => {
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

  ipcMain.handle('fs.showOpenDialog', async (): Promise<string | null> => {
    const result = await dialog.showOpenDialog({
      properties: ['openDirectory'],
      title: 'Select working directory',
    })
    return result.canceled ? null : (result.filePaths[0] ?? null)
  })
}
