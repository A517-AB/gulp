import { ipcMain } from 'electron'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'

const execAsync = promisify(execFile)

async function git(cwd: string, args: string[]) {
  return execAsync('git', args, { cwd, maxBuffer: 10 * 1024 * 1024 })
}

export function registerGitHandlers() {
  ipcMain.handle('git:status', async (_, repoPath: string) => {
    const { stdout } = await git(repoPath, ['status', '--porcelain=v1', '-b'])
    return stdout
  })

  ipcMain.handle('git:log', async (_, repoPath: string, maxCount = 20) => {
    const sep = '\x1f'
    const { stdout } = await git(repoPath, [
      'log',
      `--max-count=${maxCount}`,
      `--pretty=format:%H${sep}%h${sep}%s${sep}%an${sep}%ar`,
    ])
    return stdout.split('\n').filter(Boolean).map(line => {
      const [hash, short, subject, author, relDate] = line.split(sep)
      return {
        hash: hash ?? '',
        short: short ?? '',
        subject: subject ?? '',
        author: author ?? '',
        relDate: relDate ?? '',
      }
    })
  })

  ipcMain.handle('git:branches', async (_, repoPath: string) => {
    const { stdout } = await git(repoPath, [
      'branch',
      '--format=%(refname:short)\x1f%(HEAD)',
    ])
    return stdout.split('\n').filter(Boolean).map(line => {
      const [name, head] = line.split('\x1f')
      return { name: name ?? '', current: head?.trim() === '*' }
    })
  })

  ipcMain.handle('git:checkout', async (_, repoPath: string, branch: string, create: boolean) => {
    const args = create ? ['checkout', '-b', branch] : ['checkout', branch]
    await git(repoPath, args)
  })

  ipcMain.handle('git:rebase', async (_, repoPath: string, onto: string) => {
    const { stdout } = await git(repoPath, ['rebase', onto])
    return stdout
  })

  ipcMain.handle('git:rebase-abort', async (_, repoPath: string) => {
    await git(repoPath, ['rebase', '--abort'])
  })

  ipcMain.handle('git:rebase-continue', async (_, repoPath: string) => {
    // core.editor=true prevents git from opening an editor for the commit message
    const { stdout } = await git(repoPath, ['-c', 'core.editor=true', 'rebase', '--continue'])
    return stdout
  })
}
