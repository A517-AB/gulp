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

// ── history ────────────────────────────────────────────────────────────────────

const history: ElectronAPI["history"] = {
  get:    () => ipcRenderer.invoke("history.get"),
  push:   (text) => ipcRenderer.invoke("history.push", text),
  remove: (id) => ipcRenderer.invoke("history.remove", id),
}

// ── aliases ────────────────────────────────────────────────────────────────────

const aliases: ElectronAPI["aliases"] = {
  get:  () => ipcRenderer.invoke("aliases.get"),
  save: (data) => ipcRenderer.invoke("aliases.save", data),
  onChanged: (cb) => {
    const handler = (_event: IpcRendererEvent, data: Parameters<typeof cb>[0]) => cb(data)
    ipcRenderer.on("aliases.changed", handler)
    return () => { ipcRenderer.off("aliases.changed", handler) }
  },
}

// ── notes ──────────────────────────────────────────────────────────────────────

const notes: ElectronAPI["notes"] = {
  list:   () => ipcRenderer.invoke("notes.list"),
  get:    (id) => ipcRenderer.invoke("notes.get", id),
  save:   (id, title, blocks) => ipcRenderer.invoke("notes.save", id, title, blocks),
  delete: (id) => ipcRenderer.invoke("notes.delete", id),
  onChanged: (cb) => {
    const handler = () => cb()
    ipcRenderer.on("notes.changed", handler)
    return () => { ipcRenderer.off("notes.changed", handler) }
  },
}

// ── alarms ─────────────────────────────────────────────────────────────────────

const alarms: ElectronAPI["alarms"] = {
  list:    () => ipcRenderer.invoke("alarms.list"),
  save:    (alarm) => ipcRenderer.invoke("alarms.save", alarm),
  delete:  (id) => ipcRenderer.invoke("alarms.delete", id),
  toggle:  (id, enabled) => ipcRenderer.invoke("alarms.toggle", id, enabled),
  snooze:  (id, minutes) => ipcRenderer.invoke("alarms.snooze", id, minutes),
  onChanged: (cb) => {
    const handler = () => cb()
    ipcRenderer.on("alarms.changed", handler)
    return () => { ipcRenderer.off("alarms.changed", handler) }
  },
}

// ── notifications ──────────────────────────────────────────────────────────────

const notifications: ElectronAPI["notifications"] = {
  send: (n) => ipcRenderer.send("notification.send", n),
  onReceived: (cb) => {
    const handler = (_event: IpcRendererEvent, data: Parameters<typeof cb>[0]) => cb(data)
    ipcRenderer.on("notification.received", handler)
    return () => { ipcRenderer.off("notification.received", handler) }
  },
}

// ── snippets ───────────────────────────────────────────────────────────────────

const snippets: ElectronAPI["snippets"] = {
  get:       () => ipcRenderer.invoke("snippets.get"),
  save:      (data) => ipcRenderer.invoke("snippets.save", data),
  onChanged: (cb) => {
    const handler = (_event: IpcRendererEvent, data: { event: string; path: string }) => cb(data)
    ipcRenderer.on("snippets.changed", handler)
    return () => { ipcRenderer.off("snippets.changed", handler) }
  },
};

// ── jules local ────────────────────────────────────────────────────────────────

const julesLocal: ElectronAPI["sdkIpc"] = {
  setApiKey: (apiKey) => ipcRenderer.invoke("jules.apiKey.set", apiKey),
  createSession: (request) => ipcRenderer.invoke("jules.session.create", request),
  resumeSession: (sessionId) => ipcRenderer.invoke("jules.session.resume", sessionId),
  getSession: (sessionId) => ipcRenderer.invoke("jules.session.get", sessionId),
  hydrateSession: (sessionId) => ipcRenderer.invoke("jules.session.hydrate", sessionId),
  getHistory: (sessionId) => ipcRenderer.invoke("jules.session.history", sessionId),
  listSources: () => ipcRenderer.invoke("jules.sources.list"),
  getSource: (github) => ipcRenderer.invoke("jules.sources.get", github),
  getResult: (sessionId) => ipcRenderer.invoke("jules.session.result", sessionId),
  getSnapshot: (sessionId) => ipcRenderer.invoke("jules.session.snapshot", sessionId),
  dispatchFleetIssueFix: (request) => ipcRenderer.invoke("jules.fleet.issueFix", request),
  approve: (sessionId) => ipcRenderer.invoke("jules.session.approve", sessionId),
  sendMessage: (sessionId, prompt) => ipcRenderer.invoke("jules.session.send", sessionId, prompt),
  ask: (sessionId, prompt) => ipcRenderer.invoke("jules.session.ask", sessionId, prompt),
  getGeneratedFiles: (sessionId, filter) => ipcRenderer.invoke("jules.session.files", sessionId, filter),
  getMarkdownFiles: (sessionId) => ipcRenderer.invoke("jules.session.files.markdown", sessionId),
  startStream: (sessionId) => ipcRenderer.invoke("jules.stream.start", sessionId),
  stopStream: (sessionId) => ipcRenderer.invoke("jules.stream.stop", sessionId),
  onActivity: (cb) => {
    const handler = (_event: IpcRendererEvent, data: Parameters<typeof cb>[0]) => {
      cb(data)
    }
    ipcRenderer.on("jules.stream.activity", handler)
    return () => {
      ipcRenderer.off("jules.stream.activity", handler)
    }
  },
  onStreamState: (cb) => {
    const handler = (_event: IpcRendererEvent, data: Parameters<typeof cb>[0]) => {
      cb(data)
    }
    ipcRenderer.on("jules.stream.state", handler)
    return () => {
      ipcRenderer.off("jules.stream.state", handler)
    }
  },
  applyPatch: (sessionId, opts) => ipcRenderer.invoke("jules.applyPatch", sessionId, opts),
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
  history,
  aliases,
  notes,
  alarms,
  notifications,
  snippets,
  sdkIpc: julesLocal,
};

contextBridge.exposeInMainWorld("electron", api);
