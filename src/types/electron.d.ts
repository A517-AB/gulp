import type {
  SessionResource, SessionConfig, SessionState, SerializedSnapshot,
  Activity, ActivityAgentMessaged, Source, JulesOptions, JulesQuery,
  JulesDomain, ListSessionsOptions, JulesClient, SessionClient, Outcome,
} from '@google/jules-sdk'
import type { Snippet } from './snippets'

// ── sdk ipc types ──────────────────────────────────────────────────────────────

type _Unsubscribe   = () => void
type _SyncOpts      = NonNullable<Parameters<JulesClient['sync']>[0]>
type _SyncStats     = Awaited<ReturnType<JulesClient['sync']>>
type _SyncProgress  = Parameters<NonNullable<_SyncOpts['onProgress']>>[0]
type _SyncOptions   = Omit<_SyncOpts, 'onProgress' | 'signal'>
type _SelectOptions = Parameters<SessionClient['activities']['select']>[0]
type _ListOptions   = Parameters<SessionClient['activities']['list']>[0]
type _StreamOptions = Parameters<SessionClient['stream']>[0]
type _IpcOutcome    = Omit<Outcome, 'generatedFiles' | 'changeSet'>

export interface SdkIpc {
  client: {
    sessions:          (options?: ListSessionsOptions) => Promise<SessionResource[]>
    streamSessions:    (onItem: (item: SessionResource) => void, onDone?: () => void, options?: ListSessionsOptions) => _Unsubscribe
    sync:              (options?: _SyncOptions) => Promise<_SyncStats>
    onSyncProgress:    (cb: (p: _SyncProgress) => void) => _Unsubscribe
    select:            <T extends JulesDomain>(query: JulesQuery<T>) => Promise<(T extends 'sessions' ? SessionResource : Activity)[]>
    getSessionResource: (id: string) => Promise<SessionResource>
    run:               (config: SessionConfig) => Promise<{ id: string }>
    with:              (options: JulesOptions) => Promise<void>
    all:               (configs: SessionConfig[], options?: { concurrency?: number; stopOnError?: boolean }) => Promise<{ id: string }[]>
  }
  source: {
    resolve: (repoPath?: string) => Promise<{ github: string | null; baseBranch: string }>
  }
  watcher: {
    start: (dir: string, onSession: (event: { id: string; event: string; filepath: string }) => void) => Promise<string>
    stop:  (watcherId: string) => Promise<void>
  }
  session: {
    send:      (id: string, prompt: string) => Promise<void>
    ask:       (id: string, prompt: string) => Promise<ActivityAgentMessaged>
    approve:   (id: string) => Promise<void>
    info:      (id: string) => Promise<SessionResource>
    result:    (id: string) => Promise<_IpcOutcome>
    waitFor:   (id: string, state: SessionState) => Promise<void>
    snapshot:  (id: string, options?: { activities?: boolean }) => Promise<SerializedSnapshot>
    archive:   (id: string) => Promise<void>
    unarchive: (id: string) => Promise<void>
    select:    (id: string, options?: _SelectOptions) => Promise<Activity[]>
    hydrate:   (id: string) => Promise<number>
    stream:    (id: string, onItem: (item: Activity) => void, onDone?: () => void, options?: _StreamOptions) => _Unsubscribe
    history:   (id: string, onItem: (item: Activity) => void, onDone?: () => void) => _Unsubscribe
    updates:   (id: string, onItem: (item: Activity) => void, onDone?: () => void) => _Unsubscribe
  }
  activities: {
    hydrate:  (id: string) => Promise<number>
    select:   (id: string, options?: _SelectOptions) => Promise<Activity[]>
    list:     (id: string, options?: _ListOptions) => Promise<{ activities: Activity[]; nextPageToken?: string }>
    get:      (id: string, activityId: string) => Promise<Activity>
    history:  (id: string, onItem: (item: Activity) => void, onDone?: () => void) => _Unsubscribe
    updates:  (id: string, onItem: (item: Activity) => void, onDone?: () => void) => _Unsubscribe
    stream:   (id: string, onItem: (item: Activity) => void, onDone?: () => void) => _Unsubscribe
  }
  sources: {
    get: (filter: { github: string }) => Promise<Source | undefined>
  }
  artifact: {
    save: (data: string, filepath: string) => Promise<string>
  }
  repoless: {
    pickDir: () => Promise<string | null>
    start:   (prompt: string, repoPath?: string) => Promise<{ id: string }>
    apply:   (id: string, repoPath: string, branchName: string) => Promise<{ branch: string; diff: string; applied: string[] }>
    run:     (prompt: string, repoPath?: string, onProgress?: (activity: Activity) => void) => Promise<{ id: string; agentMessage?: string; files: Record<string, string> }>
  }
}

