import type { FsEntry, FsStat, ReaddirOptions, FileFilter } from './filesystem'
import type { FuseManifest, FuseChangeEvent } from './fuse'
import type { Command } from './commands'
import type { HistoryEntry } from './history'
import type { NoteMeta } from './notes'


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
  get:       () => Promise<{ aliases: Command[]; fileFound: boolean }>
  save:      (aliases: Command[]) => Promise<boolean>
  onChanged: (cb: (aliases: Command[] | null) => void) => () => void
}

export interface SnippetsAPI {
  get:       () => Promise<FuseManifest>;
  save:      (data: FuseManifest) => Promise<boolean>;
  onChanged: (cb: (change: FuseChangeEvent) => void) => () => void;
}

export interface UINotificationPayload {
  title:      string;
  body?:      string;
  type?:      'default' | 'success' | 'error' | 'info' | 'warning';
  action?:    { label: string };
  cancel?:    { label: string };
  duration?:  number;
  id?:        string | number;
  sound?:     string;
  extraData?: unknown;
}

export interface UINotificationAPI {
  show:        (payload: UINotificationPayload) => void;
  destroy:     () => void;
  onClicked:   (cb: (extraData: unknown) => void) => () => void;
  onCancelled: (cb: (extraData: unknown) => void) => () => void;
}

// ── root ───────────────────────────────────────────────────────────────────────

export interface ElectronAPI {
  terminal:        TerminalAPI;
  queues:          QueuesAPI;
  window:          WindowAPI;
  power:           PowerAPI;
  popup:           PopupAPI;
  filesystem:      FilesystemAPI;
  env:             EnvAPI;
  history:         HistoryAPI;
  aliases:         AliasesAPI;
  notes:           NotesAPI;
  snippets:        SnippetsAPI;
  uiNotification:  UINotificationAPI;
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
