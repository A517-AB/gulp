import { BrowserWindow, app, dialog, ipcMain } from "electron";
import * as path$1 from "path";
import { fileURLToPath } from "url";
import * as path from "node:path";
import { join } from "node:path";
import { homedir } from "node:os";
import * as fs from "node:fs";
import { accessSync, constants, existsSync } from "node:fs";
import * as fs$1 from "fs/promises";
import { createReadStream, createWriteStream } from "fs";
import * as readline from "readline";
import { readFile, rm, writeFile } from "node:fs/promises";
import { Buffer as Buffer$1 } from "node:buffer";
import { setTimeout as setTimeout$1 } from "node:timers/promises";
import * as crypto from "node:crypto";
import { execFileSync } from "node:child_process";
//#region node_modules/@google/jules-sdk/dist/index.mjs
var JulesError = class extends Error {
	/** The original error that caused this error, if any. */
	cause;
	constructor(message, options) {
		super(message);
		this.name = this.constructor.name;
		this.cause = options?.cause;
	}
};
var JulesNetworkError = class extends JulesError {
	url;
	constructor(url, options) {
		super(`Network request to ${url} failed`, options);
		this.url = url;
	}
};
var JulesApiError = class extends JulesError {
	url;
	status;
	statusText;
	constructor(url, status, statusText, message, options) {
		const finalMessage = message ?? `[${status} ${statusText}] Request to ${url} failed`;
		super(finalMessage, options);
		this.url = url;
		this.status = status;
		this.statusText = statusText;
	}
};
var JulesAuthenticationError = class extends JulesApiError {
	constructor(url, status, statusText) {
		super(url, status, statusText, `[${status} ${statusText}] Authentication to ${url} failed. Ensure your API key is correct.`);
	}
};
var JulesRateLimitError = class extends JulesApiError {
	constructor(url, status, statusText) {
		super(url, status, statusText, `[${status} ${statusText}] API rate limit exceeded for ${url}.`);
	}
};
var MissingApiKeyError = class extends JulesError {
	constructor() {
		super("Jules API key is missing. Pass it to the constructor or set the JULES_API_KEY environment variable.");
	}
};
var SourceNotFoundError = class extends JulesError {
	constructor(sourceIdentifier) {
		super(`Could not get source '${sourceIdentifier}'`);
	}
};
var AutomatedSessionFailedError = class extends JulesError {
	constructor(reason) {
		let message = "The Jules automated session terminated with a FAILED state.";
		if (reason) message += ` Reason: ${reason}`;
		super(message);
	}
};
var TimeoutError = class extends JulesError {
	constructor(message) {
		super(message);
	}
};
var SyncInProgressError = class extends JulesError {
	constructor() {
		super("A sync operation is already in progress. Wait for it to complete before starting another.");
	}
};
var ApiClient = class {
	apiKey;
	baseUrl;
	requestTimeoutMs;
	rateLimitConfig;
	semaphore;
	constructor(options) {
		this.apiKey = options.apiKey;
		this.baseUrl = options.baseUrl;
		this.requestTimeoutMs = options.requestTimeoutMs;
		this.rateLimitConfig = {
			maxRetryTimeMs: options.rateLimitRetry?.maxRetryTimeMs ?? 3e5,
			baseDelayMs: options.rateLimitRetry?.baseDelayMs ?? 1e3,
			maxDelayMs: options.rateLimitRetry?.maxDelayMs ?? 3e4
		};
		this.semaphore = new Semaphore(options.maxConcurrentRequests ?? 50);
	}
	async request(endpoint, options = {}) {
		const { method = "GET", body, query, headers: customHeaders, _isRetry } = options;
		const url = this.resolveUrl(endpoint);
		if (query) Object.entries(query).forEach(([key, value]) => {
			url.searchParams.append(key, String(value));
		});
		const headers = {
			"Content-Type": "application/json",
			...customHeaders
		};
		if (this.apiKey) headers["X-Goog-Api-Key"] = this.apiKey;
		else throw new MissingApiKeyError();
		let response;
		try {
			await this.semaphore.acquire();
			response = await this.fetchWithTimeout(url.toString(), {
				method,
				headers,
				body: body ? JSON.stringify(body) : void 0
			});
		} finally {
			this.semaphore.release();
		}
		if (!response.ok) {
			if (response.status === 429 || [
				500,
				502,
				503,
				504
			].includes(response.status)) {
				const startTime = options._rateLimitStartTime || Date.now();
				const elapsed = Date.now() - startTime;
				const retryCount = options._rateLimitRetryCount || 0;
				if (elapsed < this.rateLimitConfig.maxRetryTimeMs) {
					const rawDelay = this.rateLimitConfig.baseDelayMs * Math.pow(2, retryCount);
					const delay = Math.min(rawDelay, this.rateLimitConfig.maxDelayMs);
					await new Promise((resolve) => setTimeout(resolve, delay));
					return this.request(endpoint, {
						...options,
						_rateLimitStartTime: startTime,
						_rateLimitRetryCount: retryCount + 1
					});
				}
				if (response.status === 429) throw new JulesRateLimitError(url.toString(), response.status, response.statusText);
			}
			switch (response.status) {
				case 401:
				case 403: throw new JulesAuthenticationError(url.toString(), response.status, response.statusText);
				default:
					const errorBody = await response.text().catch(() => "Could not read error body");
					const message = `[${response.status} ${response.statusText}] ${method} ${url.toString()} - ${errorBody}`;
					throw new JulesApiError(url.toString(), response.status, response.statusText, message);
			}
		}
		const responseText = await response.text();
		if (!responseText) return {};
		return JSON.parse(responseText);
	}
	resolveUrl(path2) {
		return new URL(`${this.baseUrl}/${path2}`);
	}
	async fetchWithTimeout(url, opts) {
		const controller = new AbortController();
		const timeoutId = setTimeout(() => controller.abort(), this.requestTimeoutMs);
		try {
			return await fetch(url, {
				...opts,
				signal: controller.signal
			});
		} catch (error) {
			throw new JulesNetworkError(url, { cause: error });
		} finally {
			clearTimeout(timeoutId);
		}
	}
};
var Semaphore = class {
	constructor(maxConcurrentRequests) {
		this.maxConcurrentRequests = maxConcurrentRequests;
	}
	currentRequests = 0;
	queue = [];
	async acquire() {
		if (this.currentRequests < this.maxConcurrentRequests) {
			this.currentRequests++;
			return Promise.resolve();
		}
		return new Promise((resolve) => {
			this.queue.push(resolve);
		});
	}
	release() {
		if (this.queue.length > 0) {
			const resolve = this.queue.shift();
			if (resolve) resolve();
		} else this.currentRequests--;
	}
};
function mapRawSourceToSdkSource(rawSource) {
	if (rawSource.githubRepo) {
		const { defaultBranch, branches, ...rest } = rawSource.githubRepo;
		return {
			name: rawSource.name,
			id: rawSource.id,
			type: "githubRepo",
			githubRepo: {
				...rest,
				defaultBranch: defaultBranch?.displayName,
				branches: branches?.map((b) => b.displayName)
			}
		};
	}
	throw new Error(`Unknown source type for source: ${rawSource.name}`);
}
var SourceManagerImpl = class {
	apiClient;
	constructor(apiClient) {
		this.apiClient = apiClient;
	}
	/**
	* Lists all connected sources.
	*
	* **Logic:**
	* - Automatically handles API pagination by following `nextPageToken`.
	* - Yields sources one by one as they are retrieved.
	*/
	async *list(options = {}) {
		let pageToken = void 0;
		while (true) {
			const params = { pageSize: (options.pageSize || 100).toString() };
			if (options.filter) params.filter = options.filter;
			if (pageToken) params.pageToken = pageToken;
			const response = await this.apiClient.request("sources", { query: params });
			if (response && response.sources) for (const rawSource of response.sources) yield mapRawSourceToSdkSource(rawSource);
			pageToken = response?.nextPageToken;
			if (!pageToken) break;
		}
	}
	/**
	* Retrieves a specific source by its external identifier.
	*
	* **Data Transformation:**
	* - Constructs a resource name (e.g., `sources/github/owner/repo`) from the input filter.
	*
	* @param filter Filter criteria (currently supports GitHub repo name).
	* @returns The matching Source object, or `undefined` if not found (404).
	* @throws {Error} If the filter format is invalid.
	*/
	async get(filter) {
		const { github } = filter;
		if (!github || !github.includes("/")) throw new Error("Invalid GitHub filter. Expected format: 'owner/repo'.");
		const resourceName = `sources/github/${github}`;
		try {
			const rawSource = await this.apiClient.request(resourceName);
			if (!rawSource) return;
			return mapRawSourceToSdkSource(rawSource);
		} catch (error) {
			if (error instanceof JulesApiError && error.status === 404) return;
			throw error;
		}
	}
};
function createSourceManager(apiClient) {
	const manager = new SourceManagerImpl(apiClient);
	const sourceManager = manager.list.bind(manager);
	sourceManager.get = manager.get.bind(manager);
	return sourceManager;
}
function isWritable(dir) {
	try {
		accessSync(dir, constants.W_OK);
		return true;
	} catch {
		return false;
	}
}
function getRootDir() {
	const julesHome = process.env.JULES_HOME;
	if (julesHome && isWritable(julesHome)) return julesHome;
	const cwd = process.cwd();
	if (existsSync(path.join(cwd, "package.json")) && cwd !== "/" && isWritable(cwd)) return cwd;
	const home = process.env.HOME;
	if (home && home !== "/" && isWritable(home)) return home;
	const osHome = homedir();
	if (osHome && osHome !== "/" && isWritable(osHome)) return osHome;
	return process.env.TMPDIR || process.env.TMP || "/tmp";
}
function parseUnidiff(patch) {
	if (!patch) return [];
	const files = [];
	const diffSections = patch.split(/^diff --git /m).filter(Boolean);
	for (const section of diffSections) {
		const lines = section.split("\n");
		let path2 = "";
		let fromPath = "";
		let toPath = "";
		for (const line of lines) if (line.startsWith("--- ")) fromPath = line.slice(4).replace(/^a\//, "").replace(/^\/dev\/null$/, "");
		else if (line.startsWith("+++ ")) toPath = line.slice(4).replace(/^b\//, "").replace(/^\/dev\/null$/, "");
		let changeType;
		if (fromPath === "" || lines.some((l) => l.startsWith("--- /dev/null"))) {
			changeType = "created";
			path2 = toPath;
		} else if (toPath === "" || lines.some((l) => l.startsWith("+++ /dev/null"))) {
			changeType = "deleted";
			path2 = fromPath;
		} else {
			changeType = "modified";
			path2 = toPath;
		}
		if (!path2) continue;
		let additions = 0;
		let deletions = 0;
		let inHunk = false;
		for (const line of lines) {
			if (line.startsWith("@@")) {
				inHunk = true;
				continue;
			}
			if (inHunk) {
				if (line.startsWith("+") && !line.startsWith("+++")) additions++;
				else if (line.startsWith("-") && !line.startsWith("---")) deletions++;
			}
		}
		files.push({
			path: path2,
			changeType,
			additions,
			deletions
		});
	}
	return files;
}
function parseUnidiffWithContent(patch) {
	if (!patch) return [];
	const files = [];
	const diffSections = patch.split(/^diff --git /m).filter(Boolean);
	for (const section of diffSections) {
		const lines = section.split("\n");
		let path2 = "";
		let fromPath = "";
		let toPath = "";
		for (const line of lines) if (line.startsWith("--- ")) fromPath = line.slice(4).replace(/^a\//, "").replace(/^\/dev\/null$/, "");
		else if (line.startsWith("+++ ")) toPath = line.slice(4).replace(/^b\//, "").replace(/^\/dev\/null$/, "");
		let changeType;
		if (fromPath === "" || lines.some((l) => l.startsWith("--- /dev/null"))) {
			changeType = "created";
			path2 = toPath;
		} else if (toPath === "" || lines.some((l) => l.startsWith("+++ /dev/null"))) {
			changeType = "deleted";
			path2 = fromPath;
		} else {
			changeType = "modified";
			path2 = toPath;
		}
		if (!path2) continue;
		let additions = 0;
		let deletions = 0;
		let inHunk = false;
		const contentLines = [];
		for (const line of lines) {
			if (line.startsWith("@@")) {
				inHunk = true;
				continue;
			}
			if (inHunk) {
				if (line.startsWith("+") && !line.startsWith("+++")) {
					additions++;
					contentLines.push(line.slice(1));
				} else if (line.startsWith("-") && !line.startsWith("---")) deletions++;
			}
		}
		const content = changeType === "deleted" ? "" : contentLines.join("\n");
		files.push({
			path: path2,
			changeType,
			content,
			additions,
			deletions
		});
	}
	return files;
}
function createGeneratedFiles(files) {
	return {
		all: () => files,
		get: (path2) => files.find((f) => f.path === path2),
		filter: (changeType) => files.filter((f) => f.changeType === changeType)
	};
}
var MediaArtifact = class {
	type = "media";
	data;
	format;
	platform;
	activityId;
	constructor(artifact, platform, activityId) {
		this.data = artifact.data;
		this.format = artifact.mimeType;
		this.platform = platform;
		this.activityId = activityId;
	}
	/**
	* Saves the media artifact to a file.
	*
	* **Side Effects:**
	* - Node.js: Writes the file to disk (overwrites if exists).
	* - Browser: Saves the file to the 'artifacts' object store in IndexedDB.
	*
	* @param filepath The path where the file should be saved.
	*/
	async save(filepath) {
		await this.platform.saveFile(filepath, this.data, "base64", this.activityId);
	}
	/**
	* Converts the media artifact to a data URL.
	* Useful for displaying images in a browser.
	*
	* **Data Transformation:**
	* - Prefixes the base64 data with `data:<mimeType>;base64,`.
	*
	* @returns A valid Data URI string.
	*/
	toUrl() {
		return this.platform.createDataUrl(this.data, this.format);
	}
};
var BashArtifact = class {
	type = "bashOutput";
	command;
	stdout;
	stderr;
	exitCode;
	constructor(artifact) {
		this.command = artifact.command;
		this.stdout = artifact.output;
		this.stderr = "";
		this.exitCode = artifact.exitCode;
	}
	/**
	* Formats the bash output as a string, mimicking a terminal session.
	*
	* **Data Transformation:**
	* - Combines `stdout` and `stderr`.
	* - Formats the command with a `$` prompt.
	* - Appends the exit code.
	*/
	toString() {
		const output = [this.stdout, this.stderr].filter(Boolean).join("");
		return `${`$ ${this.command}`}
${output ? `${output}
` : ""}${`[exit code: ${this.exitCode ?? "N/A"}]`}`;
	}
};
var ChangeSetArtifact = class {
	type = "changeSet";
	source;
	gitPatch;
	constructor(source, gitPatch) {
		this.source = source;
		this.gitPatch = gitPatch;
	}
	/**
	* Parses the unified diff and returns structured file change information.
	*
	* **Data Transformation:**
	* - Extracts file paths from diff headers.
	* - Determines change type (created/modified/deleted) from /dev/null markers.
	* - Counts additions (+) and deletions (-) in hunks.
	*
	* @returns Parsed diff with file paths, change types, and line counts.
	*/
	parsed() {
		if (!this.gitPatch?.unidiffPatch) return {
			files: [],
			summary: {
				totalFiles: 0,
				created: 0,
				modified: 0,
				deleted: 0
			}
		};
		const files = parseUnidiff(this.gitPatch.unidiffPatch);
		return {
			files,
			summary: {
				totalFiles: files.length,
				created: files.filter((f) => f.changeType === "created").length,
				modified: files.filter((f) => f.changeType === "modified").length,
				deleted: files.filter((f) => f.changeType === "deleted").length
			}
		};
	}
};
function mapRestArtifactToSdkArtifact(restArtifact, platform, activityId) {
	if ("changeSet" in restArtifact) return new ChangeSetArtifact(restArtifact.changeSet.source, restArtifact.changeSet.gitPatch);
	if ("media" in restArtifact) return new MediaArtifact(restArtifact.media, platform, activityId);
	if ("bashOutput" in restArtifact) return new BashArtifact(restArtifact.bashOutput);
	throw new Error(`Unknown artifact type: ${JSON.stringify(restArtifact)}`);
}
function mapRestActivityToSdkActivity(restActivity, platform) {
	const { name, createTime, originator, artifacts: rawArtifacts, description } = restActivity;
	const activityId = name.split("/").pop();
	const artifacts = (rawArtifacts || []).map((artifact) => mapRestArtifactToSdkArtifact(artifact, platform, activityId));
	const baseActivity = {
		name,
		id: activityId,
		description,
		createTime,
		originator: originator || "system",
		artifacts
	};
	if (restActivity.agentMessaged) return {
		...baseActivity,
		type: "agentMessaged",
		message: restActivity.agentMessaged.agentMessage
	};
	if (restActivity.userMessaged) return {
		...baseActivity,
		type: "userMessaged",
		message: restActivity.userMessaged.userMessage
	};
	if (restActivity.planGenerated) return {
		...baseActivity,
		type: "planGenerated",
		plan: restActivity.planGenerated.plan
	};
	if (restActivity.planApproved) return {
		...baseActivity,
		type: "planApproved",
		planId: restActivity.planApproved.planId
	};
	if (restActivity.progressUpdated) return {
		...baseActivity,
		type: "progressUpdated",
		title: restActivity.progressUpdated.title,
		description: restActivity.progressUpdated.description
	};
	if (restActivity.sessionCompleted) return {
		...baseActivity,
		type: "sessionCompleted"
	};
	if (restActivity.sessionFailed) return {
		...baseActivity,
		type: "sessionFailed",
		reason: restActivity.sessionFailed.reason
	};
	throw new Error("Unknown activity type");
}
function mapRestStateToSdkState(state) {
	switch (state) {
		case "STATE_UNSPECIFIED": return "unspecified";
		case "QUEUED": return "queued";
		case "PLANNING": return "planning";
		case "AWAITING_PLAN_APPROVAL": return "awaitingPlanApproval";
		case "AWAITING_USER_FEEDBACK": return "awaitingUserFeedback";
		case "IN_PROGRESS": return "inProgress";
		case "PAUSED": return "paused";
		case "FAILED": return "failed";
		case "COMPLETED": return "completed";
		default: return "unspecified";
	}
}
function mapRestSourceToSdkSource(rest) {
	if (rest.githubRepo) {
		const { defaultBranch, branches, ...other } = rest.githubRepo;
		return {
			type: "githubRepo",
			name: rest.name,
			id: rest.id,
			githubRepo: {
				...other,
				defaultBranch: defaultBranch?.displayName,
				branches: branches?.map((b) => b.displayName)
			}
		};
	}
	throw new Error(`Unknown source type: ${JSON.stringify(rest)}`);
}
function mapRestOutputToSdkOutput(rest) {
	if (rest.pullRequest) return {
		type: "pullRequest",
		pullRequest: rest.pullRequest
	};
	if (rest.changeSet) return {
		type: "changeSet",
		changeSet: rest.changeSet
	};
	throw new Error(`Unknown output type: ${JSON.stringify(rest)}`);
}
function mapRestSessionToSdkSession(rest, platform) {
	const session = {
		...rest,
		archived: rest.archived ?? false,
		state: mapRestStateToSdkState(rest.state),
		requirePlanApproval: rest.requirePlanApproval,
		automationMode: rest.automationMode,
		outputs: (rest.outputs || []).map(mapRestOutputToSdkOutput),
		source: rest.source ? mapRestSourceToSdkSource(rest.source) : void 0,
		generatedFiles: rest.generatedFiles,
		activities: void 0,
		outcome: void 0
	};
	if (rest.activities && platform) session.activities = rest.activities.map((a) => mapRestActivityToSdkActivity(a, platform));
	try {
		session.outcome = mapSessionResourceToOutcome(session);
	} catch (error) {
		if (error instanceof AutomatedSessionFailedError) session.outcome = {
			sessionId: session.id,
			title: session.title,
			state: "failed",
			outputs: session.outputs,
			generatedFiles: () => createGeneratedFiles([]),
			changeSet: () => void 0
		};
		else throw error;
	}
	return session;
}
function mapSessionResourceToOutcome(session) {
	if (session.state === "failed") throw new AutomatedSessionFailedError(`Session ${session.id} failed.`);
	const outputs = session.outputs ?? [];
	const prOutput = outputs.find((o) => "pullRequest" in o);
	const pullRequest = prOutput ? prOutput.pullRequest : void 0;
	const changeSetOutput = outputs.find((o) => "changeSet" in o);
	const changeSet = changeSetOutput ? changeSetOutput.changeSet : void 0;
	return {
		sessionId: session.id,
		title: session.title,
		state: "completed",
		pullRequest,
		outputs,
		generatedFiles: () => {
			if (!changeSet?.gitPatch?.unidiffPatch) return createGeneratedFiles([]);
			return createGeneratedFiles(parseUnidiffWithContent(changeSet.gitPatch.unidiffPatch));
		},
		changeSet: () => {
			if (!changeSet?.gitPatch) return;
			return new ChangeSetArtifact("session", changeSet.gitPatch);
		}
	};
}
var sleep$1 = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
var DEFAULT_INITIAL_RETRIES = 10;
var MAX_RETRY_DELAY_MS = 3e4;
async function* streamActivities(sessionId, apiClient, pollingInterval, platform, options = {}) {
	let pageToken = void 0;
	let isFirstCall = true;
	let lastSeenTime = "";
	const seenIdsAtLastTime = /* @__PURE__ */ new Set();
	while (true) {
		let response;
		try {
			response = await apiClient.request(`sessions/${sessionId}/activities`, { query: {
				pageSize: "50",
				...pageToken ? { pageToken } : {}
			} });
		} catch (error) {
			if (isFirstCall && error instanceof JulesApiError && error.status === 404) {
				let lastError = error;
				let successfulResponse;
				let delay = 1e3;
				const maxRetries = options.initialRetries ?? DEFAULT_INITIAL_RETRIES;
				for (let i = 0; i < maxRetries; i++) {
					await sleep$1(delay);
					delay = Math.min(delay * 2, MAX_RETRY_DELAY_MS);
					try {
						successfulResponse = await apiClient.request(`sessions/${sessionId}/activities`, { query: {
							pageSize: "50",
							...pageToken ? { pageToken } : {}
						} });
						break;
					} catch (retryError) {
						if (retryError instanceof JulesApiError && retryError.status === 404) lastError = retryError;
						else throw retryError;
					}
				}
				if (successfulResponse) response = successfulResponse;
				else throw lastError;
			} else throw error;
		}
		isFirstCall = false;
		const activities = response.activities || [];
		for (const rawActivity of activities) {
			const activity = mapRestActivityToSdkActivity(rawActivity, platform);
			if (activity.createTime < lastSeenTime) continue;
			if (activity.createTime === lastSeenTime) {
				if (seenIdsAtLastTime.has(activity.id)) continue;
				seenIdsAtLastTime.add(activity.id);
			} else {
				lastSeenTime = activity.createTime;
				seenIdsAtLastTime.clear();
				seenIdsAtLastTime.add(activity.id);
			}
			if (options.exclude?.originator && activity.originator === options.exclude.originator) continue;
			yield activity;
		}
		if (response.nextPageToken) {
			pageToken = response.nextPageToken;
			continue;
		} else {
			pageToken = void 0;
			await sleep$1(pollingInterval);
		}
	}
}
var sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
async function pollSession(sessionId, apiClient, predicateFn, pollingInterval, platform, timeoutMs) {
	const startTime = Date.now();
	while (true) {
		const session = mapRestSessionToSdkSession(await apiClient.request(`sessions/${sessionId}`), platform);
		if (predicateFn(session)) return session;
		if (timeoutMs && Date.now() - startTime >= timeoutMs) throw new TimeoutError(`Polling for session ${sessionId} timed out after ${timeoutMs}ms`);
		await sleep(pollingInterval);
	}
}
async function pollUntilCompletion(sessionId, apiClient, pollingInterval, platform, timeoutMs) {
	return pollSession(sessionId, apiClient, (session) => {
		const state = session.state;
		return state === "completed" || state === "failed";
	}, pollingInterval, platform, timeoutMs);
}
function isSessionFrozen(lastActivityCreateTime, thresholdDays = 30) {
	const lastActivity = new Date(lastActivityCreateTime);
	return ((/* @__PURE__ */ new Date()).getTime() - lastActivity.getTime()) / (1e3 * 60 * 60 * 24) > thresholdDays;
}
function createTimeFilter(createTime) {
	return `create_time>"${createTime}"`;
}
var DefaultActivityClient = class {
	constructor(storage, network, platform) {
		this.storage = storage;
		this.network = network;
		this.platform = platform;
	}
	/**
	* Re-hydrates plain artifact objects from storage into rich class instances.
	* JSON serialization loses class information (methods), so we need to restore it.
	*
	* **Behavior:**
	* - Iterates through artifacts in an activity.
	* - If an artifact is a plain object (not a class instance), it's re-instantiated.
	* - Handles backward compatibility: if an artifact is already a class instance, it's skipped.
	*
	* @param activity The activity from storage, potentially with plain artifacts.
	* @returns The same activity with its artifacts guaranteed to be class instances.
	*/
	_hydrateActivityArtifacts(activity) {
		if (!activity.artifacts || activity.artifacts.length === 0) return activity;
		const hydratedArtifacts = activity.artifacts.map((artifact) => {
			if (artifact instanceof MediaArtifact) return artifact;
			if (artifact instanceof BashArtifact) return artifact;
			if (artifact instanceof ChangeSetArtifact) return artifact;
			switch (artifact.type) {
				case "changeSet":
					const rawChangeSet = artifact.changeSet || artifact;
					return new ChangeSetArtifact(rawChangeSet.source, rawChangeSet.gitPatch);
				case "bashOutput": return new BashArtifact(artifact.bashOutput || artifact);
				case "media": return new MediaArtifact(artifact.media || artifact, this.platform, activity.id);
				default: return artifact;
			}
		});
		return {
			...activity,
			artifacts: hydratedArtifacts
		};
	}
	/**
	* Returns an async iterable of all activities.
	*
	* **Behavior:**
	* - Always syncs new activities from the network first (via hydrate).
	* - Then yields all activities from local storage.
	*
	* This ensures callers always get the complete, up-to-date history
	* rather than potentially stale cached data.
	*/
	async *history() {
		await this.hydrate();
		for await (const activity of this.storage.scan()) yield this._hydrateActivityArtifacts(activity);
	}
	/**
	* Syncs new activities from the network to local cache.
	*
	* **Optimization Strategy:**
	* Activities are immutable - once downloaded, they never change.
	* We use the Jules API's pageToken (nanosecond timestamp) to fetch
	* only activities newer than our latest cached one.
	*
	* **Behavior:**
	* - Empty cache: Fetches all activities (no pageToken)
	* - Has cached activities: Constructs pageToken from latest createTime,
	*   fetches only newer activities
	* - Frozen session (> 30 days): Skips API call entirely
	*
	* @returns The number of new activities synced.
	*/
	async hydrate() {
		await this.storage.init();
		const latest = await this.storage.latest();
		if (latest?.createTime && isSessionFrozen(latest.createTime)) return 0;
		const filter = latest?.createTime ? createTimeFilter(latest.createTime) : void 0;
		let count = 0;
		let nextPageToken;
		do {
			const response = await this.network.listActivities({
				filter,
				pageToken: nextPageToken
			});
			const existingChecks = await Promise.all(response.activities.map((activity) => this.storage.get(activity.id)));
			for (let i = 0; i < response.activities.length; i++) {
				const activity = response.activities[i];
				if (existingChecks[i]) continue;
				await this.storage.append(activity);
				count++;
			}
			nextPageToken = response.nextPageToken;
		} while (nextPageToken);
		return count;
	}
	/**
	* Returns an async iterable of new activities from the network.
	* This method polls the network and updates the local storage.
	*
	* **Side Effects:**
	* - Polls the network continuously.
	* - Appends new activities to local storage (write-through caching).
	*
	* **Logic:**
	* - Reads the latest activity from storage to determine the "high-water mark".
	* - Ignores incoming activities older than or equal to the high-water mark.
	*/
	async *updates() {
		await this.storage.init();
		const latest = await this.storage.latest();
		let highWaterMark = latest?.createTime ? new Date(latest.createTime).getTime() : 0;
		let lastSeenId = latest?.id;
		for await (const activity of this.network.rawStream()) {
			const actTime = new Date(activity.createTime).getTime();
			if (actTime < highWaterMark) continue;
			if (actTime === highWaterMark && activity.id === lastSeenId) continue;
			await this.storage.append(activity);
			highWaterMark = actTime;
			lastSeenId = activity.id;
			yield activity;
		}
	}
	/**
	* Returns a combined stream of history and updates.
	* This is the primary method for consuming the activity stream.
	*
	* **Behavior:**
	* 1. Yields all historical activities from local storage (offline capable).
	* 2. Switches to `updates()` to yield new activities from the network (real-time).
	*/
	async *stream() {
		yield* this.history();
		yield* this.updates();
	}
	/**
	* Queries local storage for activities matching the given options.
	*/
	async select(options = {}) {
		await this.storage.init();
		const results = [];
		let started = !options.after;
		let count = 0;
		for await (const act of this.storage.scan()) {
			if (!started) {
				if (act.id === options.after) started = true;
				continue;
			}
			if (options.before && act.id === options.before) break;
			if (options.type && act.type !== options.type) continue;
			results.push(this._hydrateActivityArtifacts(act));
			count++;
			if (options.limit && count >= options.limit) break;
		}
		return results;
	}
	/**
	* Lists activities from the network directly.
	* @param options Pagination options.
	*/
	async list(options) {
		return this.network.listActivities(options);
	}
	/**
	* Gets a single activity by ID.
	* Implements a "read-through" caching strategy.
	*
	* **Logic:**
	* 1. Checks local storage. If found, returns it immediately (fast).
	* 2. If missing, fetches from the network.
	* 3. Persists the fetched activity to storage (future reads will hit cache).
	* 4. Returns the activity.
	*
	* **Side Effects:**
	* - May perform a network request.
	* - May write to local storage.
	*/
	async get(activityId) {
		await this.storage.init();
		const cached = await this.storage.get(activityId);
		if (cached) return this._hydrateActivityArtifacts(cached);
		const fresh = await this.network.fetchActivity(activityId);
		await this.storage.append(fresh);
		return fresh;
	}
};
var NetworkAdapter = class {
	constructor(apiClient, sessionId, pollingIntervalMs = 5e3, platform) {
		this.apiClient = apiClient;
		this.sessionId = sessionId;
		this.pollingIntervalMs = pollingIntervalMs;
		this.platform = platform;
	}
	/**
	* Fetches a single activity from the API.
	*/
	async fetchActivity(activityId) {
		return mapRestActivityToSdkActivity(await this.apiClient.request(`sessions/${this.sessionId}/activities/${activityId}`), this.platform);
	}
	/**
	* Lists activities from the API with pagination.
	*/
	async listActivities(options) {
		const params = {};
		if (options?.pageSize) params.pageSize = options.pageSize.toString();
		if (options?.pageToken) params.pageToken = options.pageToken;
		if (options?.filter) params.filter = options.filter;
		const response = await this.apiClient.request(`sessions/${this.sessionId}/activities`, { query: params });
		return {
			activities: (response.activities || []).map((activity) => mapRestActivityToSdkActivity(activity, this.platform)),
			nextPageToken: response.nextPageToken
		};
	}
	/**
	* Polls the API for new activities and yields them.
	* This stream never ends unless the process is terminated.
	*/
	async *rawStream() {
		while (true) {
			let pageToken = void 0;
			do {
				const response = await this.listActivities({ pageToken });
				for (const activity of response.activities) yield activity;
				pageToken = response.nextPageToken;
			} while (pageToken);
			await this.platform.sleep(this.pollingIntervalMs);
		}
	}
};
var ONE_MONTH_MS = 720 * 60 * 60 * 1e3;
var ONE_DAY_MS = 1440 * 60 * 1e3;
function determineCacheTier(cached, now = Date.now()) {
	const age = now - new Date(cached.resource.createTime).getTime();
	const isTerminal = ["failed", "completed"].includes(cached.resource.state);
	if (age > ONE_MONTH_MS) return "frozen";
	const timeSinceSync = now - cached._lastSyncedAt;
	if (isTerminal && timeSinceSync < ONE_DAY_MS) return "warm";
	return "hot";
}
function isCacheValid(cached, now = Date.now()) {
	if (!cached) return false;
	const tier = determineCacheTier(cached, now);
	return tier === "frozen" || tier === "warm";
}
var SessionSnapshotImpl = class {
	id;
	state;
	url;
	createdAt;
	updatedAt;
	durationMs;
	prompt;
	title;
	pr;
	activities;
	activityCounts;
	timeline;
	insights;
	generatedFiles;
	changeSet;
	constructor(options) {
		const { session, activities = [] } = options.data;
		this.id = session.id;
		this.state = session.state;
		this.url = session.url;
		this.createdAt = new Date(session.createTime);
		this.updatedAt = new Date(session.updateTime);
		this.durationMs = this.updatedAt.getTime() - this.createdAt.getTime();
		this.prompt = session.prompt;
		this.title = session.title;
		if (session.outcome) {
			this.pr = session.outcome.pullRequest;
			this.generatedFiles = session.outcome.generatedFiles();
			this.changeSet = typeof session.outcome.changeSet === "function" ? session.outcome.changeSet : () => void 0;
		} else {
			const prOutput = session.outputs?.find((o) => o.type === "pullRequest");
			this.pr = prOutput?.pullRequest;
			this.generatedFiles = {
				all: () => [],
				get: () => void 0,
				filter: () => []
			};
			this.changeSet = () => void 0;
		}
		this.activities = Object.freeze(activities);
		this.activityCounts = this.computeActivityCounts();
		this.timeline = this.computeTimeline();
		this.insights = this.computeInsights();
		Object.freeze(this);
	}
	computeActivityCounts() {
		const counts = {};
		for (const activity of this.activities) counts[activity.type] = (counts[activity.type] || 0) + 1;
		return counts;
	}
	computeTimeline() {
		return this.activities.map((activity) => ({
			time: activity.createTime,
			type: activity.type,
			summary: this.generateSummary(activity)
		}));
	}
	generateSummary(activity) {
		switch (activity.type) {
			case "planGenerated": return `Plan with ${activity.plan.steps.length} steps`;
			case "planApproved": return "Plan approved";
			case "sessionCompleted": return "Session completed";
			case "sessionFailed": return `Failed: ${activity.reason}`;
			case "userMessaged": {
				const msg = activity.message;
				return `User: ${msg.substring(0, 100)}${msg.length > 100 ? "..." : ""}`;
			}
			case "agentMessaged": {
				const msg = activity.message;
				return `Agent: ${msg.substring(0, 100)}${msg.length > 100 ? "..." : ""}`;
			}
			case "progressUpdated": {
				const progress = activity;
				return progress.title || progress.description || "Progress update";
			}
			default: return activity.type;
		}
	}
	computeInsights() {
		const failedCommands = this.activities.filter((activity) => activity.artifacts.some((artifact) => {
			if (artifact.type === "bashOutput") return artifact.exitCode !== 0;
			return false;
		}));
		return {
			completionAttempts: this.activityCounts["sessionCompleted"] || 0,
			planRegenerations: this.activityCounts["planGenerated"] || 0,
			userInterventions: this.activityCounts["userMessaged"] || 0,
			failedCommands
		};
	}
	toJSON(options = { exclude: ["activities", "generatedFiles"] }) {
		const full = {
			id: this.id,
			state: this.state,
			url: this.url,
			createdAt: this.createdAt.toISOString(),
			updatedAt: this.updatedAt.toISOString(),
			durationMs: this.durationMs,
			prompt: this.prompt,
			title: this.title,
			activities: this.activities,
			activityCounts: this.activityCounts,
			timeline: this.timeline,
			generatedFiles: this.generatedFiles.all(),
			insights: {
				completionAttempts: this.insights.completionAttempts,
				planRegenerations: this.insights.planRegenerations,
				userInterventions: this.insights.userInterventions,
				failedCommandCount: this.insights.failedCommands.length
			},
			pr: this.pr
		};
		if (options?.include) return Object.fromEntries(options.include.filter((key) => key in full).map((key) => [key, full[key]]));
		if (options?.exclude) {
			const result = { ...full };
			for (const key of options.exclude) delete result[key];
			return result;
		}
		return full;
	}
	toMarkdown() {
		const lines = [];
		lines.push(`# Session: ${this.title}`);
		lines.push(`**Status**: \`${this.state}\` | **ID**: \`${this.id}\``);
		lines.push("");
		lines.push("## Overview");
		lines.push(`- **Duration**: ${Math.round(this.durationMs / 1e3)}s`);
		lines.push(`- **Total Activities**: ${this.activities.length}`);
		if (this.pr) lines.push(`- **Pull Request**: [${this.pr.title}](${this.pr.url})`);
		if (this.generatedFiles.all().length > 0) {
			lines.push(`- **Generated Files**: ${this.generatedFiles.all().length}`);
			for (const file of this.generatedFiles.all()) {
				lines.push(`  - ${file.path}`);
				lines.push(`  - Type: ${file.changeType}`);
				lines.push(`  - Additions: ${file.additions}`);
				lines.push(`  - Deletions: ${file.deletions}`);
			}
		}
		lines.push("");
		lines.push("## Insights");
		lines.push(`- **Completion Attempts**: ${this.insights.completionAttempts}`);
		lines.push(`- **Plan Regenerations**: ${this.insights.planRegenerations}`);
		lines.push(`- **User Interventions**: ${this.insights.userInterventions}`);
		lines.push(`- **Failed Commands**: ${this.insights.failedCommands.length}`);
		lines.push("");
		lines.push("## Timeline");
		if (this.timeline.length === 0) lines.push("_No activities recorded._");
		else for (const entry of this.timeline) lines.push(`- **[${entry.type}]** ${entry.summary} _(${entry.time})_`);
		lines.push("");
		if (Object.keys(this.activityCounts).length > 0) {
			lines.push("## Activity Counts");
			lines.push("```");
			for (const [type, count] of Object.entries(this.activityCounts)) lines.push(`${type.padEnd(20)}: ${count}`);
			lines.push("```");
		}
		return lines.join("\n");
	}
};
async function collectAsync(iterable) {
	const items = [];
	for await (const item of iterable) items.push(item);
	return items;
}
var SessionClientImpl = class {
	id;
	apiClient;
	config;
	sessionStorage;
	_activities;
	platform;
	/**
	* Creates a new instance of SessionClientImpl.
	*
	* @param sessionId The ID of the session.
	* @param apiClient The API client to use for network requests.
	* @param config The configuration options.
	* @param activityStorage The storage engine for activities.
	* @param sessionStorage The storage engine for sessions.
	* @param platform The platform adapter.
	*/
	constructor(sessionId, apiClient, config, activityStorage, sessionStorage, platform) {
		this.id = sessionId.replace(/^sessions\//, "");
		this.apiClient = apiClient;
		this.config = config;
		this.sessionStorage = sessionStorage;
		this.platform = platform;
		const network = new NetworkAdapter(this.apiClient, this.id, this.config.pollingIntervalMs, platform);
		this._activities = new DefaultActivityClient(activityStorage, network, platform);
	}
	async request(path2, options = {}) {
		return this.apiClient.request(path2, options);
	}
	/**
	* COLD STREAM: Yields all known past activities from local storage.
	* If local cache is empty, fetches from network first.
	*/
	history() {
		return this._activities.history();
	}
	/**
	* Forces a full sync of activities from the network to local cache.
	* @returns The number of new activities synced.
	*/
	hydrate() {
		return this._activities.hydrate();
	}
	/**
	* HOT STREAM: Yields ONLY future activities as they arrive from the network.
	*/
	updates() {
		return this._activities.updates();
	}
	/**
	* LOCAL QUERY: Performs rich filtering against local storage only.
	*
	* @deprecated Use `session.activities.select()` instead.
	*/
	select(options) {
		return this._activities.select(options);
	}
	/**
	* Scoped access to activity-specific operations.
	*/
	get activities() {
		return this._activities;
	}
	/**
	* Provides a real-time stream of activities for the session.
	*
	* @param options Options to control the stream.
	*/
	async *stream(options = {}) {
		for await (const activity of this._activities.stream()) {
			if (options.exclude?.originator && activity.originator === options.exclude.originator) continue;
			yield activity;
		}
	}
	/**
	* Approves the currently pending plan.
	* Only valid if the session state is `awaitingPlanApproval`.
	*
	* **Side Effects:**
	* - Sends a POST request to `sessions/{id}:approvePlan`.
	* - Transitions the session state from `awaitingPlanApproval` to `inProgress` (eventually).
	*
	* @throws {InvalidStateError} If the session is not in the `awaitingPlanApproval` state.
	*
	* @example
	* await session.waitFor('awaitingPlanApproval');
	* await session.approve();
	*/
	async approve() {
		await this.request(`sessions/${this.id}:approvePlan`, {
			method: "POST",
			body: {}
		});
	}
	/**
	* Sends a message (prompt) to the agent in the context of the current session.
	* This is a fire-and-forget operation. To see the response, use `stream()` or `ask()`.
	*
	* **Side Effects:**
	* - Sends a POST request to `sessions/{id}:sendMessage`.
	* - Appends a new `userMessaged` activity to the session history.
	*
	* @param prompt The message to send.
	*
	* @example
	* await session.send("Please clarify step 2.");
	*/
	async send(prompt) {
		await this.request(`sessions/${this.id}:sendMessage`, {
			method: "POST",
			body: { prompt }
		});
	}
	/**
	* Sends a message to the agent and waits specifically for the agent's immediate reply.
	* This provides a convenient request/response flow for conversational interactions.
	*
	* **Behavior:**
	* - Sends the prompt using `send()`.
	* - Subscribes to the activity stream.
	* - Resolves with the first `agentMessaged` activity that appears *after* the prompt was sent.
	*
	* @param prompt The message to send.
	* @returns The agent's reply activity.
	* @throws {JulesError} If the session terminates before the agent replies.
	*
	* @example
	* const reply = await session.ask("What is the status?");
	* console.log(reply.message);
	*/
	async ask(prompt) {
		const startTime = /* @__PURE__ */ new Date();
		await this.send(prompt);
		for await (const activity of this.stream({ exclude: { originator: "user" } })) {
			if (new Date(activity.createTime).getTime() <= startTime.getTime()) continue;
			if (activity.type === "agentMessaged") return activity;
			if (activity.type === "sessionCompleted" || activity.type === "sessionFailed") throw new JulesError("Session ended before the agent replied.");
		}
		throw new JulesError("Session ended before the agent replied.");
	}
	/**
	* Waits for the session to reach a terminal state and returns the result.
	*
	* **Behavior:**
	* - Polls the session API until state is 'completed' or 'failed'.
	* - Maps the final session resource to a friendly `Outcome` object.
	*
	* @param options Optional configuration for the operation.
	* @param options.timeoutMs Maximum time in milliseconds to wait for the session to complete.
	* @returns The final outcome of the session.
	* @throws {AutomatedSessionFailedError} If the session ends in a 'failed' state.
	* @throws {TimeoutError} If the operation times out.
	*/
	async result(options) {
		const finalSession = await pollUntilCompletion(this.id, this.apiClient, this.config.pollingIntervalMs, this.platform, options?.timeoutMs);
		await this.sessionStorage.upsert(finalSession);
		return mapSessionResourceToOutcome(finalSession);
	}
	/**
	* Pauses execution and waits until the session reaches a specific state.
	* Also returns if the session reaches a terminal state ('completed' or 'failed')
	* to prevent infinite waiting.
	*
	* **Behavior:**
	* - Polls the session API at the configured interval.
	* - Resolves immediately if the session is already in the target state (or terminal).
	*
	* @param targetState The target state to wait for.
	* @param options Optional configuration for the operation.
	* @param options.timeoutMs Maximum time in milliseconds to wait for the state.
	* @throws {TimeoutError} If the operation times out.
	*
	* @example
	* await session.waitFor('awaitingPlanApproval');
	*/
	async waitFor(targetState, options) {
		await pollSession(this.id, this.apiClient, (session) => {
			const state = session.state;
			return state === targetState || state === "completed" || state === "failed";
		}, this.config.pollingIntervalMs, this.platform, options?.timeoutMs);
	}
	/**
	* Archives the session.
	* This removes the session from the default list view and marks it as archived.
	* Archived sessions can still be accessed by ID or by filtering for `archived = true`.
	*
	* **Side Effects:**
	* - Sends a POST request to `sessions/{id}:archive`.
	* - Updates the local cache to mark the session as archived.
	*/
	async archive() {
		await this.request(`sessions/${this.id}:archive`, {
			method: "POST",
			body: {}
		});
		const cached = await this.sessionStorage.get(this.id);
		if (cached) {
			const resource = {
				...cached.resource,
				archived: true
			};
			await this.sessionStorage.upsert(resource);
		}
	}
	/**
	* Unarchives the session.
	* This restores the session to the default list view.
	*
	* **Side Effects:**
	* - Sends a POST request to `sessions/{id}:unarchive`.
	* - Updates the local cache to mark the session as not archived.
	*/
	async unarchive() {
		await this.request(`sessions/${this.id}:unarchive`, {
			method: "POST",
			body: {}
		});
		const cached = await this.sessionStorage.get(this.id);
		if (cached) {
			const resource = {
				...cached.resource,
				archived: false
			};
			await this.sessionStorage.upsert(resource);
		}
	}
	/**
	* Retrieves the latest state of the underlying session resource.
	* Implements "Iceberg" Read-Through caching.
	*/
	async info() {
		let resource;
		const cached = await this.sessionStorage.get(this.id);
		if (isCacheValid(cached)) resource = cached.resource;
		else try {
			resource = mapRestSessionToSdkSession(await this.request(`sessions/${this.id}`), this.platform);
			await this.sessionStorage.upsert(resource);
		} catch (e) {
			if (e.status === 404 && cached) await this.sessionStorage.delete(this.id);
			throw e;
		}
		resource.outcome = mapSessionResourceToOutcome(resource);
		return resource;
	}
	/**
	* Creates a point-in-time snapshot of the session.
	* This is a network operation that fetches the latest session info and all activities.
	*
	* @param options Optional configuration for the snapshot.
	* @param options.activities If true, includes all activities in the snapshot. Defaults to true.
	* @returns A `SessionSnapshot` instance.
	*/
	async snapshot(options) {
		const includeActivities = options?.activities ?? true;
		const [info, activities] = await Promise.all([this.info(), includeActivities ? collectAsync(this.history()) : Promise.resolve([])]);
		return new SessionSnapshotImpl({ data: {
			session: info,
			activities: activities ?? []
		} });
	}
};
async function pMap(items, mapper, options = {}) {
	const concurrency = options.concurrency ?? 3;
	const stopOnError = options.stopOnError ?? true;
	const delayMs = options.delayMs ?? 0;
	const results = new Array(items.length);
	const errors = new Array();
	let nextIndex = 0;
	const workers = new Array(concurrency).fill(0).map(async () => {
		while (true) {
			const index = nextIndex++;
			if (index >= items.length) break;
			const item = items[index];
			if (delayMs > 0) await new Promise((resolve) => setTimeout(resolve, delayMs));
			try {
				results[index] = await mapper(item, index);
			} catch (err) {
				if (stopOnError) throw err;
				errors.push(err);
			}
		}
	});
	await Promise.all(workers);
	if (!stopOnError && errors.length > 0) throw new AggregateError(errors, "Multiple errors occurred during jules.all()");
	return results;
}
var SessionCursor = class {
	constructor(apiClient, storage, platform, options = {}) {
		this.apiClient = apiClient;
		this.storage = storage;
		this.platform = platform;
		this.options = options;
	}
	/**
	* DX Feature: Promise Compatibility.
	* Allows `const page = await jules.sessions()` to just get the first page.
	* This is great for UIs that render a list and a "Load More" button.
	*/
	then(onfulfilled, onrejected) {
		return this.fetchPage(this.options.pageToken).then(onfulfilled, onrejected);
	}
	/**
	* DX Feature: Async Iterator.
	* Allows `for await (const s of jules.sessions())` to stream ALL items.
	* Automatically handles page tokens and fetching behind the scenes.
	*/
	async *[Symbol.asyncIterator]() {
		let currentToken = this.options.pageToken;
		let itemCount = 0;
		const limit = this.options.limit ?? Infinity;
		do {
			if (itemCount >= limit) break;
			const response = await this.fetchPage(currentToken);
			if (!response.sessions || response.sessions.length === 0) break;
			for (const session of response.sessions) {
				if (itemCount >= limit) break;
				yield session;
				itemCount++;
			}
			currentToken = response.nextPageToken;
		} while (currentToken);
	}
	/**
	* Helper to fetch all pages into a single array.
	* WARNING: Use with caution on large datasets.
	*/
	async all() {
		const results = [];
		for await (const session of this) results.push(session);
		return results;
	}
	/**
	* Internal fetcher that maps the options to the REST parameters.
	*/
	async fetchPage(pageToken) {
		const params = {};
		if (this.options.pageSize) params.pageSize = this.options.pageSize.toString();
		if (pageToken) params.pageToken = pageToken;
		if (this.options.filter) params.filter = this.options.filter;
		const response = await this.apiClient.request("sessions", { query: params });
		const sessions = (response.sessions || []).map((s) => mapRestSessionToSdkSession(s, this.platform));
		if (sessions.length > 0 && this.options.persist !== false) await this.storage.upsertMany(sessions);
		return {
			sessions,
			nextPageToken: response.nextPageToken
		};
	}
};
var GLOBAL_METADATA_FILE = "global-metadata.json";
async function updateGlobalCacheMetadata(rootDirOverride) {
	const rootDir = getRootDir();
	const cacheDir = path$1.join(rootDir, ".jules/cache");
	const metadataPath = path$1.join(cacheDir, GLOBAL_METADATA_FILE);
	let metadata = {
		lastSyncedAt: 0,
		sessionCount: 0
	};
	try {
		const content = await fs$1.readFile(metadataPath, "utf8");
		metadata = JSON.parse(content);
	} catch {}
	metadata.lastSyncedAt = Date.now();
	try {
		const entries = await fs$1.readdir(cacheDir, { withFileTypes: true });
		metadata.sessionCount = entries.filter((e) => e.isDirectory()).length;
	} catch {
		metadata.sessionCount = 0;
	}
	await fs$1.mkdir(cacheDir, { recursive: true });
	await fs$1.writeFile(metadataPath, JSON.stringify(metadata), "utf8");
}
function parseSelectExpression(expr) {
	if (expr === "*") return {
		path: [],
		exclude: false,
		wildcard: true
	};
	const exclude = expr.startsWith("-");
	return {
		path: (exclude ? expr.slice(1) : expr).replace(/\[\]/g, "").split(".").filter((p) => p.length > 0),
		exclude,
		wildcard: false
	};
}
function getPath(obj, path2) {
	if (path2.length === 0) return obj;
	if (obj === null || obj === void 0) return void 0;
	const [head, ...tail] = path2;
	if (Array.isArray(obj)) {
		const results = obj.map((item) => getPath(item, path2)).filter((v) => v !== void 0);
		return results.length > 0 ? results : void 0;
	}
	if (typeof obj === "object") {
		const value = obj[head];
		return getPath(value, tail);
	}
}
function setPath(obj, path2, value) {
	if (path2.length === 0 || value === void 0) return;
	const [head, ...tail] = path2;
	if (tail.length === 0) {
		obj[head] = value;
		return;
	}
	if (!(head in obj)) obj[head] = {};
	const next = obj[head];
	if (typeof next === "object" && next !== null && !Array.isArray(next)) setPath(next, tail, value);
}
function deletePath(obj, path2) {
	if (path2.length === 0 || obj === null || obj === void 0) return;
	if (Array.isArray(obj)) {
		obj.forEach((item) => deletePath(item, path2));
		return;
	}
	if (typeof obj !== "object") return;
	const record = obj;
	const [head, ...tail] = path2;
	if (tail.length === 0) {
		delete record[head];
		return;
	}
	if (head in record) deletePath(record[head], tail);
}
function deepClone(obj) {
	if (obj === null || typeof obj !== "object") return obj;
	if (Array.isArray(obj)) return obj.map((item) => deepClone(item));
	const cloned = {};
	for (const key of Object.keys(obj)) cloned[key] = deepClone(obj[key]);
	return cloned;
}
function projectArray(arr, subPaths, excludePaths) {
	return arr.map((item) => {
		if (item === null || typeof item !== "object") return item;
		const projected = {};
		for (const subPath of subPaths) {
			const value = getPath(item, subPath);
			if (value !== void 0) if (subPath.length === 0) Object.assign(projected, deepClone(item));
			else setPath(projected, subPath, deepClone(value));
		}
		for (const excludePath of excludePaths) deletePath(projected, excludePath);
		return projected;
	});
}
function projectDocument(doc, selects) {
	if (!selects || selects.length === 0) return doc;
	const parsed = selects.map(parseSelectExpression);
	const hasWildcard = parsed.some((p) => p.wildcard && !p.exclude);
	const inclusions = parsed.filter((p) => !p.exclude && !p.wildcard);
	const exclusions = parsed.filter((p) => p.exclude);
	let result;
	if (hasWildcard) result = deepClone(doc);
	else {
		result = {};
		const byTopLevel = /* @__PURE__ */ new Map();
		for (const incl of inclusions) {
			if (incl.path.length === 0) continue;
			const top = incl.path[0];
			if (!byTopLevel.has(top)) byTopLevel.set(top, []);
			byTopLevel.get(top).push(incl.path.slice(1));
		}
		for (const [topField, subPaths] of byTopLevel) {
			const value = doc[topField];
			if (value === void 0) continue;
			if (Array.isArray(value)) {
				const exclusionSubPaths = exclusions.filter((e) => e.path[0] === topField).map((e) => e.path.slice(1));
				if (subPaths.some((p) => p.length === 0)) result[topField] = projectArray(value, [[]], exclusionSubPaths);
				else result[topField] = projectArray(value, subPaths, exclusionSubPaths);
			} else if (typeof value === "object" && value !== null) if (subPaths.some((p) => p.length === 0)) result[topField] = deepClone(value);
			else {
				const nestedSelects = subPaths.map((p) => p.join("."));
				result[topField] = projectDocument(value, nestedSelects);
			}
			else result[topField] = value;
		}
	}
	for (const excl of exclusions) deletePath(result, excl.path);
	return result;
}
var MAX_SUMMARY_LENGTH = 200;
function toSummary(activity) {
	const { id, type, createTime } = activity;
	let summary = type;
	switch (activity.type) {
		case "agentMessaged":
		case "userMessaged": {
			const message = activity.message;
			if (!message || message.length === 0) summary = type;
			else if (message.length > MAX_SUMMARY_LENGTH) summary = message.substring(0, MAX_SUMMARY_LENGTH) + "...";
			else summary = message;
			break;
		}
		case "progressUpdated": {
			const progress = activity;
			if (progress.title && progress.description) summary = `${progress.title}: ${progress.description}`;
			else if (progress.title) summary = progress.title;
			else if (progress.description) summary = progress.description;
			break;
		}
		case "planGenerated":
			summary = `Plan generated with ${activity.plan?.steps?.length ?? 0} steps`;
			break;
		case "planApproved":
			summary = "Plan approved";
			break;
		case "sessionCompleted":
			summary = "Session completed";
			break;
		case "sessionFailed": {
			const failed = activity;
			summary = failed.reason ? `Session failed: ${failed.reason}` : "Session failed";
			break;
		}
	}
	return {
		id,
		type,
		createTime,
		summary
	};
}
function computeArtifactCount(activity) {
	return activity.artifacts?.length ?? 0;
}
function computeSummary(activity) {
	return toSummary(activity).summary;
}
function computeDurationMs(session) {
	if (!session.createTime || !session.updateTime) return 0;
	const created = new Date(session.createTime).getTime();
	const updated = new Date(session.updateTime).getTime();
	if (isNaN(created) || isNaN(updated)) return 0;
	return Math.max(0, updated - created);
}
function injectActivityComputedFields(activity, selectFields) {
	const result = { ...activity };
	const includeAll = !selectFields || selectFields.length === 0 || selectFields.includes("*");
	const needsArtifactCount = includeAll || selectFields?.includes("artifactCount");
	const needsSummary = includeAll || selectFields?.includes("summary");
	if (needsArtifactCount) result.artifactCount = computeArtifactCount(activity);
	if (needsSummary) result.summary = computeSummary(activity);
	return result;
}
function injectSessionComputedFields(session, selectFields) {
	const result = { ...session };
	if (!selectFields || selectFields.length === 0 || selectFields.includes("*") || selectFields?.includes("durationMs")) result.durationMs = computeDurationMs(session);
	return result;
}
var DEFAULT_ACTIVITY_PROJECTION = [
	"id",
	"type",
	"createTime",
	"originator",
	"artifactCount",
	"summary"
];
var DEFAULT_SESSION_PROJECTION = [
	"id",
	"state",
	"title",
	"createTime"
];
function match(actual, filter) {
	if (filter === void 0) return true;
	if (typeof filter !== "object" || filter === null || Array.isArray(filter)) return actual === filter;
	const op = filter;
	if (op.exists !== void 0) {
		const valueExists = actual !== void 0 && actual !== null;
		return op.exists ? valueExists : !valueExists;
	}
	if (op.eq !== void 0 && actual !== op.eq) return false;
	if (op.neq !== void 0 && actual === op.neq) return false;
	if (op.contains !== void 0 && typeof actual === "string" && !actual.toLowerCase().includes(op.contains.toLowerCase())) return false;
	if (op.gt !== void 0 && op.gt !== null && actual <= op.gt) return false;
	if (op.gte !== void 0 && op.gte !== null && actual < op.gte) return false;
	if (op.lt !== void 0 && op.lt !== null && actual >= op.lt) return false;
	if (op.lte !== void 0 && op.lte !== null && actual > op.lte) return false;
	if (op.in !== void 0 && !op.in.includes(actual)) return false;
	return true;
}
function isDotPath(key) {
	return key.includes(".");
}
function matchPath(doc, path2, filter) {
	const value = getPath(doc, path2.split("."));
	if (Array.isArray(value)) return value.some((v) => match(v, filter));
	return match(value, filter);
}
function matchWhere(doc, where) {
	if (!where) return true;
	for (const [key, filter] of Object.entries(where)) if (isDotPath(key)) {
		if (!matchPath(doc, key, filter)) return false;
	} else {
		const value = doc[key];
		if (!match(value, filter)) return false;
	}
	return true;
}
function toActivitySelectOptions(where) {
	if (!where) return {};
	const options = {};
	if (where.type) {
		if (typeof where.type === "string") options.type = where.type;
		else if (typeof where.type === "object" && "eq" in where.type && where.type.eq) options.type = where.type.eq;
	}
	return options;
}
function applyProjection(doc, select2, domain) {
	const withComputed = domain === "activities" ? injectActivityComputedFields(doc, select2) : injectSessionComputedFields(doc, select2);
	if (!select2) return projectDocument(withComputed, domain === "activities" ? DEFAULT_ACTIVITY_PROJECTION : DEFAULT_SESSION_PROJECTION);
	if (select2.length === 0) return withComputed;
	return projectDocument(withComputed, select2);
}
async function select(client, query) {
	const storage = client.storage;
	const results = [];
	const limit = query.limit ?? Infinity;
	if (query.from === "sessions") {
		const where = query.where;
		const whereRecord = where;
		const dotFilters = whereRecord ? Object.entries(whereRecord).filter(([k]) => isDotPath(k)) : [];
		const dotWhere = dotFilters.length > 0 ? Object.fromEntries(dotFilters) : void 0;
		let chunk = [];
		const CHUNK_SIZE = 50;
		const processChunk = async () => {
			if (chunk.length === 0) return;
			const hydrated = await pMap(chunk, async (entry) => {
				return {
					entry,
					cached: await storage.get(entry.id)
				};
			}, { concurrency: 10 });
			for (const { cached } of hydrated) {
				if (results.length >= limit) break;
				if (!cached) continue;
				if (dotWhere && !matchWhere(cached.resource, dotWhere)) continue;
				const item = applyProjection(cached.resource, query.select, "sessions");
				const resourceRecord = cached.resource;
				item._sortKey = {
					createTime: resourceRecord.createTime,
					id: resourceRecord.id
				};
				results.push(item);
			}
			chunk = [];
		};
		for await (const entry of storage.scanIndex()) {
			if (results.length >= limit) break;
			if (where?.id && !match(entry.id, where.id)) continue;
			if (where?.state && !match(entry.state, where.state)) continue;
			if (where?.title && !match(entry.title, where.title)) continue;
			if (where?.search && !entry.title.toLowerCase().includes(where.search.toLowerCase())) continue;
			chunk.push(entry);
			if (chunk.length >= CHUNK_SIZE || !dotWhere && chunk.length >= limit - results.length) await processChunk();
		}
		await processChunk();
		if (query.include && "activities" in query.include) {
			const actConfig = query.include.activities;
			let mappedOptions = {};
			if (typeof actConfig === "object") mappedOptions = {
				...toActivitySelectOptions(actConfig.where),
				limit: actConfig.limit
			};
			await pMap(results, async (session) => {
				const localActivities = await (await client.session(session.id)).activities.select({});
				const activities = [];
				for (const act of localActivities) {
					if (mappedOptions.limit && activities.length >= mappedOptions.limit) break;
					if (mappedOptions.type && act.type !== mappedOptions.type) continue;
					activities.push(act);
				}
				session.activities = activities;
			}, { concurrency: 5 });
		}
	} else if (query.from === "activities") {
		const where = query.where;
		let targetSessionIds = [];
		if (where?.sessionId) {
			if (typeof where.sessionId === "string") targetSessionIds = [where.sessionId];
			else if (typeof where.sessionId === "object" && "eq" in where.sessionId && where.sessionId.eq) targetSessionIds = [where.sessionId.eq];
		}
		const sessionCache = /* @__PURE__ */ new Map();
		const sessionScanner = async function* () {
			if (targetSessionIds.length > 0) for (const id of targetSessionIds) yield { id };
			else yield* storage.scanIndex();
		};
		const sessionEntries = [];
		for await (const sessionEntry of sessionScanner()) sessionEntries.push(sessionEntry);
		const sessionResults = await pMap(sessionEntries, async (sessionEntry) => {
			const sessionClient = await client.session(sessionEntry.id);
			const localActivities = await sessionClient.activities.select({});
			const filtered = [];
			for (const act of localActivities) {
				if (where?.id && !match(act.id, where.id)) continue;
				if (where?.type && !match(act.type, where.type)) continue;
				if (!matchWhere(act, where ? Object.fromEntries(Object.entries(where).filter(([k]) => k !== "sessionId")) : void 0)) continue;
				const item = applyProjection(act, query.select, "activities");
				const actRecord = act;
				item._sortKey = {
					createTime: actRecord.createTime,
					id: actRecord.id
				};
				if (query.include && "session" in query.include) {
					const sessConfig = query.include.session;
					const sessSelect = typeof sessConfig === "object" ? sessConfig.select : void 0;
					let sessionInfo = sessionCache.get(sessionEntry.id);
					if (!sessionInfo) {
						sessionInfo = await sessionClient.info();
						sessionCache.set(sessionEntry.id, sessionInfo);
					}
					item.session = applyProjection(sessionInfo, sessSelect, "sessions");
				}
				filtered.push(item);
			}
			return filtered;
		}, { concurrency: 5 });
		for (const res of sessionResults) results.push(...res);
	}
	const order = query.order ?? "desc";
	results.sort((a, b) => {
		const sortKeyA = a._sortKey;
		const sortKeyB = b._sortKey;
		const timeA = new Date(sortKeyA?.createTime ?? a.createTime).getTime();
		const timeB = new Date(sortKeyB?.createTime ?? b.createTime).getTime();
		const idA = sortKeyA?.id ?? a.id;
		const idB = sortKeyB?.id ?? b.id;
		if (timeA !== timeB) return order === "desc" ? timeB - timeA : timeA - timeB;
		if (order === "desc") return idB.localeCompare(idA);
		return idA.localeCompare(idB);
	});
	let finalResults = results;
	const cursorId = query.startAfter ?? query.startAt;
	if (cursorId) {
		const cursorIndex = finalResults.findIndex((item) => {
			return (item._sortKey?.id ?? item.id) === cursorId;
		});
		if (cursorIndex === -1) return [];
		const sliceIndex = query.startAfter ? cursorIndex + 1 : cursorIndex;
		finalResults = finalResults.slice(sliceIndex);
	}
	for (const result of finalResults) delete result._sortKey;
	return finalResults.slice(0, limit);
}
var JulesClientImpl = class JulesClientImpl {
	/**
	* Manages source connections (e.g., GitHub repositories).
	*/
	sources;
	storage;
	apiClient;
	config;
	options;
	storageFactory;
	platform;
	/**
	* Lock to prevent concurrent sync operations.
	* Using a simple boolean for in-process locking.
	*/
	syncInProgress = false;
	/**
	* Creates a new instance of the JulesClient.
	*
	* @param options Configuration options for the client.
	* @param defaultStorageFactory Factory for creating storage instances.
	* @param defaultPlatform Platform-specific implementation.
	*/
	constructor(options = {}, defaultStorageFactory2, defaultPlatform2) {
		this.options = options;
		this.storageFactory = options.storageFactory ?? defaultStorageFactory2;
		this.platform = options.platform ?? defaultPlatform2;
		this.storage = this.storageFactory.session();
		const apiKey = options.apiKey_TEST_ONLY_DO_NOT_USE_IN_PRODUCTION ?? options.apiKey ?? this.platform.getEnv("JULES_API_KEY");
		const baseUrl = options.baseUrl ?? "https://jules.googleapis.com/v1alpha";
		this.config = {
			pollingIntervalMs: options.config?.pollingIntervalMs ?? 5e3,
			requestTimeoutMs: options.config?.requestTimeoutMs ?? 3e4
		};
		this.apiClient = new ApiClient({
			apiKey,
			baseUrl,
			requestTimeoutMs: this.config.requestTimeoutMs,
			rateLimitRetry: options.config?.rateLimitRetry
		});
		this.sources = createSourceManager(this.apiClient);
	}
	/**
	* Fluent API for rich local querying across sessions and activities.
	* This method uses the modular query engine internally.
	*/
	async select(query) {
		return select(this, query);
	}
	/**
	* Synchronizes local state with the server.
	* Logic:
	* 1. Find High-Water Mark (newest local record).
	* 2. Stream latest sessions from API.
	* 3. Terminate stream early if 'incremental' and High-Water Mark is hit.
	* 4. Throttled hydration of activities if depth is 'activities'.
	*/
	async sync(options = {}) {
		if (this.syncInProgress) throw new SyncInProgressError();
		this.syncInProgress = true;
		try {
			const startTime = Date.now();
			const { sessionId, limit = 100, depth = "metadata", incremental = true, concurrency = 3, onProgress, checkpoint: useCheckpoint = false, signal } = options;
			let wasAborted = false;
			const candidates = [];
			let activitiesIngested = 0;
			let sessionsIngestedThisRun = 0;
			if (sessionId) {
				const session = mapRestSessionToSdkSession(await this.apiClient.request(`sessions/${sessionId}`), this.platform);
				await this.storage.upsert(session);
				candidates.push(session);
				sessionsIngestedThisRun = 1;
			} else {
				let resumeFromId = null;
				let startingCount = 0;
				if (useCheckpoint) {
					const ckpt = await this.loadCheckpoint();
					if (ckpt) {
						resumeFromId = ckpt.lastProcessedSessionId;
						startingCount = ckpt.sessionsProcessed;
					}
				}
				let skipUntilPast = !!resumeFromId;
				const highWaterMark = incremental ? await this._getHighWaterMark() : null;
				const cursor = this.sessions({
					pageSize: Math.min(limit, 100),
					persist: false
				});
				onProgress?.({
					phase: "fetching_list",
					current: 0
				});
				for await (const session of cursor) {
					if (signal?.aborted) {
						wasAborted = true;
						break;
					}
					if (skipUntilPast) {
						if (session.id === resumeFromId) {
							skipUntilPast = false;
							continue;
						}
						continue;
					}
					if (highWaterMark && new Date(session.createTime) <= highWaterMark) {
						if (depth === "activities") {
							await this.storage.upsert(session);
							candidates.push(session);
						}
						break;
					}
					await this.storage.upsert(session);
					candidates.push(session);
					sessionsIngestedThisRun++;
					if (useCheckpoint) await this.saveCheckpoint({
						lastProcessedSessionId: session.id,
						sessionsProcessed: startingCount + sessionsIngestedThisRun,
						startedAt: new Date(startTime).toISOString()
					});
					onProgress?.({
						phase: "fetching_list",
						current: sessionsIngestedThisRun,
						lastIngestedId: session.id
					});
					if (candidates.length >= limit) break;
				}
			}
			if (depth === "activities" && candidates.length > 0 && !wasAborted) {
				let hydratedCount = 0;
				onProgress?.({
					phase: "hydrating_records",
					current: 0,
					total: candidates.length
				});
				await pMap(candidates, async (session) => {
					if (signal?.aborted) return;
					const count = await this.session(session.id).activities.hydrate();
					activitiesIngested += count;
					hydratedCount++;
					onProgress?.({
						phase: "hydrating_records",
						current: hydratedCount,
						total: candidates.length,
						lastIngestedId: session.id,
						activityCount: count
					});
				}, { concurrency });
			}
			if (useCheckpoint && !wasAborted && !sessionId) await this.clearCheckpoint();
			const stats = {
				sessionsIngested: sessionsIngestedThisRun,
				activitiesIngested,
				isComplete: !wasAborted,
				durationMs: Date.now() - startTime
			};
			await updateGlobalCacheMetadata();
			return stats;
		} finally {
			this.syncInProgress = false;
		}
	}
	getCheckpointPath() {
		return join(getRootDir(), ".jules", "cache", "sync-checkpoint.json");
	}
	async loadCheckpoint() {
		if (!this.platform.readFile) return null;
		try {
			const path2 = this.getCheckpointPath();
			const data = await this.platform.readFile(path2);
			return JSON.parse(data);
		} catch {
			return null;
		}
	}
	async saveCheckpoint(checkpoint) {
		if (!this.platform.writeFile) return;
		const path2 = this.getCheckpointPath();
		await this.platform.writeFile(path2, JSON.stringify(checkpoint, null, 2));
	}
	async clearCheckpoint() {
		if (!this.platform.deleteFile) return;
		try {
			const path2 = this.getCheckpointPath();
			await this.platform.deleteFile(path2);
		} catch {}
	}
	async _getHighWaterMark() {
		let newest = null;
		for await (const entry of this.storage.scanIndex()) {
			const date = new Date(entry.createTime);
			if (!newest || date > newest) newest = date;
		}
		return newest;
	}
	/**
	* Helper to resolve environment variables with support for frontend prefixes.
	*/
	getEnv(key) {
		return this.platform.getEnv(`NEXT_PUBLIC_${key}`) || this.platform.getEnv(`REACT_APP_${key}`) || this.platform.getEnv(`VITE_${key}`) || this.platform.getEnv(key);
	}
	/**
	* Creates a new Jules client instance with updated configuration.
	* This is an immutable operation; the original client instance remains unchanged.
	*
	* @param options The new configuration options to merge with the existing ones.
	* @returns A new JulesClient instance with the updated configuration.
	*/
	with(options) {
		return new JulesClientImpl({
			...this.options,
			...options,
			config: {
				...this.options.config,
				...options.config
			}
		}, this.storageFactory, this.platform);
	}
	/**
	* Connects to the Jules service with the provided configuration.
	* Acts as a factory method for creating a new client instance.
	*
	* @param options Configuration options for the client.
	* @returns A new JulesClient instance.
	*/
	connect(options) {
		return new JulesClientImpl({
			...this.options,
			...options
		}, this.storageFactory, this.platform);
	}
	/**
	* Retrieves a session resource using the "Iceberg" caching strategy.
	* * - **Tier 3 (Frozen):** > 30 days old. Returns from cache immediately.
	* - **Tier 2 (Warm):** Terminal state + Verified < 24h ago. Returns from cache.
	* - **Tier 1 (Hot):** Active or Stale. Fetches from network, updates cache, returns.
	*/
	async getSessionResource(id) {
		const cached = await this.storage.get(id);
		if (isCacheValid(cached)) return cached.resource;
		try {
			const fresh = mapRestSessionToSdkSession(await this.apiClient.request(`sessions/${id}`), this.platform);
			await this.storage.upsert(fresh);
			return fresh;
		} catch (e) {
			if (e.status === 404 && cached) await this.storage.delete(id);
			throw e;
		}
	}
	/**
	* Lists sessions with a fluent, pagination-friendly API.
	* @param options Configuration for pagination (pageSize, limit, pageToken)
	* @returns A SessionCursor that can be awaited (first page) or iterated (all pages).
	*/
	sessions(options) {
		return new SessionCursor(this.apiClient, this.storage, this.platform, options);
	}
	async all(items, mapper, options) {
		return pMap(items, async (item) => {
			const config = await mapper(item);
			return this.run(config);
		}, options);
	}
	async _prepareSessionCreation(config) {
		if (!config.source) return {
			prompt: config.prompt,
			title: config.title
		};
		const source = await this.sources.get({ github: config.source.github });
		if (!source) throw new SourceNotFoundError(config.source.github);
		return {
			prompt: config.prompt,
			title: config.title,
			sourceContext: {
				source: source.name,
				githubRepoContext: { startingBranch: config.source.baseBranch }
			}
		};
	}
	/**
	* Executes a task in automated mode.
	* This is a high-level abstraction for "fire-and-forget" tasks.
	*
	* **Side Effects:**
	* - Creates a new session on the Jules API (`POST /sessions`).
	* - Initiates background polling for activity updates.
	* - May create a Pull Request if `autoPr` is true (default).
	*
	* **Data Transformation:**
	* - Resolves the `github` source identifier (e.g., `owner/repo`) to a full resource name.
	* - Defaults `requirePlanApproval` to `false` for automated runs.
	*
	* @param config The configuration for the run.
	* @returns A `AutomatedSession` object, which is an enhanced Promise that resolves to the final outcome.
	* @throws {SourceNotFoundError} If the specified GitHub repository cannot be found or accessed.
	* @throws {JulesApiError} If the session creation fails (e.g., 401 Unauthorized).
	*
	* @example
	* const run = await jules.run({
	*   prompt: "Fix the login bug",
	*   source: { github: "my-org/repo", baseBranch: "main" }
	* });
	* const outcome = await run.result();
	*/
	async run(config) {
		const body = await this._prepareSessionCreation(config);
		const sessionResource = mapRestSessionToSdkSession(await this.apiClient.request("sessions", {
			method: "POST",
			body: {
				...body,
				automationMode: config.autoPr === false ? "AUTOMATION_MODE_UNSPECIFIED" : "AUTO_CREATE_PR",
				requirePlanApproval: config.requireApproval ?? false
			}
		}), this.platform);
		await this.storage.upsert(sessionResource);
		const sessionId = sessionResource.id;
		return {
			id: sessionId,
			stream: (async function* () {
				yield* streamActivities(sessionId, this.apiClient, this.config.pollingIntervalMs, this.platform);
			}).bind(this),
			result: async () => {
				const finalSession = await pollUntilCompletion(sessionId, this.apiClient, this.config.pollingIntervalMs, this.platform);
				await this.storage.upsert(finalSession);
				return mapSessionResourceToOutcome(finalSession);
			}
		};
	}
	session(configOrId) {
		if (typeof configOrId === "string") {
			const storage = this.storageFactory.activity(configOrId);
			return new SessionClientImpl(configOrId, this.apiClient, this.config, storage, this.storage, this.platform);
		}
		const config = configOrId;
		return (async () => {
			const body = await this._prepareSessionCreation(config);
			const session = mapRestSessionToSdkSession(await this.apiClient.request("sessions", {
				method: "POST",
				body: {
					...body,
					automationMode: config.autoPr === false ? "AUTOMATION_MODE_UNSPECIFIED" : "AUTO_CREATE_PR",
					requirePlanApproval: config.requireApproval ?? true
				}
			}), this.platform);
			await this.storage.upsert(session);
			const activityStorage = this.storageFactory.activity(session.id);
			return new SessionClientImpl(session.name, this.apiClient, this.config, activityStorage, this.storage, this.platform);
		})();
	}
};
var NodeFileStorage = class {
	filePath;
	metadataPath;
	initialized = false;
	writeStream = null;
	index = /* @__PURE__ */ new Map();
	indexBuilt = false;
	indexBuildPromise = null;
	currentFileSize = 0;
	constructor(sessionId, rootDir) {
		const sessionCacheDir = path$1.resolve(rootDir, ".jules/cache", sessionId);
		this.filePath = path$1.join(sessionCacheDir, "activities.jsonl");
		this.metadataPath = path$1.join(sessionCacheDir, "metadata.json");
	}
	/**
	* Initializes the storage by ensuring the cache directory exists.
	*
	* **Side Effects:**
	* - Creates the `.jules/cache/<sessionId>` directory if it does not exist.
	* - Sets the internal `initialized` flag.
	*/
	async init() {
		if (this.initialized) return;
		await fs$1.mkdir(path$1.dirname(this.filePath), { recursive: true });
		try {
			const stats = await fs$1.stat(this.filePath);
			this.currentFileSize = stats.size;
		} catch (e) {
			if (e.code === "ENOENT") this.currentFileSize = 0;
			else throw e;
		}
		this.writeStream = createWriteStream(this.filePath, {
			flags: "a",
			encoding: "utf8"
		});
		this.writeStream.on("error", (err) => {
			console.error(`[NodeFileStorage] WriteStream error for ${this.filePath}:`, err);
		});
		this.initialized = true;
	}
	/**
	* Closes the storage.
	*/
	async close() {
		if (this.writeStream) {
			await new Promise((resolve) => this.writeStream.end(resolve));
			this.writeStream = null;
		}
		this.initialized = false;
		this.indexBuilt = false;
		this.index.clear();
		this.indexBuildPromise = null;
	}
	async _readMetadata() {
		try {
			const content = await fs$1.readFile(this.metadataPath, "utf8");
			return JSON.parse(content);
		} catch (e) {
			if (e.code === "ENOENT") return { activityCount: 0 };
			throw e;
		}
	}
	async _writeMetadata(metadata) {
		await fs$1.writeFile(this.metadataPath, JSON.stringify(metadata, null, 2), "utf8");
	}
	/**
	* Appends an activity to the file.
	*
	* **Side Effects:**
	* - Appends a new line containing the JSON representation of the activity to `activities.jsonl`.
	* - Implicitly calls `init()` if not already initialized.
	*/
	async append(activity) {
		if (!this.initialized) await this.init();
		const metadata = await this._readMetadata();
		metadata.activityCount += 1;
		await this._writeMetadata(metadata);
		const line = JSON.stringify(activity) + "\n";
		const startOffset = this.currentFileSize;
		if (this.writeStream) {
			const canContinue = this.writeStream.write(line);
			this.currentFileSize += Buffer.byteLength(line);
			if (this.indexBuilt || this.indexBuildPromise) {
				if (!this.index.has(activity.id)) this.index.set(activity.id, startOffset);
			}
			if (!canContinue) await new Promise((resolve) => this.writeStream.once("drain", resolve));
		} else throw new Error("NodeFileStorage: WriteStream is not initialized");
	}
	/**
	* Builds the in-memory index by scanning the file once.
	* Handles concurrency by coalescing multiple calls into a single promise.
	*/
	async buildIndex() {
		if (this.indexBuilt) return;
		if (this.indexBuildPromise) return this.indexBuildPromise;
		this.indexBuildPromise = (async () => {
			try {
				this.index.clear();
				try {
					await fs$1.access(this.filePath);
				} catch (e) {
					this.indexBuilt = true;
					return;
				}
				const fileStream = createReadStream(this.filePath, { encoding: "utf8" });
				const rl = readline.createInterface({
					input: fileStream,
					crlfDelay: Infinity
				});
				let currentOffset = 0;
				for await (const line of rl) {
					const lineTotalBytes = Buffer.byteLength(line) + 1;
					if (line.trim().length > 0) try {
						const activity = JSON.parse(line);
						if (!this.index.has(activity.id)) this.index.set(activity.id, currentOffset);
					} catch (e) {}
					currentOffset += lineTotalBytes;
				}
				this.indexBuilt = true;
			} finally {
				this.indexBuildPromise = null;
			}
		})();
		return this.indexBuildPromise;
	}
	/**
	* Retrieves an activity by ID.
	* Uses an in-memory index (ID -> Offset) to seek directly to the line.
	*/
	async get(activityId) {
		if (!this.initialized) await this.init();
		if (!this.indexBuilt) await this.buildIndex();
		const offset = this.index.get(activityId);
		if (offset === void 0) return void 0;
		return new Promise((resolve, reject) => {
			const stream = createReadStream(this.filePath, {
				start: offset,
				encoding: "utf8"
			});
			const rl = readline.createInterface({
				input: stream,
				crlfDelay: Infinity
			});
			let found = false;
			rl.on("line", (line) => {
				if (found) return;
				found = true;
				rl.close();
				stream.destroy();
				try {
					resolve(JSON.parse(line));
				} catch (e) {
					resolve(void 0);
				}
			});
			rl.on("error", (err) => {
				reject(err);
			});
			stream.on("error", (err) => {
				reject(err);
			});
			rl.on("close", () => {
				if (!found) resolve(void 0);
			});
		});
	}
	/**
	* Retrieves the latest activity.
	* Efficiently reads the file backwards to find the last valid entry.
	*/
	async latest() {
		if (!this.initialized) await this.init();
		try {
			await fs$1.access(this.filePath);
		} catch (e) {
			if (e.code === "ENOENT") return;
			throw e;
		}
		const fileSize = (await fs$1.stat(this.filePath)).size;
		if (fileSize === 0) return void 0;
		const bufferSize = 4096;
		const buffer = Buffer.alloc(bufferSize);
		let fd;
		try {
			fd = await fs$1.open(this.filePath, "r");
			let currentPos = fileSize;
			let trailing = "";
			while (currentPos > 0) {
				const readSize = Math.min(bufferSize, currentPos);
				const position = currentPos - readSize;
				const lines = ((await fd.read(buffer, 0, readSize, position)).buffer.toString("utf8", 0, readSize) + trailing).split("\n");
				if (position > 0) trailing = lines.shift() || "";
				else trailing = "";
				for (let i = lines.length - 1; i >= 0; i--) {
					const line = lines[i].trim();
					if (line.length === 0) continue;
					try {
						return JSON.parse(line);
					} catch (e) {
						console.warn(`[NodeFileStorage] Corrupt JSON line ignored during latest() check in ${this.filePath}`);
					}
				}
				currentPos -= readSize;
			}
		} finally {
			if (fd) await fd.close();
		}
	}
	/**
	* Yields all activities in the file.
	*
	* **Behavior:**
	* - Opens a read stream to `activities.jsonl`.
	* - Reads line-by-line using `readline`.
	* - Parses each line as JSON.
	*
	* **Edge Cases:**
	* - Logs a warning and skips lines if JSON parsing fails (corrupt data).
	* - Returns immediately (yields nothing) if the file does not exist.
	*/
	async *scan() {
		if (!this.initialized) await this.init();
		try {
			await fs$1.access(this.filePath);
		} catch (e) {
			if (e.code === "ENOENT") return;
			throw e;
		}
		const fileStream = createReadStream(this.filePath, { encoding: "utf8" });
		const rl = readline.createInterface({
			input: fileStream,
			crlfDelay: Infinity
		});
		for await (const line of rl) {
			if (line.trim().length === 0) continue;
			try {
				yield JSON.parse(line);
			} catch (e) {
				console.warn(`[NodeFileStorage] Corrupt JSON line ignored in ${this.filePath}`);
			}
		}
	}
};
var NodeSessionStorage = class {
	cacheDir;
	indexFilePath;
	initialized = false;
	constructor(rootDir) {
		this.cacheDir = path$1.resolve(rootDir, ".jules/cache");
		this.indexFilePath = path$1.join(this.cacheDir, "sessions.jsonl");
	}
	async init() {
		if (this.initialized) return;
		await fs$1.mkdir(this.cacheDir, { recursive: true });
		this.initialized = true;
	}
	getSessionPath(sessionId) {
		return path$1.join(this.cacheDir, sessionId, "session.json");
	}
	async upsert(session) {
		await this.init();
		const sessionDir = path$1.join(this.cacheDir, session.id);
		await fs$1.mkdir(sessionDir, { recursive: true });
		const cached = {
			resource: session,
			_lastSyncedAt: Date.now()
		};
		await fs$1.writeFile(path$1.join(sessionDir, "session.json"), JSON.stringify(cached, null, 2), "utf8");
		const indexEntry = {
			id: session.id,
			title: session.title,
			state: session.state,
			createTime: session.createTime,
			source: session.sourceContext?.source || "unknown",
			_updatedAt: Date.now()
		};
		await fs$1.appendFile(this.indexFilePath, JSON.stringify(indexEntry) + "\n", "utf8");
	}
	async upsertMany(sessions) {
		await Promise.all(sessions.map((s) => this.upsert(s)));
	}
	async get(sessionId) {
		await this.init();
		try {
			const data = await fs$1.readFile(this.getSessionPath(sessionId), "utf8");
			return JSON.parse(data);
		} catch (e) {
			if (e.code === "ENOENT") return void 0;
			throw e;
		}
	}
	async delete(sessionId) {
		await this.init();
		const sessionDir = path$1.join(this.cacheDir, sessionId);
		await fs$1.rm(sessionDir, {
			recursive: true,
			force: true
		});
	}
	async *scanIndex() {
		await this.init();
		try {
			const fileStream = createReadStream(this.indexFilePath, { encoding: "utf8" });
			const rl = readline.createInterface({
				input: fileStream,
				crlfDelay: Infinity
			});
			const entries = /* @__PURE__ */ new Map();
			for await (const line of rl) {
				if (!line.trim()) continue;
				try {
					const entry = JSON.parse(line);
					entries.set(entry.id, entry);
				} catch (e) {}
			}
			for (const entry of entries.values()) yield entry;
		} catch (e) {
			if (e.code === "ENOENT") return;
			throw e;
		}
	}
};
var NodePlatform = class {
	/**
	* Saves a file to the local filesystem using `node:fs/promises`.
	*
	* **Side Effects:**
	* - Writes a file to disk.
	* - Overwrites the file if it already exists.
	*/
	async saveFile(filepath, data, encoding, activityId) {
		await writeFile(filepath, Buffer$1.from(data, encoding));
	}
	async sleep(ms) {
		await setTimeout$1(ms);
	}
	createDataUrl(data, mimeType) {
		return `data:${mimeType};base64,${data}`;
	}
	async fetch(input, init) {
		const res = await global.fetch(input, init);
		return {
			ok: res.ok,
			status: res.status,
			json: () => res.json(),
			text: () => res.text()
		};
	}
	crypto = {
		randomUUID: () => crypto.randomUUID(),
		async sign(text, secret) {
			const hmac = crypto.createHmac("sha256", secret);
			hmac.update(text);
			return hmac.digest("base64url");
		},
		async verify(text, signature, secret) {
			const expected = await this.sign(text, secret);
			const a = Buffer$1.from(expected);
			const b = Buffer$1.from(signature);
			return a.length === b.length && crypto.timingSafeEqual(a, b);
		}
	};
	encoding = {
		base64Encode: (text) => {
			return Buffer$1.from(text).toString("base64url");
		},
		base64Decode: (text) => {
			return Buffer$1.from(text, "base64url").toString("utf-8");
		}
	};
	getEnv(key) {
		return process.env[key];
	}
	async readFile(path2) {
		return readFile(path2, "utf-8");
	}
	async writeFile(path2, content) {
		await writeFile(path2, content, "utf-8");
	}
	async deleteFile(path2) {
		await rm(path2, { force: true });
	}
};
new Set({
	description: "Filter operators for where clause",
	operators: [
		{
			name: "eq",
			description: "Equals (also supports direct value)",
			example: "{ id: \"abc\" } or { id: { eq: \"abc\" } }"
		},
		{
			name: "neq",
			description: "Not equals",
			example: "{ state: { neq: \"failed\" } }"
		},
		{
			name: "contains",
			description: "Case-insensitive substring match",
			example: "{ title: { contains: \"bug\" } }"
		},
		{
			name: "gt",
			description: "Greater than",
			example: "{ createTime: { gt: \"2024-01-01\" } }"
		},
		{
			name: "lt",
			description: "Less than",
			example: "{ createTime: { lt: \"2024-12-31\" } }"
		},
		{
			name: "gte",
			description: "Greater than or equal",
			example: "{ artifactCount: { gte: 1 } }"
		},
		{
			name: "lte",
			description: "Less than or equal",
			example: "{ artifactCount: { lte: 10 } }"
		},
		{
			name: "in",
			description: "Value in array",
			example: "{ state: { in: [\"completed\", \"failed\"] } }"
		},
		{
			name: "exists",
			description: "Field existence check",
			example: "{ \"outputs.pullRequest\": { exists: true } }"
		}
	],
	dotNotation: {
		description: "Use dot notation for nested field paths. When filtering arrays, uses existential matching (ANY element matches).",
		examples: [
			"\"artifacts.type\": \"bashOutput\"",
			"\"artifacts.exitCode\": { neq: 0 }",
			"\"plan.steps.title\": { contains: \"test\" }",
			"\"outputs.pullRequest.url\": { exists: true }"
		]
	}
}.operators.map((op) => op.name));
var defaultPlatform = new NodePlatform();
var defaultStorageFactory = {
	activity: (sessionId) => new NodeFileStorage(sessionId, getRootDir()),
	session: () => new NodeSessionStorage(getRootDir())
};
function connect(options = {}) {
	return new JulesClientImpl(options, defaultStorageFactory, defaultPlatform);
}
var jules = connect();
//#endregion
//#region src/electron/jules/repoless/handler.ts
function serialize$1(data) {
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
	if (/[^a-zA-Z0-9_\-.\/]/.test(name)) throw new Error(`Invalid branch name "${name.replace(/[^a-zA-Z0-9_\-.\/]/g, "?")}": contains disallowed characters. Use only alphanumerics, hyphens, underscores, dots, and slashes.`);
	if (name.startsWith("-") || name.startsWith(".") || name.endsWith(".") || name.endsWith("/") || name.includes("..") || name.includes("//")) throw new Error(`Invalid branch name "${name}": violates git branch naming rules`);
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
			throw new Error(`Failed to create branch "${branchName}": ${err instanceof Error ? err.message : err}`);
		}
		const applied = [];
		const changeSet = outcome.changeSet();
		if (changeSet) {
			console.log(`[repoless] applying changeSet patch (${changeSet.gitPatch.unidiffPatch.length} chars)`);
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
				throw new Error(`Failed to apply patch: ${err instanceof Error ? err.message : err}`);
			} finally {
				fs.unlinkSync(patchPath);
			}
			for (const f of changeSet.parsed().files) {
				applied.push(f.path);
				console.log(`[repoless] patched: ${f.path} (+${f.additions} -${f.deletions})`);
			}
		} else for (const file of outcome.generatedFiles().all()) {
			const fullPath = path.join(repoPath, file.path);
			await fs.promises.mkdir(path.dirname(fullPath), { recursive: true });
			await fs.promises.writeFile(fullPath, file.content, "utf-8");
			applied.push(file.path);
			console.log(`[repoless] wrote: ${file.path} (${file.content.length} chars)`);
		}
		try {
			execFileSync("git", [
				"-C",
				repoPath,
				"add",
				"-A"
			], { encoding: "utf-8" });
		} catch (err) {
			throw new Error(`Failed to stage files: ${err instanceof Error ? err.message : err}`);
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
			throw new Error(`Failed to read staged diff: ${err instanceof Error ? err.message : err}`);
		}
		console.log(`[repoless] applied ${applied.length} file(s) to branch "${branchName}"`);
		return serialize$1({
			branch: branchName,
			diff,
			applied
		});
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
		onProgress: (p) => send(event.sender, "sdk:client.sync.progress", p)
	}))));
	ipcMain.handle("sdk:client.select", wrapHandler(async (_, query) => serialize(await jules.select(query))));
	ipcMain.handle("sdk:client.getSessionResource", wrapHandler(async (_, id) => serialize(await jules.session(id).info())));
	ipcMain.handle("sdk:client.run", wrapHandler(async (_, config) => serialize(await jules.run(config))));
	ipcMain.handle("sdk:client.with", wrapHandler(async (_, options) => serialize(await jules.with(options))));
	ipcMain.handle("sdk:session.send", wrapHandler(async (_, id, prompt) => serialize(await jules.session(id).send(prompt))));
	ipcMain.handle("sdk:session.ask", wrapHandler(async (_, id, prompt) => serialize(await jules.session(id).ask(prompt))));
	ipcMain.handle("sdk:session.approve", wrapHandler(async (_, id) => serialize(await jules.session(id).approve())));
	ipcMain.handle("sdk:session.info", wrapHandler(async (_, id) => serialize(await jules.session(id).info())));
	ipcMain.handle("sdk:session.result", wrapHandler(async (_, id) => serialize(await jules.session(id).result())));
	ipcMain.handle("sdk:session.waitFor", wrapHandler(async (_, id, state) => serialize(await jules.session(id).waitFor(state))));
	ipcMain.handle("sdk:session.snapshot", wrapHandler(async (_, id, options) => serialize(await jules.session(id).snapshot(options))));
	ipcMain.handle("sdk:session.archive", wrapHandler(async (_, id) => serialize(await jules.session(id).archive())));
	ipcMain.handle("sdk:session.unarchive", wrapHandler(async (_, id) => serialize(await jules.session(id).unarchive())));
	ipcMain.handle("sdk:session.select", wrapHandler(async (_, id, options) => serialize(await jules.session(id).select(options))));
	ipcMain.handle("sdk:session.hydrate", wrapHandler(async (_, id) => serialize(await jules.session(id).activities.hydrate())));
	ipcMain.handle("sdk:session.stream.start", wrapHandler(async (event, id, options) => {
		const streamOpts = {
			...options,
			initialRetries: Math.max(options?.initialRetries ?? 0, 20)
		};
		for await (const item of jules.session(id).stream(streamOpts)) {
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
	ipcMain.handle("sdk:artifact.save", wrapHandler(async (_, data, filepath) => {
		const resolved = path.resolve(filepath);
		await fs.promises.mkdir(path.dirname(resolved), { recursive: true });
		await fs.promises.writeFile(resolved, Buffer.from(data, "base64"));
		return resolved;
	}));
}
//#endregion
//#region src/electron/main.mts
var __filename = fileURLToPath(import.meta.url);
var __dirname = path$1.dirname(__filename);
console.log("[Electron Main] Starting Electron process...");
var mainWindow = null;
var createWindow = async () => {
	const win = new BrowserWindow({
		width: 1280,
		height: 800,
		frame: false,
		webPreferences: {
			preload: path$1.join(__dirname, "preload.mjs"),
			contextIsolation: true,
			nodeIntegration: false
		}
	});
	const devUrl = process.env["VITE_DEV_SERVER_URL"];
	try {
		if (devUrl) await win.loadURL(devUrl);
		else await win.loadFile(path$1.join(__dirname, "../dist/index.html"));
	} catch (error) {
		console.error("Failed to load app:", error instanceof Error ? error.message : error);
	}
	win.on("closed", () => {
		mainWindow = null;
	});
	return win;
};
app.whenReady().then(async () => {
	ipcMain.handle("ping", () => "pong");
	ipcMain.on("window-minimize", () => mainWindow?.minimize());
	ipcMain.on("window-maximize", () => {
		if (mainWindow?.isMaximized()) mainWindow.unmaximize();
		else mainWindow?.maximize();
	});
	ipcMain.on("window-close", () => mainWindow?.close());
	mainWindow = await createWindow();
	registerSdkHandlers();
	app.on("activate", () => {
		if (BrowserWindow.getAllWindows().length === 0) createWindow();
	});
}).catch((error) => {
	console.error("App initialization failed:", error instanceof Error ? error.message : error);
});
app.on("window-all-closed", () => {
	app.quit();
});
//#endregion