// ── git api ────────────────────────────────────────────────────────────────────

export interface GitResult {
  stdout:   string
  stderr:   string
  exitCode: number
  ok:       boolean
}

export interface GitAPI {
  run:           (cwd: string, args: string[]) => Promise<GitResult>
  status:        (cwd: string) => Promise<GitResult>
  log:           (cwd: string, limit?: number, branch?: string) => Promise<GitResult>
  diff:          (cwd: string, args?: string[]) => Promise<GitResult>
  show:          (cwd: string, ref: string) => Promise<GitResult>
  remote:        (cwd: string) => Promise<GitResult>
  branches:      (cwd: string) => Promise<GitResult>
  currentBranch: (cwd: string) => Promise<GitResult>
  tags:          (cwd: string) => Promise<GitResult>
  add:           (cwd: string, files?: string[]) => Promise<GitResult>
  unstage:       (cwd: string, files?: string[]) => Promise<GitResult>
  commit:        (cwd: string, message: string, allowEmpty?: boolean) => Promise<GitResult>
  amend:         (cwd: string, message?: string) => Promise<GitResult>
  push:          (cwd: string, remote?: string, branch?: string, force?: boolean) => Promise<GitResult>
  pull:          (cwd: string, remote?: string, branch?: string, rebase?: boolean) => Promise<GitResult>
  fetch:         (cwd: string, remote?: string, prune?: boolean) => Promise<GitResult>
  checkout:      (cwd: string, branch: string, create?: boolean) => Promise<GitResult>
  deleteBranch:  (cwd: string, branch: string, force?: boolean) => Promise<GitResult>
  merge:         (cwd: string, branch: string, noFF?: boolean) => Promise<GitResult>
  rebase:        (cwd: string, onto: string) => Promise<GitResult>
  stash:         (cwd: string, action?: 'push' | 'pop' | 'list' | 'drop' | 'apply', message?: string) => Promise<GitResult>
  reset:         (cwd: string, mode?: 'soft' | 'mixed' | 'hard', ref?: string) => Promise<GitResult>
  restore:       (cwd: string, files: string[]) => Promise<GitResult>
  clean:         (cwd: string, force?: boolean) => Promise<GitResult>
  init:          (cwd: string) => Promise<GitResult>
  clone:         (url: string, dest: string, shallow?: boolean) => Promise<GitResult>
  shell: {
    exec:      (cwd: string, command: string, args?: string[]) => Promise<GitResult>
    runScript: (cwd: string, scriptPath: string, args?: string[]) => Promise<GitResult>
    runInline: (cwd: string, lang: 'bash' | 'pwsh' | 'python' | 'zsh', code: string) => Promise<GitResult>
  }
}

// ── repos api ─────────────────────────────────────────────────────────────────

export interface RepoInfo {
  path:      string
  name:      string
  addedAt:   number
}

export interface ReposAPI {
  list:            () => Promise<RepoInfo[]>
  register:        (repoPath: string) => Promise<RepoInfo>
  forget:          (repoPath: string) => Promise<void>
  scan:            (rootDir: string) => Promise<RepoInfo[]>
  pickAndRegister: () => Promise<RepoInfo | null>
}

// ── per-tool APIs ──────────────────────────────────────────────────────────────

export type ShellType =
  | "pwsh"
  | "powershell"
  | "git-bash"
  | "wsl"
  | "python"
  | "ipython"
  | "node"
  | "deno";

