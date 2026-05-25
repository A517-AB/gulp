import { BrowserWindow, Menu, Tray, app, dialog, globalShortcut, ipcMain, nativeImage, powerMonitor } from "electron";
import * as path$1 from "path";
import * as fs$2 from "fs";
import { fileURLToPath } from "url";
import * as pty from "node-pty";
import * as os from "os";
import * as fs$1 from "fs/promises";
import { jules } from "@google/jules-sdk";
import * as fs from "node:fs";
import * as path from "node:path";
//#region src/electron/Terminal.ts
var active = null;
function send$1(wc, channel, payload) {
	if (wc.isDestroyed()) return;
	wc.send(channel, payload);
}
function kill() {
	if (!active) return;
	active.dispData.dispose();
	active.dispExit.dispose();
	try {
		active.process.kill();
	} catch {}
	active = null;
}
function registerTerminalHandlers(getWebContents) {
	ipcMain.on("terminal.start", (_event, { cwd, shellType }) => {
		kill();
		const wc = getWebContents();
		if (!wc) return;
		const shell = resolveShell(shellType);
		const workingDir = resolveDir(cwd);
		console.log(`[terminal] starting ${shell.exe} in ${workingDir}`);
		try {
			const proc = pty.spawn(shell.exe, shell.args, {
				name: "xterm-256color",
				cols: 80,
				rows: 30,
				cwd: workingDir,
				env: process.env,
				useConpty: true
			});
			active = {
				process: proc,
				dispData: proc.onData((data) => {
					send$1(wc, "terminal.output", data);
				}),
				dispExit: proc.onExit(({ exitCode, signal }) => {
					send$1(wc, "terminal.exit", {
						exitCode,
						signal
					});
					active = null;
				})
			};
		} catch (err) {
			const msg = err instanceof Error ? err.message : String(err);
			console.error(`[terminal] spawn failed: ${msg}`);
			send$1(wc, "terminal.output", `\r\n\x1b[31m[terminal] failed to start ${shellType ?? "pwsh"}: ${msg}\x1b[0m\r\n`);
		}
	});
	ipcMain.on("terminal.input", (_event, data) => {
		active?.process.write(data);
	});
	ipcMain.on("terminal.resize", (_event, { cols, rows }) => {
		if (!active) return;
		try {
			active.process.resize(cols, rows);
		} catch (err) {
			console.error("[terminal] resize failed:", err);
		}
	});
	ipcMain.on("terminal.kill", () => {
		kill();
	});
}
function resolveShell(shellType) {
	if (process.platform !== "win32") return {
		exe: process.env.SHELL ?? "bash",
		args: []
	};
	switch (shellType) {
		case "powershell": return {
			exe: "powershell.exe",
			args: []
		};
		case "git-bash": return {
			exe: "C:\\Program Files\\Git\\bin\\bash.exe",
			args: ["-l", "-i"]
		};
		case "wsl": return {
			exe: "wsl.exe",
			args: []
		};
		case "python": return {
			exe: "python.exe",
			args: []
		};
		case "ipython": return {
			exe: "ipython.exe",
			args: []
		};
		case "node": return {
			exe: "node.exe",
			args: []
		};
		case "deno": return {
			exe: "deno.exe",
			args: ["repl"]
		};
		default: return {
			exe: "pwsh.exe",
			args: []
		};
	}
}
function resolveDir(cwd) {
	if (cwd && fs$2.existsSync(cwd)) return cwd;
	if (cwd) console.log(`[terminal] cwd not found: ${cwd}, falling back to homedir`);
	return os.homedir();
}
//#endregion
//#region src/electron/queues.ts
var BASE_DIR = "D:\\tired";
function ensureFile(filePath, defaultContent = "[]") {
	if (!fs$2.existsSync(filePath)) try {
		fs$2.mkdirSync(path$1.dirname(filePath), { recursive: true });
		fs$2.writeFileSync(filePath, defaultContent, "utf-8");
		console.log(`[queues] created ${filePath}`);
	} catch (err) {
		console.log(`[queues] could not create ${filePath}:`, err);
	}
}
function readJsonArray(filePath) {
	try {
		const raw = fs$2.readFileSync(filePath, "utf-8");
		const parsed = JSON.parse(raw);
		return Array.isArray(parsed) ? parsed : [];
	} catch (err) {
		console.log(`[queues] failed to read ${filePath}:`, err);
		return [];
	}
}
function resolve(filename) {
	const filePath = path$1.join(BASE_DIR, filename);
	ensureFile(filePath);
	return filePath;
}
function registerQueuesHandlers() {
	ipcMain.handle("queues.getTasks", (_event, _jsonPath) => {
		return readJsonArray(resolve("tasks.json"));
	});
	ipcMain.handle("queues.getQueue", (_event, _jsonPath) => {
		return readJsonArray(resolve("ipc-queue.json"));
	});
	ipcMain.handle("queues.saveTasks", (_event, data) => {
		const filePath = resolve("tasks.json");
		try {
			fs$2.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf-8");
			return true;
		} catch (err) {
			console.log(`[queues] failed to save ${filePath}:`, err);
			return false;
		}
	});
}
//#endregion
//#region src/electron/filesystem.ts
function registerFilesystemHandlers() {
	ipcMain.handle("fs.readdir", async (_e, dir) => {
		return (await fs$1.readdir(dir, { withFileTypes: true })).map((e) => ({
			name: e.name,
			isDir: e.isDirectory()
		})).filter((e) => !e.name.startsWith(".")).sort((a, b) => {
			if (a.isDir !== b.isDir) return a.isDir ? -1 : 1;
			return a.name.localeCompare(b.name);
		});
	});
	ipcMain.handle("fs.readFile", async (_e, filePath) => {
		const stat = await fs$1.stat(filePath);
		if (stat.size > 2 * 1024 * 1024) return `[File too large to preview: ${(stat.size / 1024 / 1024).toFixed(1)} MB]`;
		return fs$1.readFile(filePath, "utf-8");
	});
	ipcMain.handle("fs.showOpenDialog", async () => {
		const result = await dialog.showOpenDialog({
			properties: ["openDirectory"],
			title: "Select working directory"
		});
		return result.canceled ? null : result.filePaths[0] ?? null;
	});
}
//#endregion
//#region src/electron/ipc/handlers.ts
function serialize(data) {
	if (data === void 0 || data === null) return data;
	return JSON.parse(JSON.stringify(data));
}
function send(sender, ch, payload) {
	if (!sender.isDestroyed()) sender.send(ch, serialize(payload));
}
function registerSdkHandlers() {
	ipcMain.handle("sdk:client.sessions", async (_, options) => {
		return serialize(await jules.sessions(options).all());
	});
	ipcMain.handle("sdk:client.sessions.stream.start", async (event, options) => {
		for await (const item of jules.sessions(options)) {
			if (event.sender.isDestroyed()) break;
			send(event.sender, "sdk:client.sessions.item", item);
		}
		send(event.sender, "sdk:client.sessions.done");
	});
	ipcMain.handle("sdk:client.sync", async (event, options) => serialize(await jules.sync({
		...options,
		onProgress: (p) => {
			send(event.sender, "sdk:client.sync.progress", p);
		}
	})));
	ipcMain.handle("sdk:client.select", async (_, query) => serialize(await jules.select(query)));
	ipcMain.handle("sdk:client.getSessionResource", async (_, id) => serialize(await jules.session(id).info()));
	ipcMain.handle("sdk:client.run", async (_, config) => serialize(await jules.run(config)));
	ipcMain.handle("sdk:client.with", async (_, options) => serialize(await jules.with(options)));
	ipcMain.handle("sdk:session.send", async (_, id, prompt) => {
		serialize(await jules.session(id).send(prompt));
	});
	ipcMain.handle("sdk:session.ask", async (_, id, prompt) => serialize(await jules.session(id).ask(prompt)));
	ipcMain.handle("sdk:session.approve", async (_, id) => {
		serialize(await jules.session(id).approve());
	});
	ipcMain.handle("sdk:session.info", async (_, id) => serialize(await jules.session(id).info()));
	ipcMain.handle("sdk:session.result", async (_, id) => serialize(await jules.session(id).result()));
	ipcMain.handle("sdk:session.waitFor", async (_, id, state) => {
		serialize(await jules.session(id).waitFor(state));
	});
	ipcMain.handle("sdk:session.snapshot", async (_, id, options) => serialize(await jules.session(id).snapshot(options)));
	ipcMain.handle("sdk:session.archive", async (_, id) => {
		serialize(await jules.session(id).archive());
	});
	ipcMain.handle("sdk:session.unarchive", async (_, id) => {
		serialize(await jules.session(id).unarchive());
	});
	ipcMain.handle("sdk:session.select", async (_, id, options) => serialize(await jules.session(id).select(options)));
	ipcMain.handle("sdk:session.hydrate", async (_, id) => serialize(await jules.session(id).activities.hydrate()));
	ipcMain.handle("sdk:session.stream.start", async (event, id, options) => {
		for await (const item of jules.session(id).stream(options)) {
			if (event.sender.isDestroyed()) break;
			send(event.sender, `sdk:session.stream:${id}`, item);
		}
		send(event.sender, `sdk:session.stream.done:${id}`);
	});
	ipcMain.handle("sdk:session.history.start", async (event, id) => {
		for await (const item of jules.session(id).history()) {
			if (event.sender.isDestroyed()) break;
			send(event.sender, `sdk:session.history:${id}`, item);
		}
		send(event.sender, `sdk:session.history.done:${id}`);
	});
	ipcMain.handle("sdk:session.updates.start", async (event, id) => {
		for await (const item of jules.session(id).updates()) {
			if (event.sender.isDestroyed()) break;
			send(event.sender, `sdk:session.updates:${id}`, item);
		}
		send(event.sender, `sdk:session.updates.done:${id}`);
	});
	ipcMain.handle("sdk:activities.hydrate", async (_, id) => serialize(await jules.session(id).activities.hydrate()));
	ipcMain.handle("sdk:activities.select", async (_, id, options) => serialize(await jules.session(id).activities.select(options)));
	ipcMain.handle("sdk:activities.list", async (_, id, options) => serialize(await jules.session(id).activities.list(options)));
	ipcMain.handle("sdk:activities.get", async (_, id, activityId) => serialize(await jules.session(id).activities.get(activityId)));
	ipcMain.handle("sdk:activities.history.start", async (event, id) => {
		for await (const item of jules.session(id).activities.history()) {
			if (event.sender.isDestroyed()) break;
			send(event.sender, `sdk:activities.history:${id}`, item);
		}
		send(event.sender, `sdk:activities.history.done:${id}`);
	});
	ipcMain.handle("sdk:activities.updates.start", async (event, id) => {
		for await (const item of jules.session(id).activities.updates()) {
			if (event.sender.isDestroyed()) break;
			send(event.sender, `sdk:activities.updates:${id}`, item);
		}
		send(event.sender, `sdk:activities.updates.done:${id}`);
	});
	ipcMain.handle("sdk:activities.stream.start", async (event, id) => {
		for await (const item of jules.session(id).activities.stream()) {
			if (event.sender.isDestroyed()) break;
			send(event.sender, `sdk:activities.stream:${id}`, item);
		}
		send(event.sender, `sdk:activities.stream.done:${id}`);
	});
	ipcMain.handle("sdk:sources.get", async (_, filter) => serialize(await jules.sources.get(filter)));
	ipcMain.handle("sdk:artifact.save", async (_, data, filepath) => {
		const resolved = path.resolve(filepath);
		await fs.promises.mkdir(path.dirname(resolved), { recursive: true });
		await fs.promises.writeFile(resolved, Buffer.from(data, "base64"));
		return resolved;
	});
}
//#endregion
//#region src/electron/main.mts
var __filename = fileURLToPath(import.meta.url);
var __dirname = path$1.dirname(__filename);
var isDev = process.env.NODE_ENV === "development";
var DEV_URL = process.env.VITE_DEV_SERVER_URL ?? "http://127.0.0.1:5173";
console.log("[main] starting, isDev:", isDev);
console.log("[main] __dirname:", __dirname);
console.log("[main] JULES_API_KEY:", process.env.JULES_API_KEY ? "SET ✓" : "NOT SET ✗");
var mainWindow = null;
var tray = null;
var forceQuit = false;
function buildTrayIcon() {
	const size = 16;
	const buf = Buffer.alloc(size * size * 4, 0);
	for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
		const dx = x - size / 2 + .5;
		const dy = y - size / 2 + .5;
		const idx = (y * size + x) * 4;
		if (Math.sqrt(dx * dx + dy * dy) <= size / 2 - 1) {
			buf[idx] = 139;
			buf[idx + 1] = 92;
			buf[idx + 2] = 246;
			buf[idx + 3] = 255;
		}
	}
	return nativeImage.createFromBuffer(buf, {
		width: size,
		height: size
	});
}
function createWindow() {
	const preloadPath = path$1.join(__dirname, "preload.mjs");
	console.log("[main] preload path:", preloadPath, "exists:", fs$2.existsSync(preloadPath));
	mainWindow = new BrowserWindow({
		width: 1200,
		height: 800,
		titleBarStyle: "hidden",
		webPreferences: {
			preload: preloadPath,
			contextIsolation: true,
			nodeIntegration: false
		}
	});
	if (isDev) {
		console.log("[main] loading dev URL:", DEV_URL);
		mainWindow.loadURL(DEV_URL);
	} else {
		const prodFile = path$1.join(__dirname, "../dist/index.html");
		console.log("[main] loading prod file:", prodFile);
		mainWindow.loadFile(prodFile);
	}
	mainWindow.webContents.on("did-finish-load", () => {
		console.log("[main] renderer loaded ok");
	});
	mainWindow.webContents.on("did-fail-load", (_e, code, desc, url) => {
		console.error("[main] renderer failed to load:", url, code, desc);
		if (isDev) {
			console.log("[main] retrying in 1s — is 'npm run dev' running?");
			setTimeout(() => mainWindow?.loadURL(DEV_URL), 1e3);
		}
	});
	mainWindow.on("close", (e) => {
		if (!forceQuit) {
			e.preventDefault();
			mainWindow?.hide();
		}
	});
	mainWindow.on("closed", () => {
		mainWindow = null;
	});
}
ipcMain.on("window.minimize", () => {
	mainWindow?.minimize();
});
ipcMain.on("window.maximize", () => {
	if (mainWindow?.isMaximized()) mainWindow.unmaximize();
	else mainWindow?.maximize();
});
ipcMain.on("window.close", () => {
	mainWindow?.close();
});
app.whenReady().then(() => {
	console.log("[main] app ready");
	registerSdkHandlers();
	registerTerminalHandlers(() => mainWindow?.webContents ?? null);
	registerQueuesHandlers();
	registerFilesystemHandlers();
	createWindow();
	tray = new Tray(buildTrayIcon());
	tray.setToolTip("Last");
	tray.setContextMenu(Menu.buildFromTemplate([
		{
			label: "Show",
			click: () => {
				mainWindow?.show();
				mainWindow?.focus();
			}
		},
		{ type: "separator" },
		{
			label: "Quit",
			click: () => {
				forceQuit = true;
				app.quit();
			}
		}
	]));
	tray.on("click", () => {
		if (mainWindow?.isVisible()) mainWindow.hide();
		else {
			mainWindow?.show();
			mainWindow?.focus();
		}
	});
	globalShortcut.register("Ctrl+Shift+Space", () => {
		if (mainWindow?.isVisible() && mainWindow?.isFocused()) mainWindow.hide();
		else {
			mainWindow?.show();
			mainWindow?.focus();
		}
	});
	powerMonitor.on("suspend", () => mainWindow?.webContents.send("power.suspend"));
	powerMonitor.on("resume", () => mainWindow?.webContents.send("power.resume"));
	powerMonitor.on("lock-screen", () => mainWindow?.webContents.send("power.suspend"));
	powerMonitor.on("unlock-screen", () => mainWindow?.webContents.send("power.resume"));
	app.on("activate", () => {
		if (BrowserWindow.getAllWindows().length === 0) createWindow();
	});
});
app.on("will-quit", () => {
	globalShortcut.unregisterAll();
});
app.on("window-all-closed", () => {});
ipcMain.handle("env.getApiKey", () => {
	const apiKey = process.env.JULES_API_KEY || null;
	console.log("[main] env.getApiKey called, returning:", apiKey ? "API Key SET" : "API Key NOT SET");
	return apiKey;
});
//#endregion
