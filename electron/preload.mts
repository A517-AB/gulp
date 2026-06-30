import type {IpcRendererEvent} from "electron";
import {contextBridge, ipcRenderer} from "electron";
import type {ElectronAPI, PopupNotification, ShellType} from "../src/shared/electron";
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
  quit: () => {
    ipcRenderer.send("window.quit");
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
// ── notes ──────────────────────────────────────────────────────────────────────

const notes: ElectronAPI["notes"] = {
  list:   () => ipcRenderer.invoke("notes.list"),
  get:    (id) => ipcRenderer.invoke("notes.get", id),
  save:   (id, title, blocks) => ipcRenderer.invoke("notes.save", id, title, blocks),
  delete: (id) => ipcRenderer.invoke("notes.delete", id),
  onChanged: (cb) => {
    const handler = () => { cb(); }
    ipcRenderer.on("notes.changed", handler)
    return () => { ipcRenderer.off("notes.changed", handler) }
  },
}



// ── snippets ───────────────────────────────────────────────────────────────────

const snippets: ElectronAPI["snippets"] = {
    get: () => ipcRenderer.invoke("snippets.get"),
    save: (data) => ipcRenderer.invoke("snippets.save", data),
    onChanged: (cb) => {
    const handler = (_event: IpcRendererEvent, data: { event: string; path: string }) => { cb(data); }
    ipcRenderer.on("snippets.changed", handler)
    return () => { ipcRenderer.off("snippets.changed", handler) }
  },
    readCode: (relPath) => ipcRenderer.invoke("snippets.readCode", relPath),
    writeCode: (relPath, content) => ipcRenderer.invoke("snippets.writeCode", relPath, content),
    deleteCode: (relPath) => ipcRenderer.invoke("snippets.deleteCode", relPath),
};

// ── uiNotification ─────────────────────────────────────────────────────────────

const uiNotification: ElectronAPI["uiNotification"] = {
  show:    (payload) => { ipcRenderer.send("notif.dispatch", payload); },
  destroy: ()        => { ipcRenderer.send("notif.dispatch", null); },
  onAction: (cb) => {
    const handler = (_event: IpcRendererEvent, data: { actionId: string; extraData: unknown }) => {
      cb(data.actionId, data.extraData)
    }
    ipcRenderer.on("notif.clicked", handler)
    return () => { ipcRenderer.off("notif.clicked", handler) }
  },
};

// ── scheduler ─────────────────────────────────────────────────────────────────

const scheduler: ElectronAPI["scheduler"] = {
  list:   ()                   => ipcRenderer.invoke("notif.scheduler.list"),
  add:    (item)               => ipcRenderer.invoke("notif.scheduler.add", item),
  remove: (id)                 => ipcRenderer.invoke("notif.scheduler.remove", id),
  toggle: (id, enabled)        => ipcRenderer.invoke("notif.scheduler.toggle", id, enabled),
  snooze: (id, minutes)        => ipcRenderer.invoke("notif.scheduler.snooze", id, minutes),
  onFired: (cb) => {
    const handler = (_event: IpcRendererEvent, item: Parameters<typeof cb>[0]) => { cb(item) }
    ipcRenderer.on("notif.scheduler.fired", handler)
    return () => { ipcRenderer.off("notif.scheduler.fired", handler) }
  },
}

// ── git ────────────────────────────────────────────────────────────────────────

const git: ElectronAPI["git"] = {
    run: (cwd, args) => ipcRenderer.invoke("git.run", cwd, args),
    status: (cwd) => ipcRenderer.invoke("git.status", cwd),
    add: (cwd, files) => ipcRenderer.invoke("git.add", cwd, files),
    commit: (cwd, msg, allowEmpty) => ipcRenderer.invoke("git.commit", cwd, msg, allowEmpty),
    push: (cwd, remote, branch, force) => ipcRenderer.invoke("git.push", cwd, remote, branch, force),
    pull: (cwd, remote, branch, rebase) => ipcRenderer.invoke("git.pull", cwd, remote, branch, rebase),
    init: (cwd) => ipcRenderer.invoke("git.init", cwd),
}

// ── github ─────────────────────────────────────────────────────────────────────

const github: ElectronAPI["github"] = {
    getUser: () => ipcRenderer.invoke("github.getUser"),
    listRepos: (sort, per_page) => ipcRenderer.invoke("github.listRepos", sort, per_page),
    listBranches: (owner, repo) => ipcRenderer.invoke("github.listBranches", owner, repo),
    deleteBranch: (owner, repo, branch) => ipcRenderer.invoke("github.deleteBranch", owner, repo, branch),
    listPRs: (owner, repo, state) => ipcRenderer.invoke("github.listPRs", owner, repo, state),
    getPR: (owner, repo, number) => ipcRenderer.invoke("github.getPR", owner, repo, number),
    createPR: (owner, repo, data) => ipcRenderer.invoke("github.createPR", owner, repo, data),
    updatePR: (owner, repo, number, data) => ipcRenderer.invoke("github.updatePR", owner, repo, number, data),
    mergePR: (owner, repo, number, method) => ipcRenderer.invoke("github.mergePR", owner, repo, number, method),
    getPRChecks: (owner, repo, ref) => ipcRenderer.invoke("github.getPRChecks", owner, repo, ref),
    listIssues: (owner, repo, state) => ipcRenderer.invoke("github.listIssues", owner, repo, state),
    createIssue: (owner, repo, data) => ipcRenderer.invoke("github.createIssue", owner, repo, data),
    updateIssue: (owner, repo, number, data) => ipcRenderer.invoke("github.updateIssue", owner, repo, number, data),
    addIssueComment: (owner, repo, number, body) => ipcRenderer.invoke("github.addIssueComment", owner, repo, number, body),
}

// ── notifLog ───────────────────────────────────────────────────────────────────

const notifLog: ElectronAPI["notifLog"] = {
  get:         () => ipcRenderer.invoke("notif.log.get"),
  clear:       () => ipcRenderer.invoke("notif.log.clear"),
  markSeen:    (id) => ipcRenderer.invoke("notif.log.markSeen", id),
  markAllSeen: () => ipcRenderer.invoke("notif.log.markAllSeen"),
}

// ── store ──────────────────────────────────────────────────────────────────────

const store: ElectronAPI["store"] = {
  get:    (key)        => ipcRenderer.invoke("store:get", key),
  set:    (key, value) => ipcRenderer.invoke("store:set", key, value),
  delete: (key)        => ipcRenderer.invoke("store:delete", key),
}

const ipc = {
    artifact: {
        save: (data: string, filepath: string) => ipcRenderer.invoke('jules.artifact.save', data, filepath),
    },
    session: {
        applyPatch: (_sessionId: string, options: { cwd: string; patch: string }) =>
            ipcRenderer.invoke('jules.git.applyPatch', options.cwd, options.patch)
                .then((r: { ok: boolean; branch?: string; error?: string }) => ({
                    success: r.ok,
                    ...(r.branch !== undefined ? {branch: r.branch} : {}),
                    ...(r.error !== undefined ? {error: r.error} : {}),
                })),
    },
};

// ── jules ──────────────────────────────────────────────────────────────────────

const jules = {
    git: {
        resolveSource: (cwd: string) => ipcRenderer.invoke('jules.git.resolveSource', cwd),
        applyPatch: (cwd: string, patch: string) => ipcRenderer.invoke('jules.git.applyPatch', cwd, patch),
        parseUnidiff: (patch: string) => ipcRenderer.invoke('jules.git.parseUnidiff', patch),
    },
    github: {
        getPr: (owner: string, repo: string, number: number) => ipcRenderer.invoke('jules.github.getPr', owner, repo, number),
        getChecks: (owner: string, repo: string, ref: string) => ipcRenderer.invoke('jules.github.getChecks', owner, repo, ref),
        mergePr: (owner: string, repo: string, number: number, method?: 'merge' | 'squash' | 'rebase') => ipcRenderer.invoke('jules.github.mergePr', owner, repo, number, method),
        parsePrUrl: (url: string) => ipcRenderer.invoke('jules.github.parsePrUrl', url),
    },
    artifact: {
        save: (data: string, filepath: string) => ipcRenderer.invoke('jules.artifact.save', data, filepath),
    },
}

contextBridge.exposeInMainWorld('jules', jules)

// ── expose ─────────────────────────────────────────────────────────────────────

const api: ElectronAPI = {
  terminal,
  queues,
  window:  window_,
  power,
  popup,
  filesystem,
  env,
  notes,
  snippets,
  uiNotification,
  scheduler,
  notifLog,
  git,
    github,
  store,
  ipc,
};

contextBridge.exposeInMainWorld("electron", api);