export interface TerminalAPI {
  start:    (cwd: string, shellType?: ShellType) => void;
  input:    (data: string) => void;
  resize:   (cols: number, rows: number) => void;
  kill:     () => void;
  onOutput: (callback: (data: string) => void) => () => void;
  onExit:   (callback: (exitCode: number, signal?: number) => void) => () => void;
}

export interface QueuesAPI {
  getTasks:  (jsonPath?: string) => Promise<unknown[]>;
  getQueue:  (jsonPath?: string) => Promise<unknown[]>;
  saveTasks: (data: unknown[], jsonPath?: string) => Promise<boolean>;
}

export interface WindowAPI {
  minimize: () => void;
  maximize: () => void;
  close:    () => void;
}

export interface PowerAPI {
  onSuspend: (cb: () => void) => () => void;
  onResume:  (cb: () => void) => () => void;
}

export interface LowPowerAPI {
  enter:             () => void;
  exit:              () => void;
  toggleAlwaysOnTop: () => void;
  onEnter:           (cb: () => void) => () => void;
  onExit:            (cb: () => void) => () => void;
  onAlwaysOnTop:     (cb: (val: boolean) => void) => () => void;
}

export interface PopupNotification {
  id:        string;
  type:      "completed" | "failed" | "pr_created" | "info";
  title:     string;
  body:      string;
  sessionId?: string;
  ts:        number;
}

export interface PopupAPI {
  show:           () => void;
  hide:           () => void;
  close:          () => void;
  notify:         (payload: PopupNotification) => void;
  onNotification: (cb: (payload: PopupNotification) => void) => () => void;
}

export interface FilesystemAPI {
  readdir:        (dir: string)      => Promise<{ name: string; isDir: boolean }[]>;
  readFile:       (path: string)     => Promise<string>;
  writeFile:      (path: string, content: string) => Promise<void>;
  exists:         (path: string)     => Promise<boolean>;
  showOpenDialog: ()                 => Promise<string | null>;
}

export interface EnvAPI {
  getApiKey: () => Promise<string | null>;
}

export interface SnippetsAPI {
  get: () => Promise<Snippet[]>;
  save: (data: Snippet[]) => Promise<boolean>;
}

// ── notes ──────────────────────────────────────────────────────────────────────

export interface NotesAPI {
  list: () => Promise<Array<{ id: string; title: string; updatedAt: string }>>
  get:  (id: string) => Promise<unknown>
  save: (id: string, title: string, blocks: unknown) => Promise<void>
  delete: (id: string) => Promise<void>
  onChanged: (cb: () => void) => () => void
}

// ── alarms ─────────────────────────────────────────────────────────────────────

import type { AlarmEntry } from '../shared/alarms'

export interface AlarmsAPI {
  list:      () => Promise<AlarmEntry[]>
  save:      (alarm: AlarmEntry) => Promise<void>
  delete:    (id: string) => Promise<void>
  toggle:    (id: string, enabled: boolean) => Promise<void>
  snooze:    (id: string, minutes: number) => Promise<void>
  onChanged: (cb: () => void) => () => void
}

// ── notifications ──────────────────────────────────────────────────────────────

import type { AppNotification as IpcNotification } from '../shared/notifications'

export interface NotificationsAPI {
  send:       (n: IpcNotification) => Promise<void>
  onReceived: (cb: (n: IpcNotification) => void) => () => void
}

// ── root ───────────────────────────────────────────────────────────────────────

export interface ElectronAPI {
  terminal:      TerminalAPI;
  queues:        QueuesAPI;
  window:        WindowAPI;
  power:         PowerAPI;
  lowPower:      LowPowerAPI;
  popup:         PopupAPI;
  filesystem:    FilesystemAPI;
  env:           EnvAPI;
  snippets:      SnippetsAPI;
  sdkIpc?:       SdkIpc;
  git?:          GitAPI;
  repos?:        ReposAPI;
  notes?:        NotesAPI;
  alarms?:       AlarmsAPI;
  notifications?: NotificationsAPI;
}

// ── global augments ────────────────────────────────────────────────────────────

declare global {
  interface Window {
    electron?: ElectronAPI;
  }

  namespace React {
    interface CSSProperties {
      WebkitAppRegion?: "drag" | "no-drag";
    }
  }
}
