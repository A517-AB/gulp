import { BrowserWindow, Menu, Tray, app, dialog, globalShortcut, ipcMain, nativeImage, powerMonitor } from "electron";
import * as path from "path";
import * as fs$1 from "fs";
import { fileURLToPath } from "url";
import * as pty from "node-pty";
import * as os from "os";
import * as fs from "fs/promises";
import { spawn } from "child_process";
//#region src/electron/Terminal.ts
var active = null;
function send(wc, channel, payload) {
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
					send(wc, "terminal.output", data);
				}),
				dispExit: proc.onExit(({ exitCode, signal }) => {
					send(wc, "terminal.exit", {
						exitCode,
						signal
					});
					active = null;
				})
			};
		} catch (err) {
			const msg = err instanceof Error ? err.message : String(err);
			console.error(`[terminal] spawn failed: ${msg}`);
			send(wc, "terminal.output", `\r\n\x1b[31m[terminal] failed to start ${shellType ?? "pwsh"}: ${msg}\x1b[0m\r\n`);
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
	if (cwd && fs$1.existsSync(cwd)) return cwd;
	if (cwd) console.log(`[terminal] cwd not found: ${cwd}, falling back to homedir`);
	return os.homedir();
}
//#endregion
//#region src/electron/queues.ts
var BASE_DIR$1 = "D:\\tired";
function ensureFile$1(filePath, defaultContent = "[]") {
	if (!fs$1.existsSync(filePath)) try {
		fs$1.mkdirSync(path.dirname(filePath), { recursive: true });
		fs$1.writeFileSync(filePath, defaultContent, "utf-8");
		console.log(`[queues] created ${filePath}`);
	} catch (err) {
		console.log(`[queues] could not create ${filePath}:`, err);
	}
}
function readJsonArray(filePath) {
	try {
		const raw = fs$1.readFileSync(filePath, "utf-8");
		const parsed = JSON.parse(raw);
		return Array.isArray(parsed) ? parsed : [];
	} catch (err) {
		console.log(`[queues] failed to read ${filePath}:`, err);
		return [];
	}
}
function resolve$1(filename) {
	const filePath = path.join(BASE_DIR$1, filename);
	ensureFile$1(filePath);
	return filePath;
}
function registerQueuesHandlers() {
	ipcMain.handle("queues.getTasks", (_event, _jsonPath) => {
		return readJsonArray(resolve$1("tasks.json"));
	});
	ipcMain.handle("queues.getQueue", (_event, _jsonPath) => {
		return readJsonArray(resolve$1("ipc-queue.json"));
	});
	ipcMain.handle("queues.saveTasks", (_event, data) => {
		const filePath = resolve$1("tasks.json");
		try {
			fs$1.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf-8");
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
		const entries = await fs.readdir(dir, { withFileTypes: true });
		return (await Promise.all(entries.filter((e) => !e.name.startsWith(".")).map(async (e) => {
			const stat = await fs.stat(path.join(dir, e.name)).catch(() => null);
			return {
				name: e.name,
				isDir: e.isDirectory(),
				ext: path.extname(e.name).toLowerCase(),
				size: stat?.size ?? 0,
				modifiedAt: stat?.mtime.toISOString() ?? ""
			};
		}))).sort((a, b) => {
			if (a.isDir !== b.isDir) return a.isDir ? -1 : 1;
			return a.name.localeCompare(b.name);
		});
	});
	ipcMain.handle("fs.readFile", async (_e, filePath) => {
		const stat = await fs.stat(filePath);
		if (stat.size > 2 * 1024 * 1024) return `[File too large to preview: ${(stat.size / 1024 / 1024).toFixed(1)} MB]`;
		return fs.readFile(filePath, "utf-8");
	});
	ipcMain.handle("fs.exists", async (_e, filePath) => {
		return fs.access(filePath).then(() => true).catch(() => false);
	});
	ipcMain.handle("fs.stat", async (_e, filePath) => {
		const stat = await fs.stat(filePath);
		return {
			size: stat.size,
			isDir: stat.isDirectory(),
			isFile: stat.isFile(),
			createdAt: stat.birthtime.toISOString(),
			modifiedAt: stat.mtime.toISOString()
		};
	});
	ipcMain.handle("fs.writeFile", async (_e, filePath, content) => {
		await fs.mkdir(path.dirname(filePath), { recursive: true });
		await fs.writeFile(filePath, content, "utf-8");
	});
	ipcMain.handle("fs.appendFile", async (_e, filePath, content) => {
		await fs.appendFile(filePath, content, "utf-8");
	});
	ipcMain.handle("fs.mkdir", async (_e, dirPath) => {
		await fs.mkdir(dirPath, { recursive: true });
	});
	ipcMain.handle("fs.deleteFile", async (_e, filePath) => {
		await fs.unlink(filePath);
	});
	ipcMain.handle("fs.deleteDir", async (_e, dirPath) => {
		await fs.rm(dirPath, {
			recursive: true,
			force: true
		});
	});
	ipcMain.handle("fs.rename", async (_e, oldPath, newPath) => {
		await fs.rename(oldPath, newPath);
	});
	ipcMain.handle("fs.move", async (_e, src, dest) => {
		await fs.mkdir(path.dirname(dest), { recursive: true });
		await fs.rename(src, dest);
	});
	ipcMain.handle("fs.copy", async (_e, src, dest) => {
		await fs.mkdir(path.dirname(dest), { recursive: true });
		await fs.copyFile(src, dest);
	});
	ipcMain.handle("fs.copyDir", async (_e, src, dest) => {
		await fs.cp(src, dest, { recursive: true });
	});
	ipcMain.handle("fs.showOpenDialog", async () => {
		const result = await dialog.showOpenDialog({
			properties: ["openDirectory"],
			title: "Select working directory"
		});
		return result.canceled ? null : result.filePaths[0] ?? null;
	});
	ipcMain.handle("fs.showOpenFileDialog", async (_e, filters) => {
		const result = await dialog.showOpenDialog({
			properties: ["openFile"],
			filters: filters ?? []
		});
		return result.canceled ? null : result.filePaths[0] ?? null;
	});
	ipcMain.handle("fs.showSaveDialog", async (_e, defaultName) => {
		const result = await dialog.showSaveDialog({ defaultPath: defaultName });
		return result.canceled ? null : result.filePath ?? null;
	});
}
//#endregion
//#region src/electron/snippets.ts
var BASE_DIR = app.getAppPath();
function ensureFile(filePath, defaultContent = "[]") {
	if (!fs$1.existsSync(filePath)) try {
		fs$1.mkdirSync(path.dirname(filePath), { recursive: true });
		fs$1.writeFileSync(filePath, defaultContent, "utf-8");
		console.log(`[snippets] created ${filePath}`);
	} catch (err) {
		console.log(`[snippets] could not create ${filePath}:`, err);
	}
}
function resolve(filename) {
	const filePath = path.join(BASE_DIR, filename);
	ensureFile(filePath);
	return filePath;
}
function registerSnippetsHandlers() {
	ipcMain.handle("snippets.get", (_event) => {
		const filePath = resolve("snippets.json");
		try {
			const raw = fs$1.readFileSync(filePath, "utf-8");
			const parsed = JSON.parse(raw);
			return Array.isArray(parsed) ? parsed : [];
		} catch (err) {
			console.log(`[snippets] failed to read ${filePath}:`, err);
			return [];
		}
	});
	ipcMain.handle("snippets.save", (_event, data) => {
		const filePath = resolve("snippets.json");
		try {
			fs$1.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf-8");
			return true;
		} catch (err) {
			console.log(`[snippets] failed to save ${filePath}:`, err);
			return false;
		}
	});
}
//#endregion
//#region src/electron/git.ts
function run(cmd, args, cwd) {
	return new Promise((resolve) => {
		const proc = spawn(cmd, args, {
			cwd,
			shell: false,
			env: process.env
		});
		let stdout = "";
		let stderr = "";
		proc.stdout.on("data", (d) => {
			stdout += d.toString();
		});
		proc.stderr.on("data", (d) => {
			stderr += d.toString();
		});
		proc.on("close", (code) => {
			const exitCode = code ?? 0;
			resolve({
				stdout: stdout.trim(),
				stderr: stderr.trim(),
				exitCode,
				ok: exitCode === 0
			});
		});
		proc.on("error", (err) => {
			resolve({
				stdout: "",
				stderr: err.message,
				exitCode: 1,
				ok: false
			});
		});
	});
}
function git(cwd, args) {
	return run("git", args, cwd);
}
function registerGitHandlers() {
	ipcMain.handle("git.run", (_e, cwd, args) => git(cwd, args));
	ipcMain.handle("git.status", (_e, cwd) => git(cwd, ["status", "--porcelain"]));
	ipcMain.handle("git.log", (_e, cwd, limit = 20, branch) => git(cwd, [
		"log",
		`--max-count=${limit}`,
		"--pretty=format:%H|%s|%an|%ar|%D",
		...branch ? [branch] : []
	]));
	ipcMain.handle("git.diff", (_e, cwd, args = []) => git(cwd, ["diff", ...args]));
	ipcMain.handle("git.show", (_e, cwd, ref) => git(cwd, ["show", ref]));
	ipcMain.handle("git.remote", (_e, cwd) => git(cwd, ["remote", "-v"]));
	ipcMain.handle("git.branches", (_e, cwd) => git(cwd, [
		"branch",
		"-a",
		"--format=%(refname:short)|%(upstream:short)|%(HEAD)"
	]));
	ipcMain.handle("git.currentBranch", (_e, cwd) => git(cwd, [
		"rev-parse",
		"--abbrev-ref",
		"HEAD"
	]));
	ipcMain.handle("git.tags", (_e, cwd) => git(cwd, [
		"tag",
		"--list",
		"--sort=-version:refname"
	]));
	ipcMain.handle("git.add", (_e, cwd, files = ["."]) => git(cwd, ["add", ...files]));
	ipcMain.handle("git.unstage", (_e, cwd, files = ["."]) => git(cwd, [
		"restore",
		"--staged",
		...files
	]));
	ipcMain.handle("git.commit", (_e, cwd, message, allowEmpty = false) => git(cwd, [
		"commit",
		"-m",
		message,
		...allowEmpty ? ["--allow-empty"] : []
	]));
	ipcMain.handle("git.amend", (_e, cwd, message) => git(cwd, [
		"commit",
		"--amend",
		"--no-edit",
		...message ? ["-m", message] : []
	]));
	ipcMain.handle("git.push", (_e, cwd, remote = "origin", branch, force = false) => git(cwd, [
		"push",
		...force ? ["--force-with-lease"] : [],
		remote,
		...branch ? [branch] : []
	]));
	ipcMain.handle("git.pull", (_e, cwd, remote = "origin", branch, rebase = false) => git(cwd, [
		"pull",
		...rebase ? ["--rebase"] : [],
		remote,
		...branch ? [branch] : []
	]));
	ipcMain.handle("git.fetch", (_e, cwd, remote = "origin", prune = true) => git(cwd, [
		"fetch",
		...prune ? ["--prune"] : [],
		remote
	]));
	ipcMain.handle("git.checkout", (_e, cwd, branch, create = false) => git(cwd, create ? [
		"checkout",
		"-b",
		branch
	] : ["checkout", branch]));
	ipcMain.handle("git.deleteBranch", (_e, cwd, branch, force = false) => git(cwd, [
		"branch",
		force ? "-D" : "-d",
		branch
	]));
	ipcMain.handle("git.merge", (_e, cwd, branch, noFF = false) => git(cwd, [
		"merge",
		...noFF ? ["--no-ff"] : [],
		branch
	]));
	ipcMain.handle("git.rebase", (_e, cwd, onto) => git(cwd, ["rebase", onto]));
	ipcMain.handle("git.stash", (_e, cwd, action = "push", message) => git(cwd, [
		"stash",
		action,
		...action === "push" && message ? ["-m", message] : []
	]));
	ipcMain.handle("git.reset", (_e, cwd, mode = "mixed", ref = "HEAD") => git(cwd, [
		"reset",
		`--${mode}`,
		ref
	]));
	ipcMain.handle("git.restore", (_e, cwd, files) => git(cwd, ["restore", ...files]));
	ipcMain.handle("git.clean", (_e, cwd, force = false) => git(cwd, [
		"clean",
		"-fd",
		...force ? [] : ["--dry-run"]
	]));
	ipcMain.handle("git.init", (_e, cwd) => git(cwd, ["init"]));
	ipcMain.handle("git.clone", (_e, url, dest, shallow = false) => run("git", [
		"clone",
		...shallow ? ["--depth", "1"] : [],
		url,
		dest
	], path.dirname(dest)));
	ipcMain.handle("shell.exec", (_e, cwd, command, args = []) => run(command, args, cwd));
	ipcMain.handle("shell.runScript", (_e, cwd, scriptPath, args = []) => {
		const ext = path.extname(scriptPath).toLowerCase();
		const runner = {
			".py": ["python", scriptPath],
			".sh": ["bash", scriptPath],
			".zsh": ["zsh", scriptPath],
			".ps1": [
				"pwsh",
				"-File",
				scriptPath
			],
			".ts": [
				"npx",
				"tsx",
				scriptPath
			],
			".js": ["node", scriptPath]
		}[ext];
		if (!runner) return Promise.resolve({
			stdout: "",
			stderr: `No runner for: ${ext}`,
			exitCode: 1,
			ok: false
		});
		const [cmd, ...cmdArgs] = runner;
		return run(cmd, [...cmdArgs, ...args], cwd);
	});
	ipcMain.handle("shell.runInline", (_e, cwd, lang, code) => {
		const [cmd, flag, script] = {
			bash: [
				"bash",
				"-c",
				code
			],
			zsh: [
				"zsh",
				"-c",
				code
			],
			pwsh: [
				"pwsh",
				"-Command",
				code
			],
			python: [
				"python",
				"-c",
				code
			]
		}[lang];
		return run(cmd, [flag, script], cwd);
	});
}
//#endregion
//#region src/electron/github.ts
var GITHUB_API = "https://api.github.com";
function getToken() {
	const token = process.env.GITHUB_TOKEN;
	if (!token) throw new Error("GITHUB_TOKEN not set");
	return token;
}
async function gh(endpoint, options = {}) {
	const res = await fetch(`${GITHUB_API}${endpoint}`, {
		method: options.method ?? "GET",
		headers: {
			Authorization: `Bearer ${getToken()}`,
			Accept: "application/vnd.github+json",
			"X-GitHub-Api-Version": "2022-11-28",
			"Content-Type": "application/json"
		},
		...options.body ? { body: JSON.stringify(options.body) } : {}
	});
	if (!res.ok) {
		const err = await res.json().catch(() => ({}));
		throw new Error(err.message ?? `GitHub API ${res.status}: ${endpoint}`);
	}
	if (res.status === 204) return void 0;
	return res.json();
}
function registerGitHubHandlers() {
	ipcMain.handle("github.getUser", () => gh("/user"));
	ipcMain.handle("github.listRepos", (_e, sort = "updated", per_page = 100) => gh(`/user/repos?sort=${sort}&per_page=${per_page}&affiliation=owner,collaborator`));
	ipcMain.handle("github.getRepo", (_e, owner, repo) => gh(`/repos/${owner}/${repo}`));
	ipcMain.handle("github.listBranches", (_e, owner, repo) => gh(`/repos/${owner}/${repo}/branches?per_page=100`));
	ipcMain.handle("github.deleteBranch", (_e, owner, repo, branch) => gh(`/repos/${owner}/${repo}/git/refs/heads/${branch}`, { method: "DELETE" }));
	ipcMain.handle("github.listCommits", (_e, owner, repo, branch, per_page = 20) => {
		return gh(`/repos/${owner}/${repo}/commits?${new URLSearchParams({
			per_page: String(per_page),
			...branch ? { sha: branch } : {}
		})}`);
	});
	ipcMain.handle("github.listPRs", (_e, owner, repo, state = "open") => gh(`/repos/${owner}/${repo}/pulls?state=${state}&per_page=50`));
	ipcMain.handle("github.getPR", (_e, owner, repo, number) => gh(`/repos/${owner}/${repo}/pulls/${number}`));
	ipcMain.handle("github.createPR", (_e, owner, repo, data) => gh(`/repos/${owner}/${repo}/pulls`, {
		method: "POST",
		body: data
	}));
	ipcMain.handle("github.updatePR", (_e, owner, repo, number, data) => gh(`/repos/${owner}/${repo}/pulls/${number}`, {
		method: "PATCH",
		body: data
	}));
	ipcMain.handle("github.mergePR", (_e, owner, repo, number, method = "squash") => gh(`/repos/${owner}/${repo}/pulls/${number}/merge`, {
		method: "PUT",
		body: { merge_method: method }
	}));
	ipcMain.handle("github.reviewPR", (_e, owner, repo, number, event, body) => gh(`/repos/${owner}/${repo}/pulls/${number}/reviews`, {
		method: "POST",
		body: {
			event,
			body
		}
	}));
	ipcMain.handle("github.getPRFiles", (_e, owner, repo, number) => gh(`/repos/${owner}/${repo}/pulls/${number}/files`));
	ipcMain.handle("github.getPRChecks", (_e, owner, repo, ref) => gh(`/repos/${owner}/${repo}/commits/${ref}/check-runs`));
	ipcMain.handle("github.listIssues", (_e, owner, repo, state = "open") => gh(`/repos/${owner}/${repo}/issues?state=${state}&per_page=50`));
	ipcMain.handle("github.getIssue", (_e, owner, repo, number) => gh(`/repos/${owner}/${repo}/issues/${number}`));
	ipcMain.handle("github.createIssue", (_e, owner, repo, data) => gh(`/repos/${owner}/${repo}/issues`, {
		method: "POST",
		body: data
	}));
	ipcMain.handle("github.updateIssue", (_e, owner, repo, number, data) => gh(`/repos/${owner}/${repo}/issues/${number}`, {
		method: "PATCH",
		body: data
	}));
	ipcMain.handle("github.addIssueComment", (_e, owner, repo, number, body) => gh(`/repos/${owner}/${repo}/issues/${number}/comments`, {
		method: "POST",
		body: { body }
	}));
	ipcMain.handle("github.listWorkflows", (_e, owner, repo) => gh(`/repos/${owner}/${repo}/actions/workflows`));
	ipcMain.handle("github.getWorkflow", (_e, owner, repo, workflowId) => gh(`/repos/${owner}/${repo}/actions/workflows/${workflowId}`));
	ipcMain.handle("github.triggerWorkflow", (_e, owner, repo, workflowId, ref, inputs = {}) => gh(`/repos/${owner}/${repo}/actions/workflows/${workflowId}/dispatches`, {
		method: "POST",
		body: {
			ref,
			inputs
		}
	}));
	ipcMain.handle("github.listWorkflowRuns", (_e, owner, repo, workflowId, per_page = 20) => gh(`/repos/${owner}/${repo}/actions/workflows/${workflowId}/runs?per_page=${per_page}`));
	ipcMain.handle("github.getWorkflowRun", (_e, owner, repo, runId) => gh(`/repos/${owner}/${repo}/actions/runs/${runId}`));
	ipcMain.handle("github.getWorkflowRunLogs", (_e, owner, repo, runId) => gh(`/repos/${owner}/${repo}/actions/runs/${runId}/logs`));
	ipcMain.handle("github.cancelWorkflowRun", (_e, owner, repo, runId) => gh(`/repos/${owner}/${repo}/actions/runs/${runId}/cancel`, { method: "POST" }));
	ipcMain.handle("github.rerunWorkflowRun", (_e, owner, repo, runId) => gh(`/repos/${owner}/${repo}/actions/runs/${runId}/rerun`, { method: "POST" }));
	ipcMain.handle("github.rerunFailedJobs", (_e, owner, repo, runId) => gh(`/repos/${owner}/${repo}/actions/runs/${runId}/rerun-failed-jobs`, { method: "POST" }));
	ipcMain.handle("github.listRunJobs", (_e, owner, repo, runId) => gh(`/repos/${owner}/${repo}/actions/runs/${runId}/jobs`));
	ipcMain.handle("github.listSecrets", (_e, owner, repo) => gh(`/repos/${owner}/${repo}/actions/secrets`));
	ipcMain.handle("github.listReleases", (_e, owner, repo) => gh(`/repos/${owner}/${repo}/releases?per_page=20`));
	ipcMain.handle("github.createRelease", (_e, owner, repo, data) => gh(`/repos/${owner}/${repo}/releases`, {
		method: "POST",
		body: data
	}));
}
//#endregion
//#region src/electron/main.mts
var __filename = fileURLToPath(import.meta.url);
var __dirname = path.dirname(__filename);
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
	const preloadPath = path.join(__dirname, "preload.mjs");
	console.log("[main] preload path:", preloadPath, "exists:", fs$1.existsSync(preloadPath));
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
		const prodFile = path.join(__dirname, "../dist/index.html");
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
	registerTerminalHandlers(() => mainWindow?.webContents ?? null);
	registerQueuesHandlers();
	registerFilesystemHandlers();
	registerSnippetsHandlers();
	registerGitHandlers();
	registerGitHubHandlers();
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
