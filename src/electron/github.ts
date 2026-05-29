import { ipcMain } from 'electron'

const GITHUB_API = 'https://api.github.com'

function encodePathSegment(value: string | number): string {
  return encodeURIComponent(String(value))
}

function buildQuery(params: Record<string, string | number | boolean | undefined>): string {
  const query = new URLSearchParams()

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined) {
      query.set(key, String(value))
    }
  })

  return query.toString()
}

function repoEndpoint(owner: string, repo: string, ...segments: (string | number)[]): string {
  const path = [owner, repo, ...segments].map(encodePathSegment).join('/')
  return `/repos/${path}`
}

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
    ...(options.body ? { body: JSON.stringify(options.body) } : {}),
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

  ipcMain.handle('github.listRepos', (_e, ...[sort = 'updated', perPage = 100]: [string?, number?]) =>
    gh(`/user/repos?${buildQuery({ sort, per_page: perPage, affiliation: 'owner,collaborator' })}`)
  )

  ipcMain.handle('github.getRepo', (_e, owner: string, repo: string) =>
    gh(repoEndpoint(owner, repo))
  )

  ipcMain.handle('github.listBranches', (_e, owner: string, repo: string) =>
    gh(`${repoEndpoint(owner, repo, 'branches')}?${buildQuery({ per_page: 100 })}`)
  )

  ipcMain.handle('github.deleteBranch', (_e, owner: string, repo: string, branch: string) =>
    gh(repoEndpoint(owner, repo, 'git', 'refs', 'heads', branch), { method: 'DELETE' })
  )

  ipcMain.handle('github.listCommits', (_e, ...[owner, repo, branch, perPage = 20]: [string, string, string?, number?]) => {
    const query = buildQuery({ per_page: perPage, sha: branch })
    return gh(`${repoEndpoint(owner, repo, 'commits')}?${query}`)
  })

  // ── pull requests ─────────────────────────────────────────────────────────────

  ipcMain.handle('github.listPRs', (_e, owner: string, repo: string, state: 'open' | 'closed' | 'all' = 'open') =>
    gh(`${repoEndpoint(owner, repo, 'pulls')}?${buildQuery({ state, per_page: 50 })}`)
  )

  ipcMain.handle('github.getPR', (_e, owner: string, repo: string, number: number) =>
    gh(repoEndpoint(owner, repo, 'pulls', number))
  )

  ipcMain.handle('github.createPR', (_e, owner: string, repo: string, data: {
    title: string
    body?: string
    head: string
    base: string
    draft?: boolean
  }) => gh(repoEndpoint(owner, repo, 'pulls'), { method: 'POST', body: data }))

  ipcMain.handle('github.updatePR', (_e, owner: string, repo: string, number: number, data: {
    title?: string
    body?: string
    state?: 'open' | 'closed'
    base?: string
  }) => gh(repoEndpoint(owner, repo, 'pulls', number), { method: 'PATCH', body: data }))

  ipcMain.handle('github.mergePR', (_e, owner: string, repo: string, number: number, method: 'merge' | 'squash' | 'rebase' = 'squash') =>
    gh(repoEndpoint(owner, repo, 'pulls', number, 'merge'), { method: 'PUT', body: { merge_method: method } })
  )

  ipcMain.handle('github.reviewPR', (_e, owner: string, repo: string, number: number, event: 'APPROVE' | 'REQUEST_CHANGES' | 'COMMENT', body?: string) =>
    gh(repoEndpoint(owner, repo, 'pulls', number, 'reviews'), { method: 'POST', body: { event, body } })
  )

  ipcMain.handle('github.getPRFiles', (_e, owner: string, repo: string, number: number) =>
    gh(repoEndpoint(owner, repo, 'pulls', number, 'files'))
  )

  ipcMain.handle('github.getPRChecks', (_e, owner: string, repo: string, ref: string) =>
    gh(repoEndpoint(owner, repo, 'commits', ref, 'check-runs'))
  )

  // ── issues ────────────────────────────────────────────────────────────────────

  ipcMain.handle('github.listIssues', (_e, owner: string, repo: string, state: 'open' | 'closed' | 'all' = 'open') =>
    gh(`${repoEndpoint(owner, repo, 'issues')}?${buildQuery({ state, per_page: 50 })}`)
  )

  ipcMain.handle('github.getIssue', (_e, owner: string, repo: string, number: number) =>
    gh(repoEndpoint(owner, repo, 'issues', number))
  )

  ipcMain.handle('github.createIssue', (_e, owner: string, repo: string, data: {
    title: string
    body?: string
    labels?: string[]
    assignees?: string[]
    milestone?: number
  }) => gh(repoEndpoint(owner, repo, 'issues'), { method: 'POST', body: data }))

  ipcMain.handle('github.updateIssue', (_e, owner: string, repo: string, number: number, data: {
    title?: string
    body?: string
    state?: 'open' | 'closed'
    labels?: string[]
    assignees?: string[]
  }) => gh(repoEndpoint(owner, repo, 'issues', number), { method: 'PATCH', body: data }))

  ipcMain.handle('github.addIssueComment', (_e, owner: string, repo: string, number: number, body: string) =>
    gh(repoEndpoint(owner, repo, 'issues', number, 'comments'), { method: 'POST', body: { body } })
  )

  // ── actions / workflows ───────────────────────────────────────────────────────

  ipcMain.handle('github.listWorkflows', (_e, owner: string, repo: string) =>
    gh(repoEndpoint(owner, repo, 'actions', 'workflows'))
  )

  ipcMain.handle('github.getWorkflow', (_e, owner: string, repo: string, workflowId: string | number) =>
    gh(repoEndpoint(owner, repo, 'actions', 'workflows', workflowId))
  )

  ipcMain.handle('github.triggerWorkflow', (_e, owner: string, repo: string, workflowId: string | number, ref: string, inputs: Record<string, string> = {}) =>
    gh(repoEndpoint(owner, repo, 'actions', 'workflows', workflowId, 'dispatches'), { method: 'POST', body: { ref, inputs } })
  )

  ipcMain.handle('github.listWorkflowRuns', (_e, ...[owner, repo, workflowId, perPage = 20]: [string, string, string | number, number?]) =>
    gh(`${repoEndpoint(owner, repo, 'actions', 'workflows', workflowId, 'runs')}?${buildQuery({ per_page: perPage })}`)
  )

  ipcMain.handle('github.getWorkflowRun', (_e, owner: string, repo: string, runId: number) =>
    gh(repoEndpoint(owner, repo, 'actions', 'runs', runId))
  )

  ipcMain.handle('github.getWorkflowRunLogs', (_e, owner: string, repo: string, runId: number) =>
    gh(repoEndpoint(owner, repo, 'actions', 'runs', runId, 'logs'))
  )

  ipcMain.handle('github.cancelWorkflowRun', (_e, owner: string, repo: string, runId: number) =>
    gh(repoEndpoint(owner, repo, 'actions', 'runs', runId, 'cancel'), { method: 'POST' })
  )

  ipcMain.handle('github.rerunWorkflowRun', (_e, owner: string, repo: string, runId: number) =>
    gh(repoEndpoint(owner, repo, 'actions', 'runs', runId, 'rerun'), { method: 'POST' })
  )

  ipcMain.handle('github.rerunFailedJobs', (_e, owner: string, repo: string, runId: number) =>
    gh(repoEndpoint(owner, repo, 'actions', 'runs', runId, 'rerun-failed-jobs'), { method: 'POST' })
  )

  ipcMain.handle('github.listRunJobs', (_e, owner: string, repo: string, runId: number) =>
    gh(repoEndpoint(owner, repo, 'actions', 'runs', runId, 'jobs'))
  )

  // ── secrets (Actions) ─────────────────────────────────────────────────────────

  ipcMain.handle('github.listSecrets', (_e, owner: string, repo: string) =>
    gh(repoEndpoint(owner, repo, 'actions', 'secrets'))
  )

  // ── releases ──────────────────────────────────────────────────────────────────

  ipcMain.handle('github.listReleases', (_e, owner: string, repo: string) =>
    gh(`${repoEndpoint(owner, repo, 'releases')}?${buildQuery({ per_page: 20 })}`)
  )

  ipcMain.handle('github.createRelease', (_e, owner: string, repo: string, data: {
    tag_name: string
    name?: string
    body?: string
    draft?: boolean
    prerelease?: boolean
    target_commitish?: string
  }) => gh(repoEndpoint(owner, repo, 'releases'), { method: 'POST', body: data }))
}
