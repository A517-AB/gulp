import type {
  Activity,
  ActivityAgentMessaged,
  JulesClient,
  JulesDomain,
  JulesOptions,
  JulesQuery,
  ListSessionsOptions,
  Outcome as SdkSessionOutcome,
  SerializedSnapshot,
  SessionClient,
  SessionConfig,
  SessionResource,
  SessionState,
  Source,
} from '@google/jules-sdk';

export type { Activity, ActivityAgentMessaged, SessionConfig, SessionResource, SessionState, Source };

type Unsubscribe = () => void

type _SyncOpts = NonNullable<Parameters<JulesClient['sync']>[0]>
export type SyncStats = Awaited<ReturnType<JulesClient['sync']>>
export type SyncProgress = Parameters<NonNullable<_SyncOpts['onProgress']>>[0]
export type SyncOptions = Omit<_SyncOpts, 'onProgress' | 'signal'>
export type SelectOptions = Parameters<SessionClient['activities']['select']>[0]
export type ListOptions = Parameters<SessionClient['activities']['list']>[0]
export type StreamActivitiesOptions = Parameters<SessionClient['stream']>[0]
export type IpcSessionOutcome = Omit<SdkSessionOutcome, 'generatedFiles' | 'changeSet'>

export interface SessionOutcome {
  agentMessage?: string
  files: Record<string, string>
}

export interface ApplyResult {
  branch: string
  diff: string
  applied: string[]
}

export interface SdkIpc {
  client: {
    sessions: (options?: ListSessionsOptions) => Promise<SessionResource[]>
    streamSessions: (onItem: (item: SessionResource) => void, onDone?: () => void, options?: ListSessionsOptions) => Unsubscribe
    sync: (options?: SyncOptions) => Promise<SyncStats>
    onSyncProgress: (cb: (p: SyncProgress) => void) => Unsubscribe
    select: <T extends JulesDomain>(query: JulesQuery<T>) => Promise<(T extends 'sessions' ? SessionResource : Activity)[]>
    getSessionResource: (id: string) => Promise<SessionResource>
    run: (config: SessionConfig) => Promise<{ id: string }>
    with: (options: JulesOptions) => Promise<void>
  }
  session: {
    send: (id: string, prompt: string) => Promise<void>
    ask: (id: string, prompt: string) => Promise<ActivityAgentMessaged>
    approve: (id: string) => Promise<void>
    info: (id: string) => Promise<SessionResource>
    result: (id: string) => Promise<IpcSessionOutcome>
    waitFor: (id: string, state: SessionState) => Promise<void>
    snapshot: (id: string, options?: { activities?: boolean }) => Promise<SerializedSnapshot>
    archive: (id: string) => Promise<void>
    unarchive: (id: string) => Promise<void>
    select: (id: string, options?: SelectOptions) => Promise<Activity[]>
    hydrate: (id: string) => Promise<number>
    stream: (id: string, onItem: (item: Activity) => void, onDone?: () => void, options?: StreamActivitiesOptions) => Unsubscribe
    history: (id: string, onItem: (item: Activity) => void, onDone?: () => void) => Unsubscribe
    updates: (id: string, onItem: (item: Activity) => void, onDone?: () => void) => Unsubscribe
  }
  activities: {
    hydrate: (id: string) => Promise<number>
    select: (id: string, options?: SelectOptions) => Promise<Activity[]>
    list: (id: string, options?: ListOptions) => Promise<{ activities: Activity[]; nextPageToken?: string }>
    get: (id: string, activityId: string) => Promise<Activity>
    history: (id: string, onItem: (item: Activity) => void, onDone?: () => void) => Unsubscribe
    updates: (id: string, onItem: (item: Activity) => void, onDone?: () => void) => Unsubscribe
    stream: (id: string, onItem: (item: Activity) => void, onDone?: () => void) => Unsubscribe
  }
  sources: {
    get: (filter: { github: string }) => Promise<Source | undefined>
  }
  artifact: {
    save: (data: string, filepath: string) => Promise<string>
  }
  repoless: {
    pickDir: () => Promise<string | null>
    start: (prompt: string, repoPath?: string) => Promise<{ id: string }>
    apply: (id: string, repoPath: string, branchName: string) => Promise<ApplyResult>
  }
}

export interface GitLogEntry {
  hash: string
  short: string
  subject: string
  author: string
  relDate: string
}

export interface GitBranch {
  name: string
  current: boolean
}

export interface GitIpc {
  status: (repoPath: string) => Promise<string>
  log: (repoPath: string, maxCount?: number) => Promise<GitLogEntry[]>
  branches: (repoPath: string) => Promise<GitBranch[]>
  checkout: (repoPath: string, branch: string, create?: boolean) => Promise<void>
  rebase: (repoPath: string, onto: string) => Promise<string>
  rebaseAbort: (repoPath: string) => Promise<void>
  rebaseContinue: (repoPath: string) => Promise<string>
}

export interface ElectronAPI {
  ping: () => Promise<unknown>
  minimize: () => void
  maximize: () => void
  close: () => void
  sdk: SdkIpc
  git: GitIpc
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI
  }
}
