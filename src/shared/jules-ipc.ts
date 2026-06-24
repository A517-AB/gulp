export interface JulesGitSource {
    owner: string
    repo: string
    baseBranch: string
}

export interface JulesParsedFile {
    path: string
    changeType: 'created' | 'modified' | 'deleted'
    additions: number
    deletions: number
    content: string
}

export interface JulesApplyResult {
    ok: boolean
    error?: string
}

export interface JulesPrRef {
    owner: string
    repo: string
    number: number
}

export interface JulesPrInfo {
    number: number
    title: string
    state: 'open' | 'closed'
    merged: boolean
    html_url: string
    head: { sha: string; ref: string }
    base: { ref: string }
}

export interface JulesCheckRun {
    id: number
    name: string
    status: 'queued' | 'in_progress' | 'completed'
    conclusion: string | null
    html_url: string
}

export interface JulesChecksResponse {
    check_runs: JulesCheckRun[]
    total_count: number
}

export interface JulesFleetTask {
    prompt: string
    source?: string
    branch?: string
}

export interface JulesFleetResult {
    taskIndex: number
    sessionId: string
    state: string
    prUrl?: string
    error?: string
}

export interface JulesGitIPC {
    resolveSource: (cwd: string) => Promise<JulesGitSource | null>
    applyPatch: (cwd: string, patch: string) => Promise<JulesApplyResult>
    parseUnidiff: (patch: string) => Promise<JulesParsedFile[]>
}

export interface JulesGitHubIPC {
    getPr: (owner: string, repo: string, number: number) => Promise<JulesPrInfo>
    getChecks: (owner: string, repo: string, ref: string) => Promise<JulesChecksResponse>
    mergePr: (owner: string, repo: string, number: number, method?: 'merge' | 'squash' | 'rebase') => Promise<void>
    parsePrUrl: (url: string) => Promise<JulesPrRef | null>
}

export interface JulesFleetIPC {
    run: (tasks: JulesFleetTask[], concurrency?: number) => Promise<JulesFleetResult[]>
}

export interface JulesArtifactIPC {
    save: (data: string, filepath: string) => Promise<string>
}

export interface JulesIPC {
    git: JulesGitIPC
    github: JulesGitHubIPC
    artifact: JulesArtifactIPC
}

declare global {
    interface Window {
        jules?: JulesIPC
    }
}
