import type { IpcRendererEvent } from "electron";
import { contextBridge, ipcRenderer } from "electron";
import type { ShellType, PopupNotification, ElectronAPI } from "../types/electron";
import { sdk } from "./jules/sdk.js";
// ── terminal ───────────────────────────────────────────────────────────────────

const terminal: ElectronAPI["terminal"] = {
  start: (cwd: string, shellType?: ShellType) => {
    ipcRenderer.send("terminal.start", { cwd, shellType });
  },

  input: (data: string) => {
    ipcRenderer.send("terminal.input", data);
  },

  resize: (cols: number, rows: number) => {
    ipcRenderer.send("terminal.resize", { cols, rows });
  },

  kill: () => {
    ipcRenderer.send("terminal.kill");
  },

  onOutput: (callback: (data: string) => void) => {
    const handler = (_event: IpcRendererEvent, data: string) => {
      callback(data);
    };
    ipcRenderer.on("terminal.output", handler);
    return () => {
      ipcRenderer.off("terminal.output", handler);
    };
  },

  onExit: (callback: (exitCode: number, signal?: number) => void) => {
    const handler = (_event: IpcRendererEvent, { exitCode, signal }: { exitCode: number; signal?: number }) => {
      callback(exitCode, signal);
    };
    ipcRenderer.on("terminal.exit", handler);
    return () => {
      ipcRenderer.off("terminal.exit", handler);
    };
  },
};

// ── queues ─────────────────────────────────────────────────────────────────────

const queues: ElectronAPI["queues"] = {
  getTasks:  (jsonPath?: string) => ipcRenderer.invoke("queues.getTasks",  jsonPath),
  getQueue:  (jsonPath?: string) => ipcRenderer.invoke("queues.getQueue",  jsonPath),
  saveTasks: (data: unknown[], jsonPath?: string) => ipcRenderer.invoke("queues.saveTasks", data, jsonPath),
};

// ── window controls ────────────────────────────────────────────────────────────

const window_: ElectronAPI["window"] = {
  minimize: () => {
    ipcRenderer.send("window.minimize");
  },
  maximize: () => {
    ipcRenderer.send("window.maximize");
  },
  close:    () => {
    ipcRenderer.send("window.close");
  },
};

// ── power ──────────────────────────────────────────────────────────────────────
// TODO: check if this should use Electron 42 power efficiency API instead of IPC

const power: ElectronAPI["power"] = {
  onSuspend: (cb: () => void) => {
    const handler = () => {
      cb();
    };
    ipcRenderer.on("power.suspend", handler);
    return () => {
      ipcRenderer.off("power.suspend", handler);
    };
  },
  onResume: (cb: () => void) => {
    const handler = () => {
      cb();
    };
    ipcRenderer.on("power.resume", handler);
    return () => {
      ipcRenderer.off("power.resume", handler);
    };
  },
};

// ── low power ──────────────────────────────────────────────────────────────────

const lowPower: ElectronAPI["lowPower"] = {
  enter:             () => { ipcRenderer.send("lowPower.manualEnter") },
  exit:              () => { ipcRenderer.send("lowPower.manualExit") },
  toggleAlwaysOnTop: () => { ipcRenderer.send("lowPower.toggleAlwaysOnTop") },
  onEnter: (cb) => {
    const handler = () => { cb() }
    ipcRenderer.on("lowPower.enter", handler)
    return () => { ipcRenderer.off("lowPower.enter", handler) }
  },
  onExit: (cb) => {
    const handler = () => { cb() }
    ipcRenderer.on("lowPower.exit", handler)
    return () => { ipcRenderer.off("lowPower.exit", handler) }
  },
  onAlwaysOnTop: (cb) => {
    const handler = (_event: IpcRendererEvent, val: boolean) => { cb(val) }
    ipcRenderer.on("lowPower.alwaysOnTop", handler)
    return () => { ipcRenderer.off("lowPower.alwaysOnTop", handler) }
  },
}

// ── popup ──────────────────────────────────────────────────────────────────────

const popup: ElectronAPI["popup"] = {
  show:  () => {
    ipcRenderer.send("popup.show");
  },
  hide:  () => {
    ipcRenderer.send("popup.hide");
  },
  close: () => {
    ipcRenderer.send("popup.hide");
  },

  notify: (payload: PopupNotification) => {
    ipcRenderer.send("popup.notify", payload);
  },

  onNotification: (cb: (payload: PopupNotification) => void) => {
    const handler = (_event: IpcRendererEvent, data: PopupNotification) => {
      cb(data);
    };
    ipcRenderer.on("popup.notification", handler);
    return () => {
      ipcRenderer.off("popup.notification", handler);
    };
  },
};

// ── filesystem ─────────────────────────────────────────────────────────────────

