// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║  YOU ARE NOT ALLOWED TO EXPAND THIS FILE.                                  ║
// ║  This is the only IPC entry point for Jules local actions.                 ║
// ║  git ops, artifact save, GitHub API — nothing else goes here.              ║
// ║  Jules HTTP (sessions, activities, sources) goes through the Bun server.   ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

import {ipcMain} from 'electron'
import * as fs from 'node:fs'
import * as path from 'node:path'
import {Buffer} from 'node:buffer'
import {execFileSync} from 'node:child_process'

interface ParsedFile {
    path: string;
    changeType: 'created' | 'modified' | 'deleted';
    additions: number;
    deletions: number;
    content: string
}

function parseUnidiff(patch?: string | null): ParsedFile[] {
    if (!patch) return []
    const files: ParsedFile[] = []
    let current: {
        path: string;
        changeType: 'created' | 'modified' | 'deleted';
        added: string[];
        additions: number;
        deletions: number
    } | null = null
    let inHunk = false
    const lines = patch.split(/\r?\n/)
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i]
        if (line === undefined) continue
        if (line.startsWith('--- ')) {
            const next = lines[i + 1]
            if (next?.startsWith('+++ ')) {
                const from = line.slice(4);
                const to = next.slice(4)
                let changeType: 'created' | 'modified' | 'deleted'
                let filePath: string
                if (from === '/dev/null') {
                    changeType = 'created';
                    filePath = to.startsWith('b/') ? to.slice(2) : to
                } else if (to === '/dev/null') {
                    changeType = 'deleted';
                    filePath = from.startsWith('a/') ? from.slice(2) : from
                } else {
                    changeType = 'modified';
                    filePath = to.startsWith('b/') ? to.slice(2) : to
                }
                if (current) files.push({
                    path: current.path,
                    changeType: current.changeType,
                    content: current.added.join('\n'),
                    additions: current.additions,
                    deletions: current.deletions
                })
                current = {path: filePath, changeType, added: [], additions: 0, deletions: 0}
                inHunk = false;
                i++
            }
        } else if (current) {
            if (line.startsWith('@@')) {
                inHunk = true
            } else if (inHunk) {
                if (line.startsWith('+')) {
                    current.added.push(line.slice(1));
                    current.additions++
                } else if (line.startsWith('-')) {
                    current.deletions++
                }
            }
        }
    }
    if (current) files.push({
        path: current.path,
        changeType: current.changeType,
        content: current.added.join('\n'),
        additions: current.additions,
        deletions: current.deletions
    })
    return files
}

// ── git ───────────────────────────────────────────────────────────────────────

function resolveGitSource(cwd?: string): { github: string | null; baseBranch: string } {
    const baseBranch = process.env.BASE_BRANCH ?? 'main'
    const fromEnv = process.env.GITHUB_REPO
    if (fromEnv) return {github: fromEnv, baseBranch}
    try {
        const url = execFileSync('git', ['remote', 'get-url', 'origin'], {cwd, encoding: 'utf-8'}).trim()
        const match = /github\.com[:/](.+?)(?:\.git)?$/.exec(url)
        return {github: match?.[1] ?? null, baseBranch}
    } catch {
        return {github: null, baseBranch}
    }
}

// ── github ────────────────────────────────────────────────────────────────────

const GITHUB_API = 'https://api.github.com'

function getToken(): string {
    const token = process.env.GITHUB_TOKEN
    if (!token) throw new Error('GITHUB_TOKEN not set')
    return token
}

async function gh<T>(endpoint: string, options: { method?: string; body?: unknown } = {}): Promise<T> {
    const res = await fetch(`${GITHUB_API}${endpoint}`, {
        method: options.method ?? 'GET',
        headers: {
            Authorization: `Bearer ${getToken()}`,
            Accept: 'application/vnd.github+json',
            'X-GitHub-Api-Version': '2022-11-28',
            'Content-Type': 'application/json',
        },
        ...(options.body ? {body: JSON.stringify(options.body)} : {}),
    })
    if (!res.ok) {
        const err = await res.json().catch(() => ({})) as { message?: string }
        throw new Error(err.message ?? `GitHub API ${String(res.status)}: ${endpoint}`)
    }
    if (res.status === 204) return undefined as T
    return res.json() as Promise<T>
}

// ── registration ──────────────────────────────────────────────────────────────

export function registerJulesGitHandlers(): void {

    ipcMain.handle('jules.git.resolveSource', (_, cwd: string) =>
        resolveGitSource(cwd)
    )

    ipcMain.handle('jules.git.applyPatch', async (_, cwd: string, patch: string) => {
        const branch = `jules-patch-${String(Date.now())}`
        const patchPath = path.join(cwd, 'jules_changes.patch')
        try {
            execFileSync('git', ['checkout', '-b', branch], {cwd, stdio: 'pipe'})
            fs.writeFileSync(patchPath, patch)
            execFileSync('git', ['apply', patchPath], {cwd, stdio: 'pipe'})
            execFileSync('git', ['add', '.'], {cwd, stdio: 'pipe'})
            execFileSync('git', ['commit', '-m', 'Applied changes from Jules'], {cwd, stdio: 'pipe'})
            return {ok: true, branch}
        } catch (err) {
            return {ok: false, error: err instanceof Error ? err.message : String(err)}
        } finally {
            try {
                fs.unlinkSync(patchPath)
            } catch { /* ignore */
            }
        }
    })

    ipcMain.handle('jules.git.parseUnidiff', (_, patch?: string | null) =>
        parseUnidiff(patch)
    )

    ipcMain.handle('jules.artifact.save', async (_, data: string, filepath: string) => {
        const resolved = path.resolve(filepath)
        await fs.promises.mkdir(path.dirname(resolved), {recursive: true})
        await fs.promises.writeFile(resolved, Buffer.from(data, 'base64'))
        return resolved
    })

    ipcMain.handle('jules.github.getPr', (_, owner: string, repo: string, number: number) =>
        gh(`/repos/${owner}/${repo}/pulls/${number}`)
    )

    ipcMain.handle('jules.github.getChecks', (_, owner: string, repo: string, ref: string) =>
        gh(`/repos/${owner}/${repo}/commits/${ref}/check-runs`)
    )

    ipcMain.handle('jules.github.mergePr', (_, owner: string, repo: string, number: number, method: 'merge' | 'squash' | 'rebase' = 'merge') =>
        gh(`/repos/${owner}/${repo}/pulls/${number}/merge`, {method: 'PUT', body: {merge_method: method}})
    )

    ipcMain.handle('jules.github.parsePrUrl', (_, url: string) => {
        const match = /github\.com\/([^/]+)\/([^/]+)\/pull\/(\d+)/.exec(url)
        if (!match?.[1] || !match[2] || !match[3]) return null
        return {owner: match[1], repo: match[2], number: parseInt(match[3], 10)}
    })
}
