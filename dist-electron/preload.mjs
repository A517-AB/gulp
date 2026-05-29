let electron = require("electron");
//#region src/electron/jules/repoless/sdk.ts
var repolessSdk = {
	pickDir: () => electron.ipcRenderer.invoke("sdk:repoless.pickDir"),
	start: (prompt, repoPath) => electron.ipcRenderer.invoke("sdk:repoless.start", prompt, repoPath),
	apply: (id, repoPath, branchName) => electron.ipcRenderer.invoke("sdk:repoless.apply", id, repoPath, branchName),
	run: (prompt, repoPath, onProgress) => {
		const runId = `run-${String(Date.now())}-${Math.random().toString(36).slice(2)}`;
		const ch = `sdk:repoless.run.progress:${runId}`;
		if (onProgress) {
			const handler = (_, activity) => {
				onProgress(activity);
			};
			electron.ipcRenderer.on(ch, handler);
			return electron.ipcRenderer.invoke("sdk:repoless.run", prompt, repoPath, runId).finally(() => electron.ipcRenderer.removeListener(ch, handler));
		}
		return electron.ipcRenderer.invoke("sdk:repoless.run", prompt, repoPath, runId);
	}
};
//#endregion
//#region src/electron/jules/sdk.ts
function onStream(itemChannel, doneChannel, onItem, onDone) {
	const itemHandler = (_, item) => {
		onItem(item);
	};
	const doneHandler = () => {
		electron.ipcRenderer.removeListener(itemChannel, itemHandler);
		onDone?.();
	};
	electron.ipcRenderer.on(itemChannel, itemHandler);
	electron.ipcRenderer.once(doneChannel, doneHandler);
	return () => {
		electron.ipcRenderer.removeListener(itemChannel, itemHandler);
		electron.ipcRenderer.removeListener(doneChannel, doneHandler);
	};
}
//#endregion
//#region src/electron/preload.mts
var api = {
	terminal: {
		start: (cwd, shellType) => {
			electron.ipcRenderer.send("terminal.start", {
				cwd,
				shellType
			});
		},
		input: (data) => {
			electron.ipcRenderer.send("terminal.input", data);
		},
		resize: (cols, rows) => {
			electron.ipcRenderer.send("terminal.resize", {
				cols,
				rows
			});
		},
		kill: () => {
			electron.ipcRenderer.send("terminal.kill");
		},
		onOutput: (callback) => {
			const handler = (_event, data) => {
				callback(data);
			};
			electron.ipcRenderer.on("terminal.output", handler);
			return () => {
				electron.ipcRenderer.off("terminal.output", handler);
			};
		},
		onExit: (callback) => {
			const handler = (_event, { exitCode, signal }) => {
				callback(exitCode, signal);
			};
			electron.ipcRenderer.on("terminal.exit", handler);
			return () => {
				electron.ipcRenderer.off("terminal.exit", handler);
			};
		}
	},
	queues: {
		getTasks: (jsonPath) => electron.ipcRenderer.invoke("queues.getTasks", jsonPath),
		getQueue: (jsonPath) => electron.ipcRenderer.invoke("queues.getQueue", jsonPath),
		saveTasks: (data, jsonPath) => electron.ipcRenderer.invoke("queues.saveTasks", data, jsonPath)
	},
	window: {
		minimize: () => {
			electron.ipcRenderer.send("window.minimize");
		},
		maximize: () => {
			electron.ipcRenderer.send("window.maximize");
		},
		close: () => {
			electron.ipcRenderer.send("window.close");
		}
	},
	power: {
		onSuspend: (cb) => {
			const handler = () => {
				cb();
			};
			electron.ipcRenderer.on("power.suspend", handler);
			return () => {
				electron.ipcRenderer.off("power.suspend", handler);
			};
		},
		onResume: (cb) => {
			const handler = () => {
				cb();
			};
			electron.ipcRenderer.on("power.resume", handler);
			return () => {
				electron.ipcRenderer.off("power.resume", handler);
			};
		}
	},
	lowPower: {
		enter: () => {
			electron.ipcRenderer.send("lowPower.manualEnter");
		},
		exit: () => {
			electron.ipcRenderer.send("lowPower.manualExit");
		},
		toggleAlwaysOnTop: () => {
			electron.ipcRenderer.send("lowPower.toggleAlwaysOnTop");
		},
		onEnter: (cb) => {
			const handler = () => {
				cb();
			};
			electron.ipcRenderer.on("lowPower.enter", handler);
			return () => {
				electron.ipcRenderer.off("lowPower.enter", handler);
			};
		},
		onExit: (cb) => {
			const handler = () => {
				cb();
			};
			electron.ipcRenderer.on("lowPower.exit", handler);
			return () => {
				electron.ipcRenderer.off("lowPower.exit", handler);
			};
		},
		onAlwaysOnTop: (cb) => {
			const handler = (_event, val) => {
				cb(val);
			};
			electron.ipcRenderer.on("lowPower.alwaysOnTop", handler);
			return () => {
				electron.ipcRenderer.off("lowPower.alwaysOnTop", handler);
			};
		}
	},
	popup: {
		show: () => {
			electron.ipcRenderer.send("popup.show");
		},
		hide: () => {
			electron.ipcRenderer.send("popup.hide");
		},
		close: () => {
			electron.ipcRenderer.send("popup.hide");
		},
		notify: (payload) => {
			electron.ipcRenderer.send("popup.notify", payload);
		},
		onNotification: (cb) => {
			const handler = (_event, data) => {
				cb(data);
			};
			electron.ipcRenderer.on("popup.notification", handler);
			return () => {
				electron.ipcRenderer.off("popup.notification", handler);
			};
		}
	},
	filesystem: {
		readdir: (dir) => electron.ipcRenderer.invoke("fs.readdir", dir),
		readFile: (filePath) => electron.ipcRenderer.invoke("fs.readFile", filePath),
		writeFile: (filePath, content) => electron.ipcRenderer.invoke("fs.writeFile", filePath, content),
		exists: (filePath) => electron.ipcRenderer.invoke("fs.exists", filePath),
		showOpenDialog: () => electron.ipcRenderer.invoke("fs.showOpenDialog")
	},
	env: { getApiKey: () => electron.ipcRenderer.invoke("env.getApiKey") },
	snippets: {
		get: () => electron.ipcRenderer.invoke("snippets.get"),
		save: (data) => electron.ipcRenderer.invoke("snippets.save", data)
	},
	sdkIpc: {
		client: {
			sessions: (options) => electron.ipcRenderer.invoke("sdk:client.sessions", options),
			streamSessions: (onItem, onDone, options) => {
				electron.ipcRenderer.invoke("sdk:client.sessions.stream.start", options).catch(console.error);
				return onStream("sdk:client.sessions.item", "sdk:client.sessions.done", onItem, onDone);
			},
			sync: (options) => electron.ipcRenderer.invoke("sdk:client.sync", options),
			onSyncProgress: (cb) => {
				const handler = (_, p) => {
					cb(p);
				};
				electron.ipcRenderer.on("sdk:client.sync.progress", handler);
				return () => electron.ipcRenderer.removeListener("sdk:client.sync.progress", handler);
			},
			select: (query) => electron.ipcRenderer.invoke("sdk:client.select", query),
			getSessionResource: (id) => electron.ipcRenderer.invoke("sdk:client.getSessionResource", id),
			run: (config) => electron.ipcRenderer.invoke("sdk:client.run", config),
			with: (options) => electron.ipcRenderer.invoke("sdk:client.with", options),
			all: (configs, options) => electron.ipcRenderer.invoke("sdk:client.all", configs, options)
		},
		source: { resolve: (repoPath) => electron.ipcRenderer.invoke("sdk:source.resolve", repoPath) },
		watcher: {
			start: (dir, onSession) => {
				return electron.ipcRenderer.invoke("sdk:watcher.start", dir).then((watcherId) => {
					electron.ipcRenderer.on(`sdk:watcher.session:${watcherId}`, (_, payload) => {
						onSession(payload);
					});
					return watcherId;
				});
			},
			stop: (watcherId) => {
				electron.ipcRenderer.removeAllListeners(`sdk:watcher.session:${watcherId}`);
				return electron.ipcRenderer.invoke("sdk:watcher.stop", watcherId);
			}
		},
		session: {
			send: (id, prompt) => electron.ipcRenderer.invoke("sdk:session.send", id, prompt),
			ask: (id, prompt) => electron.ipcRenderer.invoke("sdk:session.ask", id, prompt),
			approve: (id) => electron.ipcRenderer.invoke("sdk:session.approve", id),
			info: (id) => electron.ipcRenderer.invoke("sdk:session.info", id),
			result: (id) => electron.ipcRenderer.invoke("sdk:session.result", id),
			waitFor: (id, state) => electron.ipcRenderer.invoke("sdk:session.waitFor", id, state),
			snapshot: (id, options) => electron.ipcRenderer.invoke("sdk:session.snapshot", id, options),
			archive: (id) => electron.ipcRenderer.invoke("sdk:session.archive", id),
			unarchive: (id) => electron.ipcRenderer.invoke("sdk:session.unarchive", id),
			select: (id, options) => electron.ipcRenderer.invoke("sdk:session.select", id, options),
			hydrate: (id) => electron.ipcRenderer.invoke("sdk:session.hydrate", id),
			stream: (id, onItem, onDone, options) => {
				electron.ipcRenderer.invoke("sdk:session.stream.start", id, options).catch(console.error);
				return onStream(`sdk:session.stream:${id}`, `sdk:session.stream.done:${id}`, onItem, onDone);
			},
			history: (id, onItem, onDone) => {
				electron.ipcRenderer.invoke("sdk:session.history.start", id).catch(console.error);
				return onStream(`sdk:session.history:${id}`, `sdk:session.history.done:${id}`, onItem, onDone);
			},
			updates: (id, onItem, onDone) => {
				electron.ipcRenderer.invoke("sdk:session.updates.start", id).catch(console.error);
				return onStream(`sdk:session.updates:${id}`, `sdk:session.updates.done:${id}`, onItem, onDone);
			}
		},
		activities: {
			hydrate: (id) => electron.ipcRenderer.invoke("sdk:activities.hydrate", id),
			select: (id, options) => electron.ipcRenderer.invoke("sdk:activities.select", id, options),
			list: (id, options) => electron.ipcRenderer.invoke("sdk:activities.list", id, options),
			get: (id, activityId) => electron.ipcRenderer.invoke("sdk:activities.get", id, activityId),
			history: (id, onItem, onDone) => {
				electron.ipcRenderer.invoke("sdk:activities.history.start", id).catch(console.error);
				return onStream(`sdk:activities.history:${id}`, `sdk:activities.history.done:${id}`, onItem, onDone);
			},
			updates: (id, onItem, onDone) => {
				electron.ipcRenderer.invoke("sdk:activities.updates.start", id).catch(console.error);
				return onStream(`sdk:activities.updates:${id}`, `sdk:activities.updates.done:${id}`, onItem, onDone);
			},
			stream: (id, onItem, onDone) => {
				electron.ipcRenderer.invoke("sdk:activities.stream.start", id).catch(console.error);
				return onStream(`sdk:activities.stream:${id}`, `sdk:activities.stream.done:${id}`, onItem, onDone);
			}
		},
		sources: { get: (filter) => electron.ipcRenderer.invoke("sdk:sources.get", filter) },
		artifact: { save: (data, filepath) => electron.ipcRenderer.invoke("sdk:artifact.save", data, filepath) },
		repoless: repolessSdk
	},
	git: {
		run: (cwd, args) => electron.ipcRenderer.invoke("git.run", cwd, args),
		status: (cwd) => electron.ipcRenderer.invoke("git.status", cwd),
		log: (cwd, limit, branch) => electron.ipcRenderer.invoke("git.log", cwd, limit, branch),
		diff: (cwd, args) => electron.ipcRenderer.invoke("git.diff", cwd, args),
		show: (cwd, ref) => electron.ipcRenderer.invoke("git.show", cwd, ref),
		remote: (cwd) => electron.ipcRenderer.invoke("git.remote", cwd),
		branches: (cwd) => electron.ipcRenderer.invoke("git.branches", cwd),
		currentBranch: (cwd) => electron.ipcRenderer.invoke("git.currentBranch", cwd),
		tags: (cwd) => electron.ipcRenderer.invoke("git.tags", cwd),
		add: (cwd, files) => electron.ipcRenderer.invoke("git.add", cwd, files),
		unstage: (cwd, files) => electron.ipcRenderer.invoke("git.unstage", cwd, files),
		commit: (cwd, message, allowEmpty) => electron.ipcRenderer.invoke("git.commit", cwd, message, allowEmpty),
		amend: (cwd, message) => electron.ipcRenderer.invoke("git.amend", cwd, message),
		push: (cwd, remote, branch, force) => electron.ipcRenderer.invoke("git.push", cwd, remote, branch, force),
		pull: (cwd, remote, branch, rebase) => electron.ipcRenderer.invoke("git.pull", cwd, remote, branch, rebase),
		fetch: (cwd, remote, prune) => electron.ipcRenderer.invoke("git.fetch", cwd, remote, prune),
		checkout: (cwd, branch, create) => electron.ipcRenderer.invoke("git.checkout", cwd, branch, create),
		deleteBranch: (cwd, branch, force) => electron.ipcRenderer.invoke("git.deleteBranch", cwd, branch, force),
		merge: (cwd, branch, noFF) => electron.ipcRenderer.invoke("git.merge", cwd, branch, noFF),
		rebase: (cwd, onto) => electron.ipcRenderer.invoke("git.rebase", cwd, onto),
		stash: (cwd, action, message) => electron.ipcRenderer.invoke("git.stash", cwd, action, message),
		reset: (cwd, mode, ref) => electron.ipcRenderer.invoke("git.reset", cwd, mode, ref),
		restore: (cwd, files) => electron.ipcRenderer.invoke("git.restore", cwd, files),
		clean: (cwd, force) => electron.ipcRenderer.invoke("git.clean", cwd, force),
		init: (cwd) => electron.ipcRenderer.invoke("git.init", cwd),
		clone: (url, dest, shallow) => electron.ipcRenderer.invoke("git.clone", url, dest, shallow),
		shell: {
			exec: (cwd, command, args) => electron.ipcRenderer.invoke("shell.exec", cwd, command, args),
			runScript: (cwd, scriptPath, args) => electron.ipcRenderer.invoke("shell.runScript", cwd, scriptPath, args),
			runInline: (cwd, lang, code) => electron.ipcRenderer.invoke("shell.runInline", cwd, lang, code)
		}
	},
	repos: {
		list: () => electron.ipcRenderer.invoke("repos.list"),
		register: (repoPath) => electron.ipcRenderer.invoke("repos.register", repoPath),
		forget: (repoPath) => electron.ipcRenderer.invoke("repos.forget", repoPath),
		scan: (rootDir) => electron.ipcRenderer.invoke("repos.scan", rootDir),
		pickAndRegister: () => electron.ipcRenderer.invoke("repos.pickAndRegister")
	}
};
electron.contextBridge.exposeInMainWorld("electron", api);
//#endregion
