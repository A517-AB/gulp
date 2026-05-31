import type { FsEntry, FsStat, ReaddirOptions, FileFilter } from './filesystem'
import type { FuseManifest, FuseChangeEvent } from './fuse'

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

export type JulesLocalSessionState =
  | 'unspecified'
  | 'queued'
  | 'planning'
  | 'awaitingPlanApproval'
  | 'awaitingUserFeedback'
  | 'inProgress'
  | 'paused'
  | 'failed'
  | 'completed'

export interface JulesLocalSessionRequest {
  prompt: string;
  title?: string;
  github?: string;
  branch?: string;
  requireApproval?: boolean;
  autoPr?: boolean;
  environmentVariablesEnabled?: boolean;
}

export interface JulesLocalSessionInfo {
  id: string;
  title: string;
  prompt: string;
  state: JulesLocalSessionState;
  url: string;
  source?: string;
  branch?: string;
  archived: boolean;
  outputTypes: Array<'pullRequest' | 'changeSet'>;
  pullRequestUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export interface JulesLocalGeneratedFile {
  path: string;
  changeType: 'created' | 'modified' | 'deleted';
  content: string;
  additions: number;
  deletions: number;
}

export interface JulesLocalFileFilter {
  extensions?: string[];
  pathIncludes?: string;
}

export interface JulesLocalArtifact {
  type: 'changeSet' | 'bashOutput' | 'media';
  source?: string;
  diff?: string;
  summary?: string;
  files?: JulesLocalGeneratedFile[];
  command?: string;
  output?: string;
  exitCode?: number | null;
  format?: string;
  hasData?: boolean;
}

export interface JulesLocalPlanStep {
  id: string;
  title: string;
  description?: string;
  index: number;
}

export interface JulesLocalPlan {
  id: string;
  createTime: string;
  steps: JulesLocalPlanStep[];
}

export interface JulesLocalActivity {
  id: string;
  type: string;
  createTime: string;
  originator?: string;
  message?: string;
  title?: string;
  description?: string;
  reason?: string;
  plan?: JulesLocalPlan;
  artifacts: JulesLocalArtifact[];
}

export interface JulesLocalStreamActivityEvent {
  sessionId: string;
  activity: JulesLocalActivity;
}

export interface JulesLocalStreamStateEvent {
  sessionId: string;
  state: 'started' | 'completed' | 'failed' | 'stopped';
  info?: JulesLocalSessionInfo;
  error?: string;
}

export interface SnippetsAPI {
  get:       () => Promise<FuseManifest>;
  save:      (data: FuseManifest) => Promise<boolean>;
  onChanged: (cb: (change: FuseChangeEvent) => void) => () => void;
}

export interface JulesLocalAPI {
  setApiKey: (apiKey: string | null) => Promise<boolean>;
  createSession: (request: JulesLocalSessionRequest) => Promise<JulesLocalSessionInfo>;
  resumeSession: (sessionId: string) => Promise<JulesLocalSessionInfo>;
  getSession: (sessionId: string) => Promise<JulesLocalSessionInfo>;
  approve: (sessionId: string) => Promise<void>;
  sendMessage: (sessionId: string, prompt: string) => Promise<void>;
  ask: (sessionId: string, prompt: string) => Promise<JulesLocalActivity>;
  getGeneratedFiles: (
    sessionId: string,
    filter?: JulesLocalFileFilter,
  ) => Promise<JulesLocalGeneratedFile[]>;
  getMarkdownFiles: (sessionId: string) => Promise<JulesLocalGeneratedFile[]>;
  startStream: (sessionId: string) => Promise<void>;
  stopStream: (sessionId: string) => Promise<void>;
  onActivity: (cb: (payload: JulesLocalStreamActivityEvent) => void) => () => void;
  onStreamState: (cb: (payload: JulesLocalStreamStateEvent) => void) => () => void;
  applyPatch: (
    sessionId: string,
    opts: { branch?: string; dryRun?: boolean; cwd: string }
  ) => Promise<
    | { success: true; branch: string; commitMessage: string; dryRun?: boolean }
    | { success: false; error: string }
  >;
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
  snippets: SnippetsAPI;
  sdkIpc:   JulesLocalAPI;
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
