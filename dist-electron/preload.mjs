let electron = require("electron");
//#region src/electron/preload.mts
electron.contextBridge.exposeInMainWorld("electron", {
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
		showOpenDialog: () => electron.ipcRenderer.invoke("fs.showOpenDialog")
	},
	env: { getApiKey: () => electron.ipcRenderer.invoke("env.getApiKey") },
	snippets: {
		get: () => electron.ipcRenderer.invoke("snippets.get"),
		save: (data) => electron.ipcRenderer.invoke("snippets.save", data)
	}
});
//#endregion
