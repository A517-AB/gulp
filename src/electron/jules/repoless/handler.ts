import { ipcMain, dialog, BrowserWindow } from 'electron'
import { jules } from '@google/jules-sdk'
import * as fs from 'node:fs'
import * as path from 'node:path'
import { execFileSync } from 'node:child_process'
interface ApplyResult {
  branch: string
  diff: string
  applied: string[]
}

function serialize<T>(data: T): T {
  if (data === undefined || data === null) return data
  return JSON.parse(JSON.stringify(data)) as T
}

function buildRepoContext(repoPath: string): string {
  const ignore = new Set(['node_modules', 'dist', '.git', '.next', 'build', '__pycache__', '.venv', '.cache'])
  const lines: string[] = [
    `# Repository: ${path.basename(repoPath)}`,
    '',
    '## File Structure',
    '```',
  ]

  function walk(dir: string, prefix: string, depth: number): void {
    if (depth > 3) return
    let entries: fs.Dirent[]
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true })
        .filter(e => !e.name.startsWith('.') && !ignore.has(e.name))
    } catch {
      return
    }
    for (const entry of entries) {
      lines.push(`${prefix}${entry.isDirectory() ? '/' : ' '} ${entry.name}`)
      if (entry.isDirectory()) walk(path.join(dir, entry.name), prefix + '  ', depth + 1)
    }
  }

  walk(repoPath, '', 0)
  lines.push('```')

  for (const file of ['package.json', 'README.md', 'AGENTS.md', 'pyproject.toml', 'Cargo.toml']) {
    const filePath = path.join(repoPath, file)
    if (fs.existsSync(filePath)) {
      try {
        const content = fs.readFileSync(filePath, 'utf-8').slice(0, 1500)
        lines.push('', `## ${file}`, '```', content, '```')
      } catch { /* skip unreadable */ }
    }
  }

  return lines.join('\n')
}

/**
 * Validates that a git branch name does not contain shell metacharacters
 * or other characters that could be used for command injection.
 * Allows alphanumerics, hyphens, underscores, dots, and forward slashes.
 */
function validateBranchName(name: string): void {
  if (!name || name.length === 0) {
    throw new Error('Branch name must not be empty')
  }
  const unsafePattern = /[^a-zA-Z0-9_\-.]/
  if (unsafePattern.test(name)) {
    throw new Error(
      `Invalid branch name "${name.replace(/[^a-zA-Z0-9_\-.]/g, '?')}": ` +
      'contains disallowed characters. Use only alphanumerics, hyphens, underscores, and dots.'
    )
  }
  if (name.startsWith('-') || name.startsWith('.') || name.endsWith('.') || name.includes('..')) {
    throw new Error(`Invalid branch name "${name}": violates git branch naming rules`)
  }
}

export function registerRepolessHandlers(): void {
  // ── directory picker ──────────────────────────────────────────────────────

  ipcMain.handle('sdk:repoless.pickDir', async (event) => {
    const win = BrowserWindow.fromWebContents(event.sender)
    if (!win) return null
    const result = await dialog.showOpenDialog(win, {
      properties: ['openDirectory'],
      title: 'Select Repository',
    })
    return result.canceled ? null : (result.filePaths[0] ?? null)
  })

  // ── start session, return id immediately ──────────────────────────────────

  ipcMain.handle('sdk:repoless.start', async (_, prompt: string, repoPath?: string) => {
    const fullPrompt = repoPath
      ? `${buildRepoContext(repoPath)}\n\n---\n\n${prompt}`
      : prompt

    const session = await jules.session({ prompt: fullPrompt })
    console.log(`[repoless] session started: ${session.id}`)
    return { id: session.id }
  })

  // ── apply changes to a new local branch ──────────────────────────────────

  ipcMain.handle('sdk:repoless.apply', async (_, id: string, repoPath: string, branchName: string) => {
    validateBranchName(branchName)

    const outcome = await jules.session(id).result()

    try {
      execFileSync('git', ['-C', repoPath, 'checkout', '-b', branchName], { encoding: 'utf-8' })
    } catch (err) {
      throw new Error(`Failed to create branch "${branchName}": ${err instanceof Error ? err.message : String(err)}`, { cause: err })
    }

    const applied: string[] = []
    const changeSet = outcome.changeSet()

    if (changeSet) {
      console.log(`[repoless] applying changeSet patch (${String(changeSet.gitPatch.unidiffPatch.length)} chars)`)
      const patchPath = path.join(repoPath, '.jules-patch.tmp')
      fs.writeFileSync(patchPath, changeSet.gitPatch.unidiffPatch, 'utf-8')
      try {
        execFileSync('git', ['-C', repoPath, 'apply', patchPath], { encoding: 'utf-8' })
      } catch (err) {
        throw new Error(`Failed to apply patch: ${err instanceof Error ? err.message : String(err)}`, { cause: err })
      } finally {
        fs.unlinkSync(patchPath)
      }
      for (const f of changeSet.parsed().files) {
        applied.push(f.path)
        console.log(`[repoless] patched: ${f.path} (+${String(f.additions)} -${String(f.deletions)})`)
      }
    } else {
      for (const file of outcome.generatedFiles().all()) {
        const fullPath = path.join(repoPath, file.path)
        await fs.promises.mkdir(path.dirname(fullPath), { recursive: true })
        await fs.promises.writeFile(fullPath, file.content, 'utf-8')
        applied.push(file.path)
        console.log(`[repoless] wrote: ${file.path} (${String(file.content.length)} chars)`)
      }
    }

    try {
      execFileSync('git', ['-C', repoPath, 'add', '-A'], { encoding: 'utf-8' })
    } catch (err) {
      throw new Error(`Failed to stage files: ${err instanceof Error ? err.message : String(err)}`, { cause: err })
    }

    let diff: string
    try {
      diff = execFileSync('git', ['-C', repoPath, 'diff', '--cached'], { encoding: 'utf-8' })
    } catch (err) {
      throw new Error(`Failed to read staged diff: ${err instanceof Error ? err.message : String(err)}`, { cause: err })
    }

    console.log(`[repoless] applied ${String(applied.length)} file(s) to branch "${branchName}"`)

    const result: ApplyResult = { branch: branchName, diff, applied }
    return serialize(result)
  })

  // ── run: start + stream + result in one blocking call ─────────────────────

  ipcMain.handle('sdk:repoless.run', async (event, prompt: string, repoPath: string | undefined, runId: string) => {
    const fullPrompt = repoPath
      ? `${buildRepoContext(repoPath)}\n\n---\n\n${prompt}`
      : prompt

    const session = await jules.session({ prompt: fullPrompt })
    console.log(`[repoless] run session started: ${session.id}`)

    let agentMessage: string | undefined
    for await (const activity of session.stream()) {
      if (event.sender.isDestroyed()) break
      if (activity.type === 'agentMessaged') agentMessage = activity.message
      if (!event.sender.isDestroyed()) {
        event.sender.send(`sdk:repoless.run.progress:${runId}`, serialize(activity))
      }
    }

    const outcome = await session.result()
    const files: Record<string, string> = {}
    for (const file of outcome.generatedFiles().all()) {
      files[file.path] = file.content
    }

    return serialize({
      id: session.id,
      ...(agentMessage !== undefined ? { agentMessage } : {}),
      files,
    })
  })
}
