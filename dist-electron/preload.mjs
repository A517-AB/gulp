let electron = require("electron");
//#region src/electron/ipc/bridge.ts
function onStream(itemChannel, doneChannel, onItem, onDone) {
	const itemHandler = (_, item) => onItem(item);
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
electron.contextBridge.exposeInMainWorld("electron", {
	terminal: {
		start: (cwd, shellType) => electron.ipcRenderer.send("terminal.start", {
			cwd,
			shellType
		}),
		input: (data) => electron.ipcRenderer.send("terminal.input", data),
		resize: (cols, rows) => electron.ipcRenderer.send("terminal.resize", {
			cols,
			rows
		}),
		kill: () => electron.ipcRenderer.send("terminal.kill"),
		onOutput: (callback) => {
			const handler = (_event, data) => callback(data);
			electron.ipcRenderer.on("terminal.output", handler);
			return () => electron.ipcRenderer.off("terminal.output", handler);
		},
		onExit: (callback) => {
			const handler = (_event, { exitCode, signal }) => callback(exitCode, signal);
			electron.ipcRenderer.on("terminal.exit", handler);
			return () => electron.ipcRenderer.off("terminal.exit", handler);
		}
	},
	queues: {
		getTasks: (jsonPath) => electron.ipcRenderer.invoke("queues.getTasks", jsonPath),
		getQueue: (jsonPath) => electron.ipcRenderer.invoke("queues.getQueue", jsonPath),
		saveTasks: (data, jsonPath) => electron.ipcRenderer.invoke("queues.saveTasks", data, jsonPath)
	},
	window: {
		minimize: () => electron.ipcRenderer.send("window.minimize"),
		maximize: () => electron.ipcRenderer.send("window.maximize"),
		close: () => electron.ipcRenderer.send("window.close")
	},
	power: {
		onSuspend: (cb) => {
			const handler = () => cb();
			electron.ipcRenderer.on("power.suspend", handler);
			return () => electron.ipcRenderer.off("power.suspend", handler);
		},
		onResume: (cb) => {
			const handler = () => cb();
			electron.ipcRenderer.on("power.resume", handler);
			return () => electron.ipcRenderer.off("power.resume", handler);
		}
	},
	popup: {
		show: () => electron.ipcRenderer.send("popup.show"),
		hide: () => electron.ipcRenderer.send("popup.hide"),
		close: () => electron.ipcRenderer.send("popup.hide"),
		notify: (payload) => electron.ipcRenderer.send("popup.notify", payload),
		onNotification: (cb) => {
			const handler = (_event, data) => cb(data);
			electron.ipcRenderer.on("popup.notification", handler);
			return () => electron.ipcRenderer.off("popup.notification", handler);
		}
	},
	filesystem: {
		readdir: (dir) => electron.ipcRenderer.invoke("fs.readdir", dir),
		readFile: (filePath) => electron.ipcRenderer.invoke("fs.readFile", filePath),
		showOpenDialog: () => electron.ipcRenderer.invoke("fs.showOpenDialog")
	},
	env: { getApiKey: () => electron.ipcRenderer.invoke("env.getApiKey") },
	sdkIpc: {
		client: {
			sessions: (options) => electron.ipcRenderer.invoke("sdk:client.sessions", options),
			streamSessions: (onItem, onDone, options) => {
				electron.ipcRenderer.invoke("sdk:client.sessions.stream.start", options).catch(console.error);
				return onStream("sdk:client.sessions.item", "sdk:client.sessions.done", onItem, onDone);
			},
			sync: (options) => electron.ipcRenderer.invoke("sdk:client.sync", options),
			onSyncProgress: (cb) => {
				const handler = (_, p) => cb(p);
				electron.ipcRenderer.on("sdk:client.sync.progress", handler);
				return () => electron.ipcRenderer.removeListener("sdk:client.sync.progress", handler);
			},
			select: (query) => electron.ipcRenderer.invoke("sdk:client.select", query),
			getSessionResource: (id) => electron.ipcRenderer.invoke("sdk:client.getSessionResource", id),
			run: (config) => electron.ipcRenderer.invoke("sdk:client.run", config),
			with: (options) => electron.ipcRenderer.invoke("sdk:client.with", options)
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
		artifact: { save: (data, filepath) => electron.ipcRenderer.invoke("sdk:artifact.save", data, filepath) }
	}
});
//#endregion
