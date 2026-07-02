import type {FileFilter, FsEntry, FsStat, ReaddirOptions} from './filesystem'
import type {FuseChangeEvent, FuseManifest} from './fuse'
import type {NoteMeta} from './local-data'


// ── event bus ─────────────────────────────────────────────────────────────────

export interface EventBusEntry {
  id:      string
  eventId: string
  data:    Record<string, unknown>
  ts:      string
}

export interface NotifRuleAction {
  id:     string
  label:  string
  style?: 'primary' | 'ghost'
}

export interface NotifRule {
  id:      string
  eventId: string
  enabled: boolean
  notif: {
    title:     string
    body?:     string
    type?:     'default' | 'success' | 'error' | 'info' | 'warning'
    sound?:    string
    duration?: number
    size?:     'compact' | 'full'
    color?:    string
    actions?:  NotifRuleAction[]
  }
}

export interface EventBusAPI {
  getLog:      () => Promise<EventBusEntry[]>
  clearLog:    () => Promise<void>
  getRules:    () => Promise<NotifRule[]>
  saveRule:    (rule: NotifRule) => Promise<NotifRule[]>
  deleteRule:  (id: string) => Promise<void>
  subscribe:   () => void
  unsubscribe: () => void
  on:          (cb: (entry: EventBusEntry) => void) => () => void
}

// ── per-tool APIs ──────────────────────────────────────────────────────────────
// TODO: figure out the setup here. the diffrence between the types in electron.d.ts and the the rest of the files and bridge.
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

export interface WindowAPI {
  minimize: () => void;
  maximize: () => void;
  close:    () => void;
  quit:     () => void;
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
    getPathForFile: (file: File) => string;
}

export interface EnvAPI {
  getApiKey: () => Promise<string | null>;
}
export interface NotesAPI {
  get:       (id: string) => Promise<object[] | null>
  save:      (id: string, title: string, blocks: object[]) => Promise<boolean>
  delete:    (id: string) => Promise<boolean>
  list:      () => Promise<NoteMeta[]>
  onChanged: (cb: () => void) => () => void
}

export interface SnippetsAPI {
    get: () => Promise<FuseManifest>;
    save: (data: FuseManifest) => Promise<boolean>;
    onChanged: (cb: (change: FuseChangeEvent) => void) => () => void;
    readCode: (relPath: string) => Promise<string>;
    writeCode: (relPath: string, content: string) => Promise<void>;
    deleteCode: (relPath: string) => Promise<void>;
}

export interface UINotifAction {
  id:     string;
  label:  string;
  style?: 'primary' | 'ghost';
}

export interface UINotificationPayload {
  title:      string;
  body?:      string;
  type?:      'default' | 'success' | 'error' | 'info' | 'warning';
  actions?:   UINotifAction[];
  duration?:  number;
  id?:        string | number;
  sound?:     string;
  extraData?: unknown;
  source?:    string;
    color?: string;
    icon?: string;
}

export interface UINotificationAPI {
  show:     (payload: UINotificationPayload) => void;
  destroy:  () => void;
  onAction: (cb: (actionId: string, extraData: unknown) => void) => () => void;
}

export interface NotifLogEntry {
  id:       string;
  title:    string;
  body?:    string;
  source?:  string;
  firedAt:  string;
  seen:     boolean;
  actions?: { id: string; label: string }[];
}

export interface NotifLogAPI {
  get:         () => Promise<NotifLogEntry[]>;
  clear:       () => Promise<void>;
  markSeen:    (id: string) => Promise<NotifLogEntry[]>;
  markAllSeen: () => Promise<NotifLogEntry[]>;
}

// ── scheduler ─────────────────────────────────────────────────────────────────

type WeekDay = 0 | 1 | 2 | 3 | 4 | 5 | 6

interface AlarmSchedule { kind: 'alarm';    time: string; days: WeekDay[] }
interface OnceSchedule { kind: 'once';     at: string }
interface DailySchedule { kind: 'daily';    time: string }
interface WeeklySchedule { kind: 'weekly';   time: string; dayOfWeek: WeekDay }
interface MonthlySchedule { kind: 'monthly';  time: string; dayOfMonth: number }
interface IntervalSchedule { kind: 'interval'; everyMinutes: number }

interface WindowedSchedule {
    kind: 'windowed';
    everyMinutes: number;
    fromHour: number;
    toHour: number;
    days: WeekDay[]
}

export type ScheduleInput =
  | AlarmSchedule | OnceSchedule | DailySchedule
    | WeeklySchedule | MonthlySchedule | IntervalSchedule | WindowedSchedule

export interface ScheduledItem {
  id:           string
  label:        string
  body?:        string
  schedule:     ScheduleInput
  enabled:      boolean
  sound?:       string
  category?:    string
    actions?: UINotifAction[]
    leadTimeMin?: number
  createdAt:    string
  lastFiredAt?: string
    completed?: boolean
    completedAt?: string
    color?: string
    icon?: string
}


export interface UpcomingRun {
    id: string
    label: string
    nextRun: string | null
}

export interface SchedulerAPI {
    list: () => Promise<ScheduledItem[]>
    add: (item: ScheduledItem) => Promise<ScheduledItem>
    remove: (id: string) => Promise<void>
    toggle: (id: string, enabled: boolean) => Promise<ScheduledItem>
    snooze: (id: string, minutes: number) => Promise<ScheduledItem>
    markDone: (id: string) => Promise<ScheduledItem | undefined>
    upcoming: () => Promise<UpcomingRun[]>
}

