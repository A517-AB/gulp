import type { IpcRendererEvent } from "electron";
import { contextBridge, ipcRenderer } from "electron";
import type { ShellType, PopupNotification, ElectronAPI } from "../types/electron";
import { sdk } from "./ipc/bridge";

// ── terminal ───────────────────────────────────────────────────────────────────

const terminal: ElectronAPI["terminal"] = {
  start: (cwd: string, shellType?: ShellType) =>
    ipcRenderer.send("terminal.start", { cwd, shellType }),

  input: (data: string) =>
    ipcRenderer.send("terminal.input", data),

  resize: (cols: number, rows: number) =>
    ipcRenderer.send("terminal.resize", { cols, rows }),

  kill: () =>
    ipcRenderer.send("terminal.kill"),

  onOutput: (callback: (data: string) => void) => {
    const handler = (_event: IpcRendererEvent, data: string) => callback(data);
    ipcRenderer.on("terminal.output", handler);
    return () => ipcRenderer.off("terminal.output", handler);
  },

  onExit: (callback: (exitCode: number, signal?: number) => void) => {
    const handler = (_event: IpcRendererEvent, { exitCode, signal }: { exitCode: number; signal?: number }) =>
      callback(exitCode, signal);
    ipcRenderer.on("terminal.exit", handler);
    return () => ipcRenderer.off("terminal.exit", handler);
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
  minimize: () => ipcRenderer.send("window.minimize"),
  maximize: () => ipcRenderer.send("window.maximize"),
  close:    () => ipcRenderer.send("window.close"),
};

// ── power ──────────────────────────────────────────────────────────────────────
// TODO: check if this should use Electron 42 power efficiency API instead of IPC

const power: ElectronAPI["power"] = {
  onSuspend: (cb: () => void) => {
    const handler = () => cb();
    ipcRenderer.on("power.suspend", handler);
    return () => ipcRenderer.off("power.suspend", handler);
  },
  onResume: (cb: () => void) => {
    const handler = () => cb();
    ipcRenderer.on("power.resume", handler);
    return () => ipcRenderer.off("power.resume", handler);
  },
};

// ── popup ──────────────────────────────────────────────────────────────────────

const popup: ElectronAPI["popup"] = {
  show:  () => ipcRenderer.send("popup.show"),
  hide:  () => ipcRenderer.send("popup.hide"),
  close: () => ipcRenderer.send("popup.hide"),

  notify: (payload: PopupNotification) =>
    ipcRenderer.send("popup.notify", payload),

  onNotification: (cb: (payload: PopupNotification) => void) => {
    const handler = (_event: IpcRendererEvent, data: PopupNotification) => cb(data);
    ipcRenderer.on("popup.notification", handler);
    return () => ipcRenderer.off("popup.notification", handler);
  },
};

// ── filesystem ─────────────────────────────────────────────────────────────────

const filesystem: ElectronAPI["filesystem"] = {
  readdir:        (dir)      => ipcRenderer.invoke("fs.readdir", dir),
  readFile:       (filePath) => ipcRenderer.invoke("fs.readFile", filePath),
  showOpenDialog: ()         => ipcRenderer.invoke("fs.showOpenDialog"),
};

// ── env ────────────────────────────────────────────────────────────────────────

const env: ElectronAPI["env"] = {
  getApiKey: () => ipcRenderer.invoke("env.getApiKey"),
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
  sdkIpc: sdk,
};

contextBridge.exposeInMainWorld("electron", api);
