import type { IpcRendererEvent } from "electron";
import { contextBridge, ipcRenderer } from "electron";
import type { ShellType, PopupNotification, ElectronAPI } from "../src/shared/electron";
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
  readdir:             (dir, opts)  => ipcRenderer.invoke("fs.readdir", dir, opts),
  readFile:            (p)          => ipcRenderer.invoke("fs.readFile", p),
  exists:              (p)          => ipcRenderer.invoke("fs.exists", p),
  stat:                (p)          => ipcRenderer.invoke("fs.stat", p),
  writeFile:           (p, c)       => ipcRenderer.invoke("fs.writeFile", p, c),
  appendFile:          (p, c)       => ipcRenderer.invoke("fs.appendFile", p, c),
  mkdir:               (p)          => ipcRenderer.invoke("fs.mkdir", p),
  deleteFile:          (p)          => ipcRenderer.invoke("fs.deleteFile", p),
  deleteDir:           (p)          => ipcRenderer.invoke("fs.deleteDir", p),
  rename:              (o, n)       => ipcRenderer.invoke("fs.rename", o, n),
  move:                (s, d)       => ipcRenderer.invoke("fs.move", s, d),
  copy:                (s, d)       => ipcRenderer.invoke("fs.copy", s, d),
  copyDir:             (s, d)       => ipcRenderer.invoke("fs.copyDir", s, d),
  openPath:            (p)          => ipcRenderer.invoke("fs.openPath", p),
  revealInFileManager: (p)          => ipcRenderer.invoke("fs.revealInFolder", p),
  showOpenDialog:      ()           => ipcRenderer.invoke("fs.showOpenDialog"),
  showOpenFileDialog:  (f)          => ipcRenderer.invoke("fs.showOpenFileDialog", f),
  showSaveDialog:      (n)          => ipcRenderer.invoke("fs.showSaveDialog", n),
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

// ── expose ─────────────────────────────────────────────────────────────────────

const api: ElectronAPI = {
  terminal,
  queues,
  window:  window_,
  power,
  popup,
  filesystem,
  env,
  snippets,
};

contextBridge.exposeInMainWorld("electron", api);
