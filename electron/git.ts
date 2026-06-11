import { ipcMain } from 'electron'
import { spawn } from 'child_process'
import * as path from 'path'

interface ExecResult {
  stdout: string
  stderr: string
  exitCode: number
  ok: boolean
}

function run(cmd: string, args: string[], cwd: string): Promise<ExecResult> {
  return new Promise((resolve) => {
    const proc = spawn(cmd, args, { cwd, shell: false, env: process.env })
    let stdout = ''
    let stderr = ''
    proc.stdout.on('data', (d: Buffer) => { stdout += d.toString() })
    proc.stderr.on('data', (d: Buffer) => { stderr += d.toString() })
    proc.on('close', (code) => {
      const exitCode = code ?? 0
      resolve({ stdout: stdout.trim(), stderr: stderr.trim(), exitCode, ok: exitCode === 0 })
    })
    proc.on('error', (err) => {
      resolve({ stdout: '', stderr: err.message, exitCode: 1, ok: false })
    })
  })
}

function git(cwd: string, args: string[]): Promise<ExecResult> {
  return run('git', args, cwd)
}

export function registerGitHandlers(): void {
  // ── generic ───────────────────────────────────────────────────────────────────

  ipcMain.handle('git.run', (_e, cwd: string, args: string[]) =>
    git(cwd, args)
  )

  // ── info ──────────────────────────────────────────────────────────────────────

  ipcMain.handle('git.status', (_e, cwd: string) =>
    git(cwd, ['status', '--porcelain'])
  )

  ipcMain.handle('git.log', (_e, cwd: string, limit = 20, branch?: string) =>
      git(cwd, ['log', `--max-count=${String(limit)}`, '--pretty=format:%H|%s|%an|%ar|%D', ...(branch ? [branch] : [])])
  )

  ipcMain.handle('git.diff', (_e, cwd: string, args: string[] = []) =>
    git(cwd, ['diff', ...args])
  )

  ipcMain.handle('git.show', (_e, cwd: string, ref: string) =>
    git(cwd, ['show', ref])
  )

  ipcMain.handle('git.remote', (_e, cwd: string) =>
    git(cwd, ['remote', '-v'])
  )

  ipcMain.handle('git.branches', (_e, cwd: string) =>
    git(cwd, ['branch', '-a', '--format=%(refname:short)|%(upstream:short)|%(HEAD)'])
  )

  ipcMain.handle('git.currentBranch', (_e, cwd: string) =>
    git(cwd, ['rev-parse', '--abbrev-ref', 'HEAD'])
  )

  ipcMain.handle('git.tags', (_e, cwd: string) =>
    git(cwd, ['tag', '--list', '--sort=-version:refname'])
  )

  // ── stage / commit ────────────────────────────────────────────────────────────

  ipcMain.handle('git.add', (_e, cwd: string, files: string[] = ['.']) =>
    git(cwd, ['add', ...files])
  )

  ipcMain.handle('git.unstage', (_e, cwd: string, files: string[] = ['.']) =>
    git(cwd, ['restore', '--staged', ...files])
  )

  ipcMain.handle('git.commit', (_e, cwd: string, message: string, allowEmpty = false) =>
    git(cwd, ['commit', '-m', message, ...(allowEmpty ? ['--allow-empty'] : [])])
  )

  ipcMain.handle('git.amend', (_e, cwd: string, message?: string) =>
    git(cwd, ['commit', '--amend', '--no-edit', ...(message ? ['-m', message] : [])])
  )

  // ── sync ──────────────────────────────────────────────────────────────────────

  ipcMain.handle('git.push', (_e, cwd: string, remote = 'origin', branch?: string, force = false) =>
      git(cwd, ['push', ...(force ? ['--force-with-lease'] : []), remote, ...(branch ? [branch] : [])] as string[])
  )

  ipcMain.handle('git.pull', (_e, cwd: string, remote = 'origin', branch?: string, rebase = false) =>
      git(cwd, ['pull', ...(rebase ? ['--rebase'] : []), remote, ...(branch ? [branch] : [])] as string[])
  )

  ipcMain.handle('git.fetch', (_e, cwd: string, remote = 'origin', prune = true) =>
      git(cwd, ['fetch', ...(prune ? ['--prune'] : []), remote] as string[])
  )

  // ── branches ─────────────────────────────────────────────────────────────────

  ipcMain.handle('git.checkout', (_e, cwd: string, branch: string, create = false) =>
    git(cwd, create ? ['checkout', '-b', branch] : ['checkout', branch])
  )

  ipcMain.handle('git.deleteBranch', (_e, cwd: string, branch: string, force = false) =>
    git(cwd, ['branch', force ? '-D' : '-d', branch])
  )

  ipcMain.handle('git.merge', (_e, cwd: string, branch: string, noFF = false) =>
    git(cwd, ['merge', ...(noFF ? ['--no-ff'] : []), branch])
  )

  ipcMain.handle('git.rebase', (_e, cwd: string, onto: string) =>
    git(cwd, ['rebase', onto])
  )

  // ── stash ─────────────────────────────────────────────────────────────────────

  ipcMain.handle('git.stash', (_e, cwd: string, action: 'push' | 'pop' | 'list' | 'drop' | 'apply' = 'push', message?: string) =>
    git(cwd, ['stash', action, ...(action === 'push' && message ? ['-m', message] : [])])
  )

  // ── reset / restore ───────────────────────────────────────────────────────────

  ipcMain.handle('git.reset', (_e, cwd: string, mode: 'soft' | 'mixed' | 'hard' = 'mixed', ref = 'HEAD') =>
      git(cwd, ['reset', `--${mode}`, ref] as string[])
  )

  ipcMain.handle('git.restore', (_e, cwd: string, files: string[]) =>
    git(cwd, ['restore', ...files])
  )

  ipcMain.handle('git.clean', (_e, cwd: string, force = false) =>
    git(cwd, ['clean', '-fd', ...(force ? [] : ['--dry-run'])])
  )

  // ── repo lifecycle ────────────────────────────────────────────────────────────

  ipcMain.handle('git.init', (_e, cwd: string) =>
    git(cwd, ['init'])
  )

  ipcMain.handle('git.clone', (_e, url: string, dest: string, shallow = false) =>
    run('git', ['clone', ...(shallow ? ['--depth', '1'] : []), url, dest], path.dirname(dest))
  )

  // ── shell / script runner ─────────────────────────────────────────────────────

  ipcMain.handle('shell.exec', (_e, cwd: string, command: string, args: string[] = []) =>
    run(command, args, cwd)
  )

  ipcMain.handle('shell.runScript', (_e, cwd: string, scriptPath: string, args: string[] = []) => {
    const ext = path.extname(scriptPath).toLowerCase()
    const runners: Record<string, [string, ...string[]]> = {
      '.py':  ['python', scriptPath],
      '.sh':  ['bash', scriptPath],
      '.zsh': ['zsh', scriptPath],
      '.ps1': ['pwsh', '-File', scriptPath],
      '.ts':  ['npx', 'tsx', scriptPath],
      '.js':  ['node', scriptPath],
    }
    const runner = runners[ext]
    if (!runner) return Promise.resolve({ stdout: '', stderr: `No runner for: ${ext}`, exitCode: 1, ok: false })
    const [cmd, ...cmdArgs] = runner
    return run(cmd, [...cmdArgs, ...args], cwd)
  })

  // inline script — run a string directly in bash/pwsh/python
  ipcMain.handle('shell.runInline', (_e, cwd: string, lang: 'bash' | 'pwsh' | 'python' | 'zsh', code: string) => {
    const runners: Record<'bash' | 'pwsh' | 'python' | 'zsh', [string, string, string]> = {
      bash:   ['bash',   '-c', code],
      zsh:    ['zsh',    '-c', code],
      pwsh:   ['pwsh',   '-Command', code],
      python: ['python', '-c', code],
    }
    const [cmd, flag, script] = runners[lang]
    return run(cmd, [flag, script], cwd)
  })
}
