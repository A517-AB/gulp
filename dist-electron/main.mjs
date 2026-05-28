import { BrowserWindow, Menu, Tray, app, dialog, globalShortcut, ipcMain, nativeImage, powerMonitor } from "electron";
import * as path$1 from "path";
import * as fs$2 from "fs";
import { fileURLToPath } from "url";
import * as pty from "node-pty";
import * as os from "os";
import * as fs$1 from "fs/promises";
import { spawn } from "child_process";
import { jules } from "@google/jules-sdk";
import * as fs from "node:fs";
import * as path from "node:path";
import { execFileSync } from "node:child_process";
import chokidar from "chokidar";
//#region src/electron/Terminal.ts
var active = null;
function send$2(wc, channel, payload) {
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
					send$2(wc, "terminal.output", data);
				}),
				dispExit: proc.onExit(({ exitCode, signal }) => {
					send$2(wc, "terminal.exit", {
						exitCode,
						signal
					});
					active = null;
				})
			};
		} catch (err) {
			const msg = err instanceof Error ? err.message : String(err);
			console.error(`[terminal] spawn failed: ${msg}`);
			send$2(wc, "terminal.output", `\r\n\x1b[31m[terminal] failed to start ${shellType ?? "pwsh"}: ${msg}\x1b[0m\r\n`);
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
var BASE_DIR$1 = "D:\\tired";
function ensureFile$1(filePath, defaultContent = "[]") {
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
function resolve$1(filename) {
	const filePath = path$1.join(BASE_DIR$1, filename);
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
		const entries = await fs$1.readdir(dir, { withFileTypes: true });
		return (await Promise.all(entries.filter((e) => !e.name.startsWith(".")).map(async (e) => {
			const stat = await fs$1.stat(path$1.join(dir, e.name)).catch(() => null);
			return {
				name: e.name,
				isDir: e.isDirectory(),
				ext: path$1.extname(e.name).toLowerCase(),
				size: stat?.size ?? 0,
				modifiedAt: stat?.mtime.toISOString() ?? ""
			};
		}))).sort((a, b) => {
			if (a.isDir !== b.isDir) return a.isDir ? -1 : 1;
			return a.name.localeCompare(b.name);
		});
	});
	ipcMain.handle("fs.readFile", async (_e, filePath) => {
		const stat = await fs$1.stat(filePath);
		if (stat.size > 2 * 1024 * 1024) return `[File too large to preview: ${(stat.size / 1024 / 1024).toFixed(1)} MB]`;
		return fs$1.readFile(filePath, "utf-8");
	});
	ipcMain.handle("fs.exists", async (_e, filePath) => {
		return fs$1.access(filePath).then(() => true).catch(() => false);
	});
	ipcMain.handle("fs.stat", async (_e, filePath) => {
		const stat = await fs$1.stat(filePath);
		return {
			size: stat.size,
			isDir: stat.isDirectory(),
			isFile: stat.isFile(),
			createdAt: stat.birthtime.toISOString(),
			modifiedAt: stat.mtime.toISOString()
		};
	});
	ipcMain.handle("fs.writeFile", async (_e, filePath, content) => {
		await fs$1.mkdir(path$1.dirname(filePath), { recursive: true });
		await fs$1.writeFile(filePath, content, "utf-8");
	});
	ipcMain.handle("fs.appendFile", async (_e, filePath, content) => {
		await fs$1.appendFile(filePath, content, "utf-8");
	});
	ipcMain.handle("fs.mkdir", async (_e, dirPath) => {
		await fs$1.mkdir(dirPath, { recursive: true });
	});
	ipcMain.handle("fs.deleteFile", async (_e, filePath) => {
		await fs$1.unlink(filePath);
	});
	ipcMain.handle("fs.deleteDir", async (_e, dirPath) => {
		await fs$1.rm(dirPath, {
			recursive: true,
			force: true
		});
	});
	ipcMain.handle("fs.rename", async (_e, oldPath, newPath) => {
		await fs$1.rename(oldPath, newPath);
	});
	ipcMain.handle("fs.move", async (_e, src, dest) => {
		await fs$1.mkdir(path$1.dirname(dest), { recursive: true });
		await fs$1.rename(src, dest);
	});
	ipcMain.handle("fs.copy", async (_e, src, dest) => {
		await fs$1.mkdir(path$1.dirname(dest), { recursive: true });
		await fs$1.copyFile(src, dest);
	});
	ipcMain.handle("fs.copyDir", async (_e, src, dest) => {
		await fs$1.cp(src, dest, { recursive: true });
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
		const result = await dialog.showSaveDialog(defaultName !== void 0 ? { defaultPath: defaultName } : {});
		return result.canceled ? null : result.filePath;
	});
}
//#endregion
//#region src/electron/snippets.ts
var BASE_DIR = app.getAppPath();
function ensureFile(filePath, defaultContent = "[]") {
	if (!fs$2.existsSync(filePath)) try {
		fs$2.mkdirSync(path$1.dirname(filePath), { recursive: true });
		fs$2.writeFileSync(filePath, defaultContent, "utf-8");
		console.log(`[snippets] created ${filePath}`);
	} catch (err) {
		console.log(`[snippets] could not create ${filePath}:`, err);
	}
}
function resolve(filename) {
	const filePath = path$1.join(BASE_DIR, filename);
	ensureFile(filePath);
	return filePath;
}
function registerSnippetsHandlers() {
	ipcMain.handle("snippets.get", (_event) => {
		const filePath = resolve("snippets.json");
		try {
			const raw = fs$2.readFileSync(filePath, "utf-8");
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
			fs$2.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf-8");
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
		`--max-count=${String(limit)}`,
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
		`--${String(mode)}`,
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
	], path$1.dirname(dest)));
	ipcMain.handle("shell.exec", (_e, cwd, command, args = []) => run(command, args, cwd));
	ipcMain.handle("shell.runScript", (_e, cwd, scriptPath, args = []) => {
		const ext = path$1.extname(scriptPath).toLowerCase();
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
		const runner = {
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
		if (!runner) throw new Error(`Unsupported language: ${lang}`);
		const [cmd, flag, script] = runner;
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
//#region src/electron/jules/repoless/handler.ts
function serialize$2(data) {
	if (data === void 0 || data === null) return data;
	return JSON.parse(JSON.stringify(data));
}
function buildRepoContext(repoPath) {
	const ignore = new Set([
		"node_modules",
		"dist",
		".git",
		".next",
		"build",
		"__pycache__",
		".venv",
		".cache"
	]);
	const lines = [
		`# Repository: ${path.basename(repoPath)}`,
		"",
		"## File Structure",
		"```"
	];
	function walk(dir, prefix, depth) {
		if (depth > 3) return;
		let entries;
		try {
			entries = fs.readdirSync(dir, { withFileTypes: true }).filter((e) => !e.name.startsWith(".") && !ignore.has(e.name));
		} catch {
			return;
		}
		for (const entry of entries) {
			lines.push(`${prefix}${entry.isDirectory() ? "/" : " "} ${entry.name}`);
			if (entry.isDirectory()) walk(path.join(dir, entry.name), prefix + "  ", depth + 1);
		}
	}
	walk(repoPath, "", 0);
	lines.push("```");
	for (const file of [
		"package.json",
		"README.md",
		"AGENTS.md",
		"pyproject.toml",
		"Cargo.toml"
	]) {
		const filePath = path.join(repoPath, file);
		if (fs.existsSync(filePath)) try {
			const content = fs.readFileSync(filePath, "utf-8").slice(0, 1500);
			lines.push("", `## ${file}`, "```", content, "```");
		} catch {}
	}
	return lines.join("\n");
}
/**
* Validates that a git branch name does not contain shell metacharacters
* or other characters that could be used for command injection.
* Allows alphanumerics, hyphens, underscores, dots, and forward slashes.
*/
function validateBranchName(name) {
	if (!name || name.length === 0) throw new Error("Branch name must not be empty");
	if (/[^a-zA-Z0-9_\-.]/.test(name)) throw new Error(`Invalid branch name "${name.replace(/[^a-zA-Z0-9_\-.]/g, "?")}": contains disallowed characters. Use only alphanumerics, hyphens, underscores, and dots.`);
	if (name.startsWith("-") || name.startsWith(".") || name.endsWith(".") || name.includes("..")) throw new Error(`Invalid branch name "${name}": violates git branch naming rules`);
}
function registerRepolessHandlers() {
	ipcMain.handle("sdk:repoless.pickDir", async (event) => {
		const win = BrowserWindow.fromWebContents(event.sender);
		if (!win) return null;
		const result = await dialog.showOpenDialog(win, {
			properties: ["openDirectory"],
			title: "Select Repository"
		});
		return result.canceled ? null : result.filePaths[0] ?? null;
	});
	ipcMain.handle("sdk:repoless.start", async (_, prompt, repoPath) => {
		const fullPrompt = repoPath ? `${buildRepoContext(repoPath)}\n\n---\n\n${prompt}` : prompt;
		const session = await jules.session({ prompt: fullPrompt });
		console.log(`[repoless] session started: ${session.id}`);
		return { id: session.id };
	});
	ipcMain.handle("sdk:repoless.apply", async (_, id, repoPath, branchName) => {
		validateBranchName(branchName);
		const outcome = await jules.session(id).result();
		try {
			execFileSync("git", [
				"-C",
				repoPath,
				"checkout",
				"-b",
				branchName
			], { encoding: "utf-8" });
		} catch (err) {
			throw new Error(`Failed to create branch "${branchName}": ${err instanceof Error ? err.message : String(err)}`, { cause: err });
		}
		const applied = [];
		const changeSet = outcome.changeSet();
		if (changeSet) {
			console.log(`[repoless] applying changeSet patch (${String(changeSet.gitPatch.unidiffPatch.length)} chars)`);
			const patchPath = path.join(repoPath, ".jules-patch.tmp");
			fs.writeFileSync(patchPath, changeSet.gitPatch.unidiffPatch, "utf-8");
			try {
				execFileSync("git", [
					"-C",
					repoPath,
					"apply",
					patchPath
				], { encoding: "utf-8" });
			} catch (err) {
				throw new Error(`Failed to apply patch: ${err instanceof Error ? err.message : String(err)}`, { cause: err });
			} finally {
				fs.unlinkSync(patchPath);
			}
			for (const f of changeSet.parsed().files) {
				applied.push(f.path);
				console.log(`[repoless] patched: ${f.path} (+${String(f.additions)} -${String(f.deletions)})`);
			}
		} else for (const file of outcome.generatedFiles().all()) {
			const fullPath = path.join(repoPath, file.path);
			await fs.promises.mkdir(path.dirname(fullPath), { recursive: true });
			await fs.promises.writeFile(fullPath, file.content, "utf-8");
			applied.push(file.path);
			console.log(`[repoless] wrote: ${file.path} (${String(file.content.length)} chars)`);
		}
		try {
			execFileSync("git", [
				"-C",
				repoPath,
				"add",
				"-A"
			], { encoding: "utf-8" });
		} catch (err) {
			throw new Error(`Failed to stage files: ${err instanceof Error ? err.message : String(err)}`, { cause: err });
		}
		let diff;
		try {
			diff = execFileSync("git", [
				"-C",
				repoPath,
				"diff",
				"--cached"
			], { encoding: "utf-8" });
		} catch (err) {
			throw new Error(`Failed to read staged diff: ${err instanceof Error ? err.message : String(err)}`, { cause: err });
		}
		console.log(`[repoless] applied ${String(applied.length)} file(s) to branch "${branchName}"`);
		return serialize$2({
			branch: branchName,
			diff,
			applied
		});
	});
	ipcMain.handle("sdk:repoless.run", async (event, prompt, repoPath, runId) => {
		const fullPrompt = repoPath ? `${buildRepoContext(repoPath)}\n\n---\n\n${prompt}` : prompt;
		const session = await jules.session({ prompt: fullPrompt });
		console.log(`[repoless] run session started: ${session.id}`);
		let agentMessage;
		for await (const activity of session.stream()) {
			if (event.sender.isDestroyed()) break;
			if (activity.type === "agentMessaged") agentMessage = activity.message;
			if (!event.sender.isDestroyed()) event.sender.send(`sdk:repoless.run.progress:${runId}`, serialize$2(activity));
		}
		const outcome = await session.result();
		const files = {};
		for (const file of outcome.generatedFiles().all()) files[file.path] = file.content;
		return serialize$2({
			id: session.id,
			...agentMessage !== void 0 ? { agentMessage } : {},
			files
		});
	});
}
//#endregion
//#region src/electron/jules/watcher.ts
function serialize$1(data) {
	if (data === void 0 || data === null) return data;
	return JSON.parse(JSON.stringify(data));
}
function send$1(sender, ch, payload) {
	if (!sender.isDestroyed()) sender.send(ch, serialize$1(payload));
}
var watchers = /* @__PURE__ */ new Map();
var debounceTimers = /* @__PURE__ */ new Map();
var DEBOUNCE_MS = 500;
function registerWatcherHandlers() {
	ipcMain.handle("sdk:watcher.start", (event, dir) => {
		const watcherId = `watcher-${String(Date.now())}`;
		const watchDir = path.resolve(dir);
		const watcher = chokidar.watch(watchDir, {
			ignored: /(^|[/\\])\../,
			persistent: true,
			ignoreInitial: true
		});
		async function handleEvent(eventType, filepath) {
			const session = await jules.session({ prompt: `File ${eventType}: ${filepath}. Review and suggest improvements.` });
			send$1(event.sender, `sdk:watcher.session:${watcherId}`, {
				id: session.id,
				event: eventType,
				filepath
			});
		}
		function debounced(eventType, filepath) {
			const existing = debounceTimers.get(filepath);
			if (existing) clearTimeout(existing);
			debounceTimers.set(filepath, setTimeout(() => {
				debounceTimers.delete(filepath);
				handleEvent(eventType, filepath).catch(console.error);
			}, DEBOUNCE_MS));
		}
		watcher.on("add", (p) => {
			debounced("added", p);
		}).on("change", (p) => {
			debounced("changed", p);
		});
		watchers.set(watcherId, watcher);
		return watcherId;
	});
	ipcMain.handle("sdk:watcher.stop", async (_, watcherId) => {
		const watcher = watchers.get(watcherId);
		if (watcher) {
			await watcher.close();
			watchers.delete(watcherId);
		}
	});
}
//#endregion
//#region src/electron/jules/handlers.ts
function serialize(data) {
	if (data === void 0 || data === null) return data;
	return JSON.parse(JSON.stringify(data));
}
function send(sender, ch, payload) {
	if (!sender.isDestroyed()) sender.send(ch, serialize(payload));
}
/**
* Wraps an IPC handler so that SDK errors are properly serialized across the
* IPC boundary. Without this, Electron's IPC only transmits the generic
* `Error.message` string — any additional fields like `status`, `code`, or a
* custom `name` (e.g. from a JulesError) are silently dropped.
*/
function wrapHandler(fn) {
	return async (event, ...args) => {
		try {
			return await fn(event, ...args);
		} catch (err) {
			const wrapped = new Error(err instanceof Error ? err.message : String(err));
			if (err instanceof Error) {
				wrapped.name = err.name;
				for (const key of ["status", "code"]) if (key in err) wrapped[key] = err[key];
			}
			throw wrapped;
		}
	};
}
function registerSdkHandlers() {
	ipcMain.handle("sdk:client.sessions", wrapHandler(async (_, options) => {
		return serialize(await jules.sessions(options).all());
	}));
	ipcMain.handle("sdk:client.sessions.stream.start", wrapHandler(async (event, options) => {
		for await (const item of jules.sessions(options)) {
			if (event.sender.isDestroyed()) break;
			send(event.sender, "sdk:client.sessions.item", item);
		}
		send(event.sender, "sdk:client.sessions.done");
	}));
	ipcMain.handle("sdk:client.sync", wrapHandler(async (event, options) => serialize(await jules.sync({
		...options,
		onProgress: (p) => {
			send(event.sender, "sdk:client.sync.progress", p);
		}
	}))));
	ipcMain.handle("sdk:client.select", wrapHandler(async (_, query) => serialize(await jules.select(query))));
	ipcMain.handle("sdk:client.getSessionResource", wrapHandler(async (_, id) => serialize(await jules.session(id).info())));
	ipcMain.handle("sdk:client.run", wrapHandler(async (_, config) => serialize(await jules.run(config))));
	ipcMain.handle("sdk:client.with", wrapHandler((_, options) => {
		jules.with(options);
		return Promise.resolve();
	}));
	ipcMain.handle("sdk:client.all", wrapHandler(async (_, configs, options) => {
		return serialize((await jules.all(configs, (config) => config, options)).map((s) => ({ id: s.id })));
	}));
	ipcMain.handle("sdk:source.resolve", wrapHandler((_, repoPath) => {
		let github = null;
		try {
			const url = execFileSync("git", [
				"remote",
				"get-url",
				"origin"
			], {
				encoding: "utf-8",
				cwd: repoPath ?? process.cwd()
			}).trim();
			github = /github\.com[:/](.+?)(?:\.git)?$/.exec(url)?.[1] ?? null;
		} catch {}
		const baseBranch = process.env.BASE_BRANCH ?? "main";
		return Promise.resolve({
			github,
			baseBranch
		});
	}));
	ipcMain.handle("sdk:session.send", wrapHandler(async (_, id, prompt) => {
		await jules.session(id).send(prompt);
	}));
	ipcMain.handle("sdk:session.ask", wrapHandler(async (_, id, prompt) => serialize(await jules.session(id).ask(prompt))));
	ipcMain.handle("sdk:session.approve", wrapHandler(async (_, id) => {
		await jules.session(id).approve();
	}));
	ipcMain.handle("sdk:session.info", wrapHandler(async (_, id) => serialize(await jules.session(id).info())));
	ipcMain.handle("sdk:session.result", wrapHandler(async (_, id) => serialize(await jules.session(id).result())));
	ipcMain.handle("sdk:session.waitFor", wrapHandler(async (_, id, state) => {
		await jules.session(id).waitFor(state);
	}));
	ipcMain.handle("sdk:session.snapshot", wrapHandler(async (_, id, options) => serialize(await jules.session(id).snapshot(options))));
	ipcMain.handle("sdk:session.archive", wrapHandler(async (_, id) => {
		await jules.session(id).archive();
	}));
	ipcMain.handle("sdk:session.unarchive", wrapHandler(async (_, id) => {
		await jules.session(id).unarchive();
	}));
	ipcMain.handle("sdk:session.select", wrapHandler(async (_, id, options) => serialize(await jules.session(id).activities.select(options))));
	ipcMain.handle("sdk:session.hydrate", wrapHandler(async (_, id) => serialize(await jules.session(id).activities.hydrate())));
	ipcMain.handle("sdk:session.stream.start", wrapHandler(async (event, id, options) => {
		for await (const item of jules.session(id).stream(options)) {
			if (event.sender.isDestroyed()) break;
			send(event.sender, `sdk:session.stream:${id}`, item);
		}
		send(event.sender, `sdk:session.stream.done:${id}`);
	}));
	ipcMain.handle("sdk:session.history.start", wrapHandler(async (event, id) => {
		for await (const item of jules.session(id).history()) {
			if (event.sender.isDestroyed()) break;
			send(event.sender, `sdk:session.history:${id}`, item);
		}
		send(event.sender, `sdk:session.history.done:${id}`);
	}));
	ipcMain.handle("sdk:session.updates.start", wrapHandler(async (event, id) => {
		for await (const item of jules.session(id).updates()) {
			if (event.sender.isDestroyed()) break;
			send(event.sender, `sdk:session.updates:${id}`, item);
		}
		send(event.sender, `sdk:session.updates.done:${id}`);
	}));
	ipcMain.handle("sdk:activities.hydrate", wrapHandler(async (_, id) => serialize(await jules.session(id).activities.hydrate())));
	ipcMain.handle("sdk:activities.select", wrapHandler(async (_, id, options) => serialize(await jules.session(id).activities.select(options))));
	ipcMain.handle("sdk:activities.list", wrapHandler(async (_, id, options) => serialize(await jules.session(id).activities.list(options))));
	ipcMain.handle("sdk:activities.get", wrapHandler(async (_, id, activityId) => serialize(await jules.session(id).activities.get(activityId))));
	ipcMain.handle("sdk:activities.history.start", wrapHandler(async (event, id) => {
		for await (const item of jules.session(id).activities.history()) {
			if (event.sender.isDestroyed()) break;
			send(event.sender, `sdk:activities.history:${id}`, item);
		}
		send(event.sender, `sdk:activities.history.done:${id}`);
	}));
	ipcMain.handle("sdk:activities.updates.start", wrapHandler(async (event, id) => {
		for await (const item of jules.session(id).activities.updates()) {
			if (event.sender.isDestroyed()) break;
			send(event.sender, `sdk:activities.updates:${id}`, item);
		}
		send(event.sender, `sdk:activities.updates.done:${id}`);
	}));
	ipcMain.handle("sdk:activities.stream.start", wrapHandler(async (event, id) => {
		for await (const item of jules.session(id).activities.stream()) {
			if (event.sender.isDestroyed()) break;
			send(event.sender, `sdk:activities.stream:${id}`, item);
		}
		send(event.sender, `sdk:activities.stream.done:${id}`);
	}));
	ipcMain.handle("sdk:sources.get", wrapHandler(async (_, filter) => serialize(await jules.sources.get(filter))));
	registerRepolessHandlers();
	registerWatcherHandlers();
	ipcMain.handle("sdk:artifact.save", wrapHandler(async (_, data, filepath) => {
		const resolved = path.resolve(filepath);
		await fs.promises.mkdir(path.dirname(resolved), { recursive: true });
		await fs.promises.writeFile(resolved, Buffer.from(data, "base64"));
		return resolved;
	}));
}
//#endregion
//#region src/electron/repos.ts
var REPOS_FILE = path.join(app.getPath("userData"), "repos.json");
function load() {
	try {
		return JSON.parse(fs.readFileSync(REPOS_FILE, "utf-8"));
	} catch {
		return [];
	}
}
function save(repos) {
	fs.writeFileSync(REPOS_FILE, JSON.stringify(repos, null, 2), "utf-8");
}
function isGitRepo(dir) {
	return fs.existsSync(path.join(dir, ".git"));
}
function makeRepoInfo(repoPath) {
	return {
		path: repoPath,
		name: path.basename(repoPath),
		addedAt: Date.now()
	};
}
function registerReposHandlers() {
	ipcMain.handle("repos.list", () => load());
	ipcMain.handle("repos.register", (_, repoPath) => {
		if (!isGitRepo(repoPath)) throw new Error(`Not a git repository: ${repoPath}`);
		const repos = load();
		const existing = repos.find((r) => r.path === repoPath);
		if (existing) return existing;
		const info = makeRepoInfo(repoPath);
		repos.push(info);
		save(repos);
		return info;
	});
	ipcMain.handle("repos.forget", (_, repoPath) => {
		save(load().filter((r) => r.path !== repoPath));
	});
	ipcMain.handle("repos.scan", (_, rootDir) => {
		const found = [];
		const ignore = new Set([
			".git",
			"node_modules",
			"dist",
			".next",
			"build",
			"__pycache__",
			".venv"
		]);
		function walk(dir, depth) {
			if (depth > 3) return;
			let entries;
			try {
				entries = fs.readdirSync(dir, { withFileTypes: true });
			} catch {
				return;
			}
			for (const entry of entries) {
				if (!entry.isDirectory() || ignore.has(entry.name)) continue;
				const full = path.join(dir, entry.name);
				if (isGitRepo(full)) found.push(makeRepoInfo(full));
				else walk(full, depth + 1);
			}
		}
		walk(rootDir, 0);
		const existing = load();
		const existingPaths = new Set(existing.map((r) => r.path));
		const newRepos = found.filter((r) => !existingPaths.has(r.path));
		if (newRepos.length > 0) save([...existing, ...newRepos]);
		return found;
	});
	ipcMain.handle("repos.pickAndRegister", async (event) => {
		const { BrowserWindow } = await import("electron");
		const win = BrowserWindow.fromWebContents(event.sender);
		const result = await dialog.showOpenDialog(win ?? BrowserWindow.getFocusedWindow() ?? new BrowserWindow(), {
			properties: ["openDirectory"],
			title: "Select Git Repository"
		});
		if (result.canceled || !result.filePaths[0]) return null;
		const repoPath = result.filePaths[0];
		if (!isGitRepo(repoPath)) throw new Error(`Not a git repository: ${repoPath}`);
		const repos = load();
		const existing = repos.find((r) => r.path === repoPath);
		if (existing) return existing;
		const info = makeRepoInfo(repoPath);
		repos.push(info);
		save(repos);
		return info;
	});
}
//#endregion
//#region src/electron/power.ts
function registerPowerMonitor({ getWindow, getTray, buildTrayIcon }) {
	function goLow() {
		getTray()?.setImage(buildTrayIcon("low-power"));
		getWindow()?.webContents.send("power.low");
		getWindow()?.webContents.send("lowPower.enter");
	}
	function goActive() {
		const isVisible = getWindow()?.isVisible() ?? false;
		getTray()?.setImage(buildTrayIcon(isVisible ? "active" : "idle"));
		getWindow()?.webContents.send("power.active");
		getWindow()?.webContents.send("lowPower.exit");
	}
	powerMonitor.on("suspend", goLow);
	powerMonitor.on("lock-screen", goLow);
	powerMonitor.on("resume", goActive);
	powerMonitor.on("unlock-screen", goActive);
}
//#endregion
//#region src/electron/main.mts
app.commandLine.appendSwitch("force-color-profile", "srgb");
app.commandLine.appendSwitch("enable-gpu-rasterization");
app.commandLine.appendSwitch("enable-zero-copy");
app.commandLine.appendSwitch("enable-hardware-overlays");
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
var TRAY_COLORS = {
	"active": [
		139,
		92,
		246
	],
	"idle": [
		59,
		130,
		246
	],
	"low-power": [
		107,
		114,
		128
	]
};
function buildTrayIcon(state) {
	const color = TRAY_COLORS[state];
	const size = 16;
	const buf = Buffer.alloc(size * size * 4, 0);
	for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
		const dx = x - size / 2 + .5;
		const dy = y - size / 2 + .5;
		const idx = (y * size + x) * 4;
		if (Math.sqrt(dx * dx + dy * dy) <= size / 2 - 1) {
			buf[idx] = color[0];
			buf[idx + 1] = color[1];
			buf[idx + 2] = color[2];
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
		frame: false,
		transparent: true,
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
	mainWindow.on("show", () => {
		tray?.setImage(buildTrayIcon("active"));
	});
	mainWindow.on("hide", () => {
		tray?.setImage(buildTrayIcon("idle"));
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
ipcMain.on("lowPower.manualEnter", () => {
	tray?.setImage(buildTrayIcon("low-power"));
	mainWindow?.webContents.send("lowPower.enter");
});
ipcMain.on("lowPower.manualExit", () => {
	const isVisible = mainWindow?.isVisible() ?? false;
	tray?.setImage(buildTrayIcon(isVisible ? "active" : "idle"));
	mainWindow?.webContents.send("lowPower.exit");
});
ipcMain.on("lowPower.toggleAlwaysOnTop", () => {
	if (mainWindow) {
		const next = !mainWindow.isAlwaysOnTop();
		mainWindow.setAlwaysOnTop(next);
		mainWindow.webContents.send("lowPower.alwaysOnTop", next);
	}
});
app.whenReady().then(() => {
	console.log("[main] app ready");
	registerTerminalHandlers(() => mainWindow?.webContents ?? null);
	registerQueuesHandlers();
	registerFilesystemHandlers();
	registerSnippetsHandlers();
	registerGitHandlers();
	registerGitHubHandlers();
	registerSdkHandlers();
	registerReposHandlers();
	createWindow();
	tray = new Tray(buildTrayIcon("active"));
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
	globalShortcut.register("Ctrl+Shift+4", () => {
		tray?.setImage(buildTrayIcon("low-power"));
		mainWindow?.webContents.send("lowPower.enter");
	});
	globalShortcut.register("Ctrl+Shift+6", () => {
		const isVisible = mainWindow?.isVisible() ?? false;
		tray?.setImage(buildTrayIcon(isVisible ? "active" : "idle"));
		mainWindow?.webContents.send("lowPower.exit");
	});
	globalShortcut.register("Ctrl+Shift+5", () => {
		if (mainWindow) {
			const next = !mainWindow.isAlwaysOnTop();
			mainWindow.setAlwaysOnTop(next);
			mainWindow.webContents.send("lowPower.alwaysOnTop", next);
		}
	});
	registerPowerMonitor({
		getWindow: () => mainWindow,
		getTray: () => tray,
		buildTrayIcon
	});
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
export { buildTrayIcon };
