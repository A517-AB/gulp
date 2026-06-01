import type { FsEntry, FsStat, ReaddirOptions, FileFilter } from './filesystem'
import type { FuseManifest, FuseChangeEvent } from './fuse'
import type { JulesAlias } from './aliases'
import type { HistoryEntry } from './history'
import type { NoteMeta } from './notes'

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

export interface JulesLocalSource {
  name: string;
  id: string;
  type: 'githubRepo';
  fullName: string;
  owner: string;
  repo: string;
  isPrivate: boolean;
  defaultBranch?: string;
  branches: string[];
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

export interface JulesLocalSessionOutcome {
  sessionId: string;
  title: string;
  state: 'completed' | 'failed';
  outputTypes: Array<'pullRequest' | 'changeSet'>;
  generatedFiles: JulesLocalGeneratedFile[];
  pullRequestUrl?: string;
  pullRequestTitle?: string;
  changeSet?: JulesLocalArtifact;
}

export interface JulesLocalSnapshotTimelineEntry {
  time: string;
  type: string;
  summary: string;
}

export interface JulesLocalSnapshotInsights {
  completionAttempts: number;
  planRegenerations: number;
  userInterventions: number;
  failedCommandCount: number;
}

export interface JulesLocalSessionSnapshot {
  id: string;
  state: JulesLocalSessionState;
  url: string;
  createdAt: string;
  updatedAt: string;
  durationMs: number;
  prompt: string;
  title: string;
  activities: JulesLocalActivity[];
  activityCounts: Record<string, number>;
  timeline: JulesLocalSnapshotTimelineEntry[];
  insights: JulesLocalSnapshotInsights;
  generatedFiles: JulesLocalGeneratedFile[];
  markdown: string;
  pullRequestUrl?: string;
  pullRequestTitle?: string;
  changeSet?: JulesLocalArtifact;
}

export interface JulesLocalFleetIssueFixRequest {
  repositories: string[];
  issue: string;
  branch?: string;
  titlePrefix?: string;
  autoPr?: boolean;
  requireApproval?: boolean;
  concurrency?: number;
  stopOnError?: boolean;
  delayMs?: number;
}

export interface JulesLocalFleetIssueFixResult {
  repository: string;
  session: JulesLocalSessionInfo;
}

export interface HistoryAPI {
  get:    () => Promise<HistoryEntry[]>
  push:   (text: string) => Promise<HistoryEntry[]>
  remove: (id: string) => Promise<HistoryEntry[]>
}

export interface NotesAPI {
  get:       (id: string) => Promise<object[] | null>
  save:      (id: string, title: string, blocks: object[]) => Promise<boolean>
  delete:    (id: string) => Promise<boolean>
  list:      () => Promise<NoteMeta[]>
  onChanged: (cb: () => void) => () => void
}

export interface AliasesAPI {
  get:       () => Promise<{ aliases: JulesAlias[]; fileFound: boolean }>
  save:      (aliases: JulesAlias[]) => Promise<boolean>
  onChanged: (cb: (aliases: JulesAlias[] | null) => void) => () => void
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
  hydrateSession: (sessionId: string) => Promise<number>;
  getHistory: (sessionId: string) => Promise<JulesLocalActivity[]>;
  listSources: () => Promise<JulesLocalSource[]>;
  getSource: (github: string) => Promise<JulesLocalSource | null>;
  getResult: (sessionId: string) => Promise<JulesLocalSessionOutcome>;
  getSnapshot: (sessionId: string) => Promise<JulesLocalSessionSnapshot>;
  dispatchFleetIssueFix: (
    request: JulesLocalFleetIssueFixRequest,
  ) => Promise<JulesLocalFleetIssueFixResult[]>;
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
  history:  HistoryAPI;
  aliases:  AliasesAPI;
  notes:    NotesAPI;
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
