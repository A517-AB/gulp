import { ipcMain, dialog, shell, BrowserWindow } from 'electron'
import * as fs from 'fs/promises'
import * as path from 'path'
import ignore from 'ignore'
import type { FsEntry, FsStat, ReaddirOptions, FileFilter } from './types'

const SKIP_DIRS = new Set([
  'node_modules', '.git', 'dist', 'build', '.next', 'out', '.output',
  '__pycache__', '.venv', 'venv', '.tox', '.mypy_cache', '.ruff_cache',
  'target', '.cargo', '.gradle', '.idea', '.vs', '.vscode',
  'coverage', '.nyc_output', '.turbo', '.cache',
])

export function registerFilesystemHandlers(): void {
  // ── read ──────────────────────────────────────────────────────────────────────

  ipcMain.handle('fs.readdir', async (_e, dir: string, options?: ReaddirOptions): Promise<FsEntry[]> => {
    const entries = await fs.readdir(dir, { withFileTypes: true })

    let ig: ReturnType<typeof ignore> | null = null
    if (options?.respectGitignore) {
      try {
        const content = await fs.readFile(path.join(dir, '.gitignore'), 'utf-8')
        ig = ignore().add(content)
      } catch {
        // no .gitignore in this dir
      }
    }

    const results = await Promise.all(
      entries
        .filter(e => options?.showHidden === true || !e.name.startsWith('.'))
        .filter(e => !(e.isDirectory() && SKIP_DIRS.has(e.name)))
        .filter(e => ig ? !ig.ignores(e.name) : true)
        .map(async e => {
          const stat = await fs.stat(path.join(dir, e.name)).catch(() => null)
          return {
            name: e.name,
            path: path.join(dir, e.name),
            isDir: e.isDirectory(),
            ext: path.extname(e.name).toLowerCase(),
            size: stat?.size ?? 0,
            modifiedAt: stat?.mtime.toISOString() ?? '',
          } satisfies FsEntry
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
      throw new Error(`File too large: ${(stat.size / 1024 / 1024).toFixed(1)} MB`)
    }
    return fs.readFile(filePath, 'utf-8')
  })

  ipcMain.handle('fs.exists', async (_e, filePath: string): Promise<boolean> => {
    return fs.access(filePath).then(() => true).catch(() => false)
  })

  ipcMain.handle('fs.stat', async (_e, filePath: string): Promise<FsStat> => {
    const stat = await fs.stat(filePath)
    return {
      size:       stat.size,
      isDir:      stat.isDirectory(),
      isFile:     stat.isFile(),
      createdAt:  stat.birthtime.toISOString(),
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
    try {
      await fs.rename(src, dest)
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code === 'EXDEV') {
        await fs.cp(src, dest, { recursive: true })
        await fs.rm(src, { recursive: true, force: true })
      } else {
        throw err
      }
    }
  })

  ipcMain.handle('fs.copy', async (_e, src: string, dest: string): Promise<void> => {
    await fs.mkdir(path.dirname(dest), { recursive: true })
    await fs.copyFile(src, dest)
  })

  ipcMain.handle('fs.copyDir', async (_e, src: string, dest: string): Promise<void> => {
    await fs.cp(src, dest, { recursive: true })
  })

  // ── shell ─────────────────────────────────────────────────────────────────────

  ipcMain.handle('fs.openPath', async (_e, filePath: string): Promise<string> => {
    return shell.openPath(filePath)
  })

  ipcMain.handle('fs.revealInFolder', (_e, filePath: string): void => {
    shell.showItemInFolder(filePath)
  })

  // ── dialogs ───────────────────────────────────────────────────────────────────

  const getParentWindow = (): BrowserWindow | undefined => {
    return BrowserWindow.getFocusedWindow() ?? BrowserWindow.getAllWindows()[0] ?? undefined
  };

  ipcMain.handle('fs.showOpenDialog', async (): Promise<string | null> => {
    const win = getParentWindow()
    const options: Electron.OpenDialogOptions = {
      properties: ['openDirectory'],
      title: 'Select working directory',
    }
    const result = win ? await dialog.showOpenDialog(win, options) : await dialog.showOpenDialog(options)
    return result.canceled ? null : (result.filePaths[0] ?? null)
  })

  ipcMain.handle('fs.showOpenFileDialog', async (_e, filters?: FileFilter[]): Promise<string | null> => {
    const win = getParentWindow()
    const options: Electron.OpenDialogOptions = {
      properties: ['openFile'],
      filters: filters ?? [],
    }
    const result = win ? await dialog.showOpenDialog(win, options) : await dialog.showOpenDialog(options)
    return result.canceled ? null : (result.filePaths[0] ?? null)
  })

  ipcMain.handle('fs.showSaveDialog', async (_e, defaultName?: string): Promise<string | null> => {
    const win = getParentWindow()
    const options: Electron.SaveDialogOptions = defaultName !== undefined ? { defaultPath: defaultName } : {}
    const result = win ? await dialog.showSaveDialog(win, options) : await dialog.showSaveDialog(options)
    return result.canceled ? null : result.filePath
  })
}