const filesystem: ElectronAPI["filesystem"] = {
  readdir:        (dir)      => ipcRenderer.invoke("fs.readdir", dir),
  readFile:       (filePath) => ipcRenderer.invoke("fs.readFile", filePath),
  writeFile:      (filePath, content) => ipcRenderer.invoke("fs.writeFile", filePath, content),
  exists:         (filePath) => ipcRenderer.invoke("fs.exists", filePath),
  showOpenDialog: ()         => ipcRenderer.invoke("fs.showOpenDialog"),
};

// ── env ────────────────────────────────────────────────────────────────────────

const env: ElectronAPI["env"] = {
  getApiKey: () => ipcRenderer.invoke("env.getApiKey"),
};

// ── snippets ───────────────────────────────────────────────────────────────────

const snippets: ElectronAPI["snippets"] = {
  get:  () => ipcRenderer.invoke("snippets.get"),
  save: (data) => ipcRenderer.invoke("snippets.save", data),
};

// ── git ────────────────────────────────────────────────────────────────────────

const git: ElectronAPI["git"] = {
  run:           (cwd, args)                    => ipcRenderer.invoke("git.run", cwd, args),
  status:        (cwd)                          => ipcRenderer.invoke("git.status", cwd),
  log:           (cwd, limit, branch)           => ipcRenderer.invoke("git.log", cwd, limit, branch),
  diff:          (cwd, args)                    => ipcRenderer.invoke("git.diff", cwd, args),
  show:          (cwd, ref)                     => ipcRenderer.invoke("git.show", cwd, ref),
  remote:        (cwd)                          => ipcRenderer.invoke("git.remote", cwd),
  branches:      (cwd)                          => ipcRenderer.invoke("git.branches", cwd),
  currentBranch: (cwd)                          => ipcRenderer.invoke("git.currentBranch", cwd),
  tags:          (cwd)                          => ipcRenderer.invoke("git.tags", cwd),
  add:           (cwd, files)                   => ipcRenderer.invoke("git.add", cwd, files),
  unstage:       (cwd, files)                   => ipcRenderer.invoke("git.unstage", cwd, files),
  commit:        (cwd, message, allowEmpty)     => ipcRenderer.invoke("git.commit", cwd, message, allowEmpty),
  amend:         (cwd, message)                 => ipcRenderer.invoke("git.amend", cwd, message),
  push:          (cwd, remote, branch, force)   => ipcRenderer.invoke("git.push", cwd, remote, branch, force),
  pull:          (cwd, remote, branch, rebase)  => ipcRenderer.invoke("git.pull", cwd, remote, branch, rebase),
  fetch:         (cwd, remote, prune)           => ipcRenderer.invoke("git.fetch", cwd, remote, prune),
  checkout:      (cwd, branch, create)          => ipcRenderer.invoke("git.checkout", cwd, branch, create),
  deleteBranch:  (cwd, branch, force)           => ipcRenderer.invoke("git.deleteBranch", cwd, branch, force),
  merge:         (cwd, branch, noFF)            => ipcRenderer.invoke("git.merge", cwd, branch, noFF),
  rebase:        (cwd, onto)                    => ipcRenderer.invoke("git.rebase", cwd, onto),
  stash:         (cwd, action, message)         => ipcRenderer.invoke("git.stash", cwd, action, message),
  reset:         (cwd, mode, ref)               => ipcRenderer.invoke("git.reset", cwd, mode, ref),
  restore:       (cwd, files)                   => ipcRenderer.invoke("git.restore", cwd, files),
  clean:         (cwd, force)                   => ipcRenderer.invoke("git.clean", cwd, force),
  init:          (cwd)                          => ipcRenderer.invoke("git.init", cwd),
  clone:         (url, dest, shallow)           => ipcRenderer.invoke("git.clone", url, dest, shallow),
  shell: {
    exec:      (cwd, command, args)         => ipcRenderer.invoke("shell.exec", cwd, command, args),
    runScript: (cwd, scriptPath, args)      => ipcRenderer.invoke("shell.runScript", cwd, scriptPath, args),
    runInline: (cwd, lang, code)            => ipcRenderer.invoke("shell.runInline", cwd, lang, code),
  },
};

// ── repos ──────────────────────────────────────────────────────────────────────

const repos: ElectronAPI["repos"] = {
  list:            ()          => ipcRenderer.invoke("repos.list"),
  register:        (repoPath)  => ipcRenderer.invoke("repos.register", repoPath),
  forget:          (repoPath)  => ipcRenderer.invoke("repos.forget", repoPath),
  scan:            (rootDir)   => ipcRenderer.invoke("repos.scan", rootDir),
  pickAndRegister: ()          => ipcRenderer.invoke("repos.pickAndRegister"),
};

// ── expose ─────────────────────────────────────────────────────────────────────

const api: ElectronAPI = {
  terminal,
  queues,
  window:   window_,
  power,
  lowPower,
  popup,
  filesystem,
  env,
  snippets,
  sdkIpc: sdk,
  git,
  repos,
};

contextBridge.exposeInMainWorld("electron", api);
