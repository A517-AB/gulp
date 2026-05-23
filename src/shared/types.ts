import type {
  Activity,
  ActivityAgentMessaged,
  GitPatch,
  JulesClient,
  JulesDomain,
  JulesOptions,
  JulesQuery,
  ListSessionsOptions,
  Outcome as SdkSessionOutcome,
  ParsedChangeSet,
  SerializedSnapshot,
  SessionClient,
  SessionConfig,
  SessionResource,
  SessionState,
  Source,
  ValidationResult,
} from '@google/jules-sdk';

export type { Activity, ActivityAgentMessaged, SessionConfig, SessionResource, SessionState, Source };

/** Serializable representation of a generated file from a session outcome. */
export interface GeneratedFile {
  path: string
  changeType: 'created' | 'modified' | 'deleted'
  content: string
  additions: number
  deletions: number
}

type Unsubscribe = () => void

type _SyncOpts = NonNullable<Parameters<JulesClient['sync']>[0]>
export type SyncStats = Awaited<ReturnType<JulesClient['sync']>>
export type SyncProgress = Parameters<NonNullable<_SyncOpts['onProgress']>>[0]
export type SyncOptions = Omit<_SyncOpts, 'onProgress' | 'signal'>
export type SelectOptions = Parameters<SessionClient['activities']['select']>[0]
export type ListOptions = Parameters<SessionClient['activities']['list']>[0]
export type StreamActivitiesOptions = Parameters<SessionClient['stream']>[0]
export type IpcSessionOutcome = Omit<SdkSessionOutcome, 'generatedFiles' | 'changeSet'>

/** Full result with serialized generatedFiles and parsed changeSet data. */
export interface FullSessionResult {
  state: string
  pullRequest?: { url: string; title: string; description: string; baseRef?: string; headRef?: string }
  generatedFiles: GeneratedFile[]
  changeSet?: { source: string; gitPatch: GitPatch; parsed: ParsedChangeSet }
}

/** Options for batch session dispatch via jules.all(). */
export interface BatchOptions {
  concurrency?: number
  stopOnError?: boolean
  delayMs?: number
}

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
    syncAbort: () => Promise<void>
    onSyncProgress: (cb: (p: SyncProgress) => void) => Unsubscribe
    select: <T extends JulesDomain>(query: JulesQuery<T>) => Promise<(T extends 'sessions' ? SessionResource : Activity)[]>
    getSessionResource: (id: string) => Promise<SessionResource>
    run: (config: SessionConfig) => Promise<{ id: string }>
    all: (configs: SessionConfig[], options?: BatchOptions) => Promise<{ id: string }[]>
    with: (options: JulesOptions) => Promise<void>
    validate: (query: unknown) => Promise<ValidationResult>
  }
  session: {
    send: (id: string, prompt: string) => Promise<void>
    ask: (id: string, prompt: string) => Promise<ActivityAgentMessaged>
    approve: (id: string) => Promise<void>
    info: (id: string) => Promise<SessionResource>
    result: (id: string) => Promise<IpcSessionOutcome>
    resultFull: (id: string) => Promise<FullSessionResult>
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
    list: () => Promise<Source[]>
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

export interface ElectronAPI {
  ping: () => Promise<unknown>
  minimize: () => void
  maximize: () => void
  close: () => void
  sdk: SdkIpc
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI
  }
}