export type JulesWorkerEvent =
  | { type: 'ready' }
  | { type: 'session.new';          sessionId: string; state: string }
  | { type: 'session.stateChanged'; sessionId: string; state: string; prevState: string }
  | { type: 'error';                message: string }

export interface JulesEventsAPI {
  subscribe:   () => void
  unsubscribe: () => void
  on:          (cb: (event: JulesWorkerEvent) => void) => () => void
}

export interface GitExecResult {
    stdout: string;
    stderr: string;
    exitCode: number;
    ok: boolean;
}

export interface GitAPI {
    run: (cwd: string, args: string[]) => Promise<GitExecResult>;
    status: (cwd: string) => Promise<GitExecResult>;
    add: (cwd: string, files?: string[]) => Promise<GitExecResult>;
    commit: (cwd: string, message: string, allowEmpty?: boolean) => Promise<GitExecResult>;
    push: (cwd: string, remote?: string, branch?: string, force?: boolean) => Promise<GitExecResult>;
    pull: (cwd: string, remote?: string, branch?: string, rebase?: boolean) => Promise<GitExecResult>;
    init: (cwd: string) => Promise<GitExecResult>;
}

export interface StoreAPI {
    get:    (key: string) => Promise<unknown>
    set:    (key: string, value: unknown) => Promise<void>
    delete: (key: string) => Promise<void>
}

export interface GitHubBranch {
    name: string;
    protected: boolean;
}

export interface GitHubIssue {
    number: number;
    html_url: string;
    title: string;
    body?: string;
    state: string;
    labels: { name: string }[];
    assignees: { login: string }[];
}

export interface GitHubPR {
    number: number;
    html_url: string;
    title: string;
    body?: string;
    state: string;
    head: { ref: string; sha: string };
    base: { ref: string };
    draft?: boolean;
    merged?: boolean;
}

export interface GitHubCheckRun {
    id: number;
    name: string;
    status: string;
    conclusion: string | null;
    html_url: string;
}

export interface GitHubAPI {
    getUser: () => Promise<unknown>;
    listRepos: (sort?: string, per_page?: number) => Promise<unknown[]>;
    listBranches: (owner: string, repo: string) => Promise<GitHubBranch[]>;
    deleteBranch: (owner: string, repo: string, branch: string) => Promise<void>;
    listPRs: (owner: string, repo: string, state?: 'open' | 'closed' | 'all') => Promise<GitHubPR[]>;
    getPR: (owner: string, repo: string, number: number) => Promise<GitHubPR>;
    createPR: (owner: string, repo: string, data: {
        title: string;
        body?: string;
        head: string;
        base: string;
        draft?: boolean
    }) => Promise<GitHubPR>;
    updatePR: (owner: string, repo: string, number: number, data: {
        title?: string;
        body?: string;
        state?: 'open' | 'closed';
        base?: string
    }) => Promise<GitHubPR>;
    mergePR: (owner: string, repo: string, number: number, method?: 'merge' | 'squash' | 'rebase') => Promise<void>;
    getPRChecks: (owner: string, repo: string, ref: string) => Promise<{ check_runs: GitHubCheckRun[] }>;
    listIssues: (owner: string, repo: string, state?: 'open' | 'closed' | 'all') => Promise<GitHubIssue[]>;
    createIssue: (owner: string, repo: string, data: {
        title: string;
        body?: string;
        labels?: string[];
        assignees?: string[];
        milestone?: number
    }) => Promise<GitHubIssue>;
    updateIssue: (owner: string, repo: string, number: number, data: {
        title?: string;
        body?: string;
        state?: 'open' | 'closed';
        labels?: string[];
        assignees?: string[]
    }) => Promise<GitHubIssue>;
    addIssueComment: (owner: string, repo: string, number: number, body: string) => Promise<void>;
}

// ── root ───────────────────────────────────────────────────────────────────────

export interface QueuesAPI {
    getTasks: (jsonPath?: string) => Promise<unknown>;
    getQueue: (jsonPath?: string) => Promise<unknown>;
    saveTasks: (data: unknown[], jsonPath?: string) => Promise<unknown>;
}

export interface ElectronAPI {
  terminal:        TerminalAPI;
  queues:          QueuesAPI;
  window:          WindowAPI;
  power:           PowerAPI;
  popup:           PopupAPI;
  filesystem:      FilesystemAPI;
  env:             EnvAPI;
  notes:           NotesAPI;
  snippets:        SnippetsAPI;
  uiNotification:  UINotificationAPI;
  scheduler:       SchedulerAPI;
  notifLog:        NotifLogAPI;
  git:             GitAPI;
    github: GitHubAPI;
  store:           StoreAPI;
    ipc: {
        artifact: {
            save: (base64Patch: string, savePath: string) => Promise<{ success: boolean }>;
        };
        session: {
            applyPatch: (sessionId: string, options: { cwd: string; patch: string }) => Promise<{
                success: boolean;
                branch?: string;
                error?: string
            }>;
        };
    };

    // Removed on 2026-06-22: Jules is its own service, not an Electron tool.
    // Kept here as a reminder that we MUST NOT bring raw SdkIpc back to the bridge.
    // client:          SdkIpc['client'];
    // session:         SdkIpc['session'];
    // activities:      SdkIpc['activities'];
    // sources:         SdkIpc['sources'];
    // artifact:        SdkIpc['artifact'];
    // util:            SdkIpc['util'];
    // query:           SdkIpc['query'];
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
