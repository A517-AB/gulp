import {ipcMain} from 'electron'

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

export function registerGitHubHandlers(): void {
    // ── user ──────────────────────────────────────────────────────────────────────

    ipcMain.handle('github.getUser', () =>
        gh('/user')
    )

    // ── repos ─────────────────────────────────────────────────────────────────────

    ipcMain.handle('github.listRepos', (_e, sort = 'updated', per_page = 100) =>
        gh(`/user/repos?sort=${String(sort)}&per_page=${String(per_page)}&affiliation=owner,collaborator`)
    )

    ipcMain.handle('github.getRepo', (_e, owner: string, repo: string) =>
        gh(`/repos/${owner}/${repo}`)
    )

    ipcMain.handle('github.listBranches', (_e, owner: string, repo: string) =>
        gh(`/repos/${owner}/${repo}/branches?per_page=100`)
    )

    ipcMain.handle('github.deleteBranch', (_e, owner: string, repo: string, branch: string) =>
        gh(`/repos/${owner}/${repo}/git/refs/heads/${branch}`, {method: 'DELETE'})
    )

    ipcMain.handle('github.listCommits', (_e, owner: string, repo: string, branch?: string, per_page = 20) => {
        const q = new URLSearchParams({per_page: String(per_page), ...(branch ? {sha: branch} : {})})
        return gh(`/repos/${owner}/${repo}/commits?${q.toString()}`)
    })

    // ── pull requests ─────────────────────────────────────────────────────────────

    ipcMain.handle('github.listPRs', (_e, owner: string, repo: string, state: 'open' | 'closed' | 'all' = 'open') =>
        gh(`/repos/${owner}/${repo}/pulls?state=${state}&per_page=50`)
    )

    ipcMain.handle('github.getPR', (_e, owner: string, repo: string, number: number) =>
        gh(`/repos/${owner}/${repo}/pulls/${String(number)}`)
    )

    ipcMain.handle('github.createPR', (_e, owner: string, repo: string, data: {
        title: string
        body?: string
        head: string
        base: string
        draft?: boolean
    }) => gh(`/repos/${owner}/${repo}/pulls`, {method: 'POST', body: data}))

    ipcMain.handle('github.updatePR', (_e, owner: string, repo: string, number: number, data: {
        title?: string
        body?: string
        state?: 'open' | 'closed'
        base?: string
    }) => gh(`/repos/${owner}/${repo}/pulls/${String(number)}`, {method: 'PATCH', body: data}))

    ipcMain.handle('github.mergePR', (_e, owner: string, repo: string, number: number, method: 'merge' | 'squash' | 'rebase' = 'squash') =>
        gh(`/repos/${owner}/${repo}/pulls/${String(number)}/merge`, {method: 'PUT', body: {merge_method: method}})
    )

    ipcMain.handle('github.reviewPR', (_e, owner: string, repo: string, number: number, event: 'APPROVE' | 'REQUEST_CHANGES' | 'COMMENT', body?: string) =>
        gh(`/repos/${owner}/${repo}/pulls/${String(number)}/reviews`, {method: 'POST', body: {event, body}})
    )

    ipcMain.handle('github.getPRFiles', (_e, owner: string, repo: string, number: number) =>
        gh(`/repos/${owner}/${repo}/pulls/${String(number)}/files`)
    )

    ipcMain.handle('github.getPRChecks', (_e, owner: string, repo: string, ref: string) =>
        gh(`/repos/${owner}/${repo}/commits/${ref}/check-runs`)
    )

    // ── issues ────────────────────────────────────────────────────────────────────

    ipcMain.handle('github.listIssues', (_e, owner: string, repo: string, state: 'open' | 'closed' | 'all' = 'open') =>
        gh(`/repos/${owner}/${repo}/issues?state=${state}&per_page=50`)
    )

    ipcMain.handle('github.getIssue', (_e, owner: string, repo: string, number: number) =>
        gh(`/repos/${owner}/${repo}/issues/${String(number)}`)
    )

    ipcMain.handle('github.createIssue', (_e, owner: string, repo: string, data: {
        title: string
        body?: string
        labels?: string[]
        assignees?: string[]
        milestone?: number
    }) => gh(`/repos/${owner}/${repo}/issues`, {method: 'POST', body: data}))

    ipcMain.handle('github.updateIssue', (_e, owner: string, repo: string, number: number, data: {
        title?: string
        body?: string
        state?: 'open' | 'closed'
        labels?: string[]
        assignees?: string[]
    }) => gh(`/repos/${owner}/${repo}/issues/${String(number)}`, {method: 'PATCH', body: data}))

    ipcMain.handle('github.addIssueComment', (_e, owner: string, repo: string, number: number, body: string) =>
        gh(`/repos/${owner}/${repo}/issues/${String(number)}/comments`, {method: 'POST', body: {body}})
    )

    // ── actions / workflows ───────────────────────────────────────────────────────

    ipcMain.handle('github.listWorkflows', (_e, owner: string, repo: string) =>
        gh(`/repos/${owner}/${repo}/actions/workflows`)
    )

    ipcMain.handle('github.getWorkflow', (_e, owner: string, repo: string, workflowId: string | number) =>
        gh(`/repos/${owner}/${repo}/actions/workflows/${String(workflowId)}`)
    )

    ipcMain.handle('github.triggerWorkflow', (_e, owner: string, repo: string, workflowId: string | number, ref: string, inputs: Record<string, string> = {}) =>
        gh(`/repos/${owner}/${repo}/actions/workflows/${String(workflowId)}/dispatches`, {
            method: 'POST',
            body: {ref, inputs}
        })
    )

    ipcMain.handle('github.listWorkflowRuns', (_e, owner: string, repo: string, workflowId: string | number, per_page = 20) =>
        gh(`/repos/${owner}/${repo}/actions/workflows/${String(workflowId)}/runs?per_page=${String(per_page)}`)
    )

    ipcMain.handle('github.getWorkflowRun', (_e, owner: string, repo: string, runId: number) =>
        gh(`/repos/${owner}/${repo}/actions/runs/${String(runId)}`)
    )

    ipcMain.handle('github.getWorkflowRunLogs', (_e, owner: string, repo: string, runId: number) =>
        gh(`/repos/${owner}/${repo}/actions/runs/${String(runId)}/logs`)
    )

    ipcMain.handle('github.cancelWorkflowRun', (_e, owner: string, repo: string, runId: number) =>
        gh(`/repos/${owner}/${repo}/actions/runs/${String(runId)}/cancel`, {method: 'POST'})
    )

    ipcMain.handle('github.rerunWorkflowRun', (_e, owner: string, repo: string, runId: number) =>
        gh(`/repos/${owner}/${repo}/actions/runs/${String(runId)}/rerun`, {method: 'POST'})
    )

    ipcMain.handle('github.rerunFailedJobs', (_e, owner: string, repo: string, runId: number) =>
        gh(`/repos/${owner}/${repo}/actions/runs/${String(runId)}/rerun-failed-jobs`, {method: 'POST'})
    )

    ipcMain.handle('github.listRunJobs', (_e, owner: string, repo: string, runId: number) =>
        gh(`/repos/${owner}/${repo}/actions/runs/${String(runId)}/jobs`)
    )

    // ── secrets (Actions) ─────────────────────────────────────────────────────────

    ipcMain.handle('github.listSecrets', (_e, owner: string, repo: string) =>
        gh(`/repos/${owner}/${repo}/actions/secrets`)
    )

    // ── releases ──────────────────────────────────────────────────────────────────

    ipcMain.handle('github.listReleases', (_e, owner: string, repo: string) =>
        gh(`/repos/${owner}/${repo}/releases?per_page=20`)
    )

    ipcMain.handle('github.createRelease', (_e, owner: string, repo: string, data: {
        tag_name: string
        name?: string
        body?: string
        draft?: boolean
        prerelease?: boolean
        target_commitish?: string
    }) => gh(`/repos/${owner}/${repo}/releases`, {method: 'POST', body: data}))
}
