import { ipcMain, dialog, app } from 'electron'
import * as fs from 'node:fs'
import * as path from 'node:path'
import type { RepoInfo } from '../types/electron.js'

const REPOS_FILE = path.join(app.getPath('userData'), 'repos.json')

function load(): RepoInfo[] {
  try {
    return JSON.parse(fs.readFileSync(REPOS_FILE, 'utf-8')) as RepoInfo[]
  } catch {
    return []
  }
}

function save(repos: RepoInfo[]): void {
  fs.writeFileSync(REPOS_FILE, JSON.stringify(repos, null, 2), 'utf-8')
}

function isGitRepo(dir: string): boolean {
  return fs.existsSync(path.join(dir, '.git'))
}

function makeRepoInfo(repoPath: string): RepoInfo {
  return {
    path:    repoPath,
    name:    path.basename(repoPath),
    addedAt: Date.now(),
  }
}

export function registerReposHandlers(): void {
  ipcMain.handle('repos.list', () => load())

  ipcMain.handle('repos.register', (_, repoPath: string) => {
    if (!isGitRepo(repoPath)) throw new Error(`Not a git repository: ${repoPath}`)
    const repos = load()
    const existing = repos.find(r => r.path === repoPath)
    if (existing) return existing
    const info = makeRepoInfo(repoPath)
    repos.push(info)
    save(repos)
    return info
  })

  ipcMain.handle('repos.forget', (_, repoPath: string) => {
    const repos = load().filter(r => r.path !== repoPath)
    save(repos)
  })

  ipcMain.handle('repos.scan', (_, rootDir: string) => {
    const found: RepoInfo[] = []
    const ignore = new Set(['.git', 'node_modules', 'dist', '.next', 'build', '__pycache__', '.venv'])

    function walk(dir: string, depth: number): void {
      if (depth > 3) return
      let entries: fs.Dirent[]
      try {
        entries = fs.readdirSync(dir, { withFileTypes: true })
      } catch {
        return
      }
      for (const entry of entries) {
        if (!entry.isDirectory() || ignore.has(entry.name)) continue
        const full = path.join(dir, entry.name)
        if (isGitRepo(full)) {
          found.push(makeRepoInfo(full))
        } else {
          walk(full, depth + 1)
        }
      }
    }

    walk(rootDir, 0)

    const existing = load()
    const existingPaths = new Set(existing.map(r => r.path))
    const newRepos = found.filter(r => !existingPaths.has(r.path))
    if (newRepos.length > 0) save([...existing, ...newRepos])
    return found
  })

  ipcMain.handle('repos.pickAndRegister', async (event) => {
    const { BrowserWindow } = await import('electron')
    const win = BrowserWindow.fromWebContents(event.sender)
    const result = await dialog.showOpenDialog(win ?? BrowserWindow.getFocusedWindow() ?? new BrowserWindow(), {
      properties: ['openDirectory'],
      title: 'Select Git Repository',
    })
    if (result.canceled || !result.filePaths[0]) return null
    const repoPath = result.filePaths[0]
    if (!isGitRepo(repoPath)) throw new Error(`Not a git repository: ${repoPath}`)
    const repos = load()
    const existing = repos.find(r => r.path === repoPath)
    if (existing) return existing
    const info = makeRepoInfo(repoPath)
    repos.push(info)
    save(repos)
    return info
  })
}
