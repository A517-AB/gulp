import type {
  SessionResource, SessionConfig, SessionState, SerializedSnapshot,
  Activity, ActivityAgentMessaged, Source, JulesOptions, JulesQuery,
  JulesDomain, ListSessionsOptions, JulesClient, SessionClient, Outcome,
} from '@google/jules-sdk'
import type { Snippet } from '../types/snippets'
import type { FsEntry, FsStat, ReaddirOptions, FileFilter } from './filesystem'

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
    sessions:         (options?: ListSessionsOptions) => Promise<SessionResource[]>
    streamSessions:   (onItem: (item: SessionResource) => void, onDone?: () => void, options?: ListSessionsOptions) => _Unsubscribe
    sync:             (options?: _SyncOptions) => Promise<_SyncStats>
    onSyncProgress:   (cb: (p: _SyncProgress) => void) => _Unsubscribe
    select:           <T extends JulesDomain>(query: JulesQuery<T>) => Promise<(T extends 'sessions' ? SessionResource : Activity)[]>
    getSessionResource: (id: string) => Promise<SessionResource>
    run:              (config: SessionConfig) => Promise<{ id: string }>
    with:             (options: JulesOptions) => Promise<void>
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
  readdir:             (dir: string, options?: ReaddirOptions)  => Promise<FsEntry[]>;
  readFile:            (path: string)                           => Promise<string>;
  exists:              (path: string)                           => Promise<boolean>;
  stat:                (path: string)                           => Promise<FsStat>;
  writeFile:           (path: string, content: string)         => Promise<void>;
  appendFile:          (path: string, content: string)         => Promise<void>;
  mkdir:               (path: string)                          => Promise<void>;
  deleteFile:          (path: string)                          => Promise<void>;
  deleteDir:           (path: string)                          => Promise<void>;
  rename:              (oldPath: string, newPath: string)      => Promise<void>;
  move:                (src: string, dest: string)             => Promise<void>;
  copy:                (src: string, dest: string)             => Promise<void>;
  copyDir:             (src: string, dest: string)             => Promise<void>;
  openPath:            (path: string)                          => Promise<string>;
  revealInFileManager: (path: string)                          => Promise<void>;
  showOpenDialog:      ()                                       => Promise<string | null>;
  showOpenFileDialog:  (filters?: FileFilter[])                => Promise<string | null>;
  showSaveDialog:      (defaultName?: string)                  => Promise<string | null>;
}

export interface EnvAPI {
  getApiKey: () => Promise<string | null>;
}

export interface SnippetsAPI {
  get: () => Promise<Snippet[]>;
  save: (data: Snippet[]) => Promise<boolean>;
}

// ── root ───────────────────────────────────────────────────────────────────────

export interface ElectronAPI {
  terminal:   TerminalAPI;
  queues:     QueuesAPI;
  window:     WindowAPI;
  power:      PowerAPI;
  popup:      PopupAPI;
  filesystem: FilesystemAPI;
  env:        EnvAPI;
  snippets:   SnippetsAPI;
  sdkIpc?:    SdkIpc;
}

// ── global augments ────────────────────────────────────────────────────────────

// TODO: Nur this shit will fuck us later, don't expose everything on Window globally.
// bridge.ts should be the only entry point — cast locally there and kill this declare global.
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
