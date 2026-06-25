# API Diff: modjules vs @google/jules-sdk

|                  | Count |
|------------------|-------|
| Shared           | 161   |
| New in modjules  | 40    |
| Removed from SDK | 32    |

## New in modjules

These exist in modjules but not in `@google/jules-sdk`.

### `AddJobInput` (type)

> `workflows/spec.ts`

```ts
export type AddJobInput = z.infer<typeof AddJobInputSchema>;
```

### `AddJobInputSchema` (const)

> `workflows/spec.ts`

```ts
export const AddJobInputSchema = z.object({
  id: z
    .string()
    .regex(/^[a-zA-Z0-9_-]+$/, "Job ID must be alphanumeric, '-', or '_'"),
  job: JobSchema,
});
```

### `BrowserPlatform` (class)

> `platform/browser.ts`

```ts
export class BrowserPlatform implements Platform {
    private dbPromise: Promise<IDBPDatabase<unknown>> | null = null;

    private getDb(): Promise<IDBPDatabase<unknown>> {
        if (!this.dbPromise) {
            this.dbPromise = openDB(DB_NAME, 2, {
                upgrade(db, oldVersion, newVersion, transaction) {
                    // Ensure activities store exists (copied from BrowserStorage to avoid race conditions)
                    if (!db.objectStoreNames.contains(ACTIVITIES_STORE_NAME)) {
                        const store = db.createObjectStore(ACTIVITIES_STORE_NAME, {
                            keyPath: 'id',
                        });
                        store.createIndex('sessionTimestamp', ['sessionId', 'createTime']);
                    }
                    // Ensure artifacts store exists
                    if (!db.objectStoreNames.contains(ARTIFACTS_STORE_NAME)) {
                        const store = db.createObjectStore(ARTIFACTS_STORE_NAME, {
                            keyPath: 'filepath',
                        });
                        store.createIndex('activityId', 'activityId');
                    }
                },
            });
        }
        return this.dbPromise;
    }

    /**
     * Saves a file to IndexedDB.
     *
     * **Data Transformation:**
     * - Decodes base64 data into a `Blob`.
     *
     * **Side Effects:**
     * - Stores the blob in the `artifacts` object store.
     * - Associates the file with the `activityId` (if provided).
     *
     * @throws {Error} If the encoding is not 'base64'.
     */
    async saveFile(
        filepath: string,
        data: string,
        encoding: 'base64',
        activityId?: string,
    ): Promise<void> {
        if (encoding !== 'base64') {
            throw new Error(`Unsupported encoding for browser saveFile: ${encoding}`);
        }
        const db = await this.getDb();
        const blob = this.base64ToBlob(data);

        await db.put(ARTIFACTS_STORE_NAME, {
            filepath,
            blob,
            activityId,
            createdAt: new Date().toISOString(),
        });
    }

    async sleep(ms: number): Promise<void> {
```

### `BrowserStorage` (class)

> `storage/browser.ts`

```ts
export class BrowserStorage implements ActivityStorage {
    private sessionId: string;
    private dbPromise: Promise<IDBPDatabase<unknown>> | null = null;

    constructor(sessionId: string) {
        this.sessionId = sessionId;
    }

    private getDb(): Promise<IDBPDatabase<unknown>> {
        if (!this.dbPromise) {
            // We use version 2 here as well to match BrowserPlatform and avoid conflicts.
            // We don't necessarily need to know about 'artifacts' store here, but we must use the same version.
            this.dbPromise = openDB(DB_NAME, 2, {
                upgrade(db, oldVersion, newVersion, transaction) {
                    if (oldVersion < 1) {
                        if (!db.objectStoreNames.contains(STORE_NAME)) {
                            const store = db.createObjectStore(STORE_NAME, {
                                keyPath: 'id',
                            });
                            // Index to efficiently find the latest activity for a session
                            store.createIndex('sessionTimestamp', [
                                'sessionId',
                                'createTime',
                            ]);
                        }
                    }
                    // Ensure artifacts store exists if we are upgrading to v2 or from scratch
                    // This might duplicate logic in BrowserPlatform, but it's safer if both can upgrade.
                    if (!db.objectStoreNames.contains('artifacts')) {
                        const store = db.createObjectStore('artifacts', {
                            keyPath: 'filepath',
                        });
                        store.createIndex('activityId', 'activityId');
                    }
                },
            });
        }
        return this.dbPromise;
    }

    /**
     * Initializes the storage.
     *
     * **Side Effects:**
     * - Opens an IndexedDB connection.
     * - Upgrades the database schema to v2 if necessary (creating object stores).
     */
    async init(): Promise<void> {
        // openDB handles initialization, so just call it to ensure DB is ready.
        await this.getDb();
    }

    /**
     * Closes the storage connection.
     */
    async close(): Promise<void> {
        if (this.dbPromise) {
            const db = await this.dbPromise;
            db.close();
            this.dbPromise = null;
```

### `BuilderError` (type)

> `workflows/spec.ts`

```ts
export type BuilderError = z.infer<typeof BuilderErrorSchema>;
```

### `BuilderErrorCode` (const)

> `workflows/spec.ts`

```ts
export const BuilderErrorCode = z.enum([
  'INVALID_TRIGGER', // 'on' config is malformed
```

### `BuilderErrorCode` (type)

> `workflows/spec.ts`

```ts
export type BuilderErrorCode = z.infer<typeof BuilderErrorCode>;
```

### `BuilderErrorSchema` (const)

> `workflows/spec.ts`

```ts
export const BuilderErrorSchema = z.object({
  code: BuilderErrorCode,
  message: z.string(),
  details: z.any().optional(),
});
```

### `BuilderResult` (type)

> `workflows/spec.ts`

```ts
export type BuilderResult = z.infer<typeof BuilderResultSchema>;
```

### `BuilderResultSchema` (const)

> `workflows/spec.ts`

```ts
export const BuilderResultSchema = z.discriminatedUnion('success', [
  z.object({ success: z.literal(true), data: z.any().optional() }),
```

### `CachedPR` (interface)

> `github/types.ts`

```ts
export interface CachedPR {
  resource: PRResource;
  _lastSyncedAt: number;
}
```

### `createTimeToPageToken` (function)

> `utils/page-token.ts`

```ts
export function createTimeToPageToken(
  createTime: string,
```

### `github` (function)

> `github/adapter.ts`

```ts
export function github(config: GitHubConfig): GitHubAdapter {
  return new GitHubAdapterImpl(config);
}
```

### `GitHubAdapter` (interface)

> `github/types.ts`

```ts
export interface GitHubAdapter {
  pr(repo: string, number: number): PRClient;
  pr(options: { owner: string; repo: string; number: number }): PRClient;
  pr(url: string): PRClient;
  parsePrUrl(
    url: string,
  ): { owner: string; repo: string; number: number } | null;
  viewer(): Promise<GitHubUser>;
  rateLimit(): Promise<RateLimitInfo>;
}
```

### `GitHubApiClient` (class)

> `github/api.ts`

```ts
export class GitHubApiClient {
    constructor(
        private token: string,
        private baseUrl: string = 'https://api.github.com',
    ) {
    }

    async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
        const url = `${this.baseUrl}${endpoint}`;

        // Clone headers to avoid modifying the original options object
        const headers = {
            ...options.headers,
            Authorization: `Bearer ${this.token}`,
            Accept: 'application/vnd.github+json',
            'X-GitHub-Api-Version': '2022-11-28',
        };

        const response = await fetch(url, {
            ...options,
            headers,
        });

        if (!response.ok) {
            let body: any;
            try {
                body = await response.json();
            } catch (e) {
                body = {
                    message: `Request failed with status ${response.status} and non-JSON body`,
                };
            }

            if (response.status === 401) {
                throw new GitHubAuthError(
                    body.message || 'Authentication failed. Please check your token.',
                );
            }
            if (response.status === 404) {
                throw new GitHubNotFoundError(endpoint);
            }
            if (response.status === 403 || response.status === 429) {
                const limit = parseInt(
                    response.headers.get('x-ratelimit-limit') || '0',
                    10,
                );
                const remaining = parseInt(
                    response.headers.get('x-ratelimit-remaining') || '0',
                    10,
                );
                const resetTimestamp = parseInt(
                    response.headers.get('x-ratelimit-reset') || '0',
                    10,
                );
                const resetAt = new Date(resetTimestamp * 1000);
                throw new GitHubRateLimitError(resetAt, limit, remaining);
            }

            throw new GitHubError(
                body.message || `Request failed with status ${response.status}`,
                response.status,
```

### `GitHubAuthError` (class)

> `github/errors.ts`

```ts
export class GitHubAuthError extends GitHubError {
    constructor(message: string) {
        super(message, 401);
        this.name = 'GitHubAuthError';
    }
}
```

### `GitHubConfig` (interface)

> `github/types.ts`

```ts
export interface GitHubConfig {
  token: string;
  baseUrl?: string; // Default: 'https://api.github.com'
  pollingIntervalMs?: number; // Default: 30000
}
```

### `GitHubError` (class)

> `github/errors.ts`

```ts
export class GitHubError extends Error {
    constructor(
        message: string,
        public readonly status: number,
        public readonly response?: any,
    ) {
        super(message);
        this.name = 'GitHubError';
    }
}
```

### `GitHubNotFoundError` (class)

> `github/errors.ts`

```ts
export class GitHubNotFoundError extends GitHubError {
    constructor(resource: string) {
        super(`GitHub resource not found: ${resource}`, 404);
        this.name = 'GitHubNotFoundError';
    }
}
```

### `GitHubRateLimitError` (class)

> `github/errors.ts`

```ts
export class GitHubRateLimitError extends GitHubError {
    constructor(
        public readonly resetAt: Date,
        public readonly limit: number,
        public readonly remaining: number,
    ) {
        super(
            `GitHub rate limit exceeded. Resets at ${resetAt.toISOString()}`,
            429,
        );
        this.name = 'GitHubRateLimitError';
    }
}
```

### `GitHubUser` (interface)

> `github/types.ts`

```ts
export interface GitHubUser {
  id: number;
  login: string;
  type: 'User' | 'Bot' | 'Organization';
  avatarUrl?: string;
}
```

### `HandshakeContext` (type)

> `api.ts`

```ts
export type HandshakeContext =
  | { intent: 'create'; sessionConfig: any }
```

### `isPRCacheValid` (function)

> `github/caching.ts`

```ts
export function isPRCacheValid(
  cached: CachedPR | undefined,
```

### `JobDefinition` (type)

> `workflows/spec.ts`

```ts
export type JobDefinition = z.infer<typeof JobSchema>;
export type WorkflowState = z.infer<typeof WorkflowStateSchema>;
```

### `JobSchema` (const)

> `workflows/spec.ts`

```ts
export const JobSchema = z.object({
  name: z.string().optional(),
  'runs-on': z.string().default('ubuntu-latest'),
  needs: z.union([z.string(), z.array(z.string())]).optional(),
  if: z.string().optional(),
  env: z.record(z.string(), z.string()).optional(),
  permissions: z
    .union([z.string(), z.record(z.string(), z.string())])
    .optional(),
  steps: z.array(StepSchema).default([]),
});
```

### `Outcome` (interface)

> `types.ts`

```ts
export interface Outcome {
    sessionId: string;
    title: string;
    state: 'completed' | 'failed';
    /**
     * The primary Pull Request created by the session, if applicable.
     */
    pullRequest?: PullRequest;
    /**
     * All outputs generated by the session.
     */
    outputs: SessionOutput[];
}
```

### `PRClient` (interface)

> `github/types.ts`

```ts
export interface PRClient {
  readonly owner: string;
  readonly repo: string;
  readonly number: number;
  readonly sessionId?: string;
  info(): Promise<PRResource>;
}
```

### `PRClientImpl` (class)

> `github/pr-client.ts`

```ts
export class PRClientImpl implements PRClient {
    readonly owner: string;
    readonly repo: string;
    readonly number: number;
    readonly sessionId?: string;

    private cache?: CachedPR;

    constructor(
        private api: GitHubApiClient,
        owner: string,
        repo: string,
        number: number,
        sessionId?: string,
    ) {
        this.owner = owner;
        this.repo = repo;
        this.number = number;
        this.sessionId = sessionId;
    }

    async info(): Promise<PRResource> {
        if (this.cache && isPRCacheValid(this.cache)) {
            return this.cache.resource;
        }

        const data = await this.api.request<any>(
            `/repos/${this.owner}/${this.repo}/pulls/${this.number}`,
        );

        const resource = mapToPRResource(data);

        this.cache = {resource, _lastSyncedAt: Date.now()};

        return resource;
    }
}
```

### `ProxyConfig` (interface)

> `types.ts`

```ts
export interface ProxyConfig {
  /** The full URL to your GAS or Node.js proxy endpoint */
  url: string;
  /**
   * Async callback to retrieve the User Identity Token (e.g. Firebase ID Token).
   * Or a static string for "Shared Secret" mode.
   */
  auth?: () => Promise<string> | string;
}
```

### `PRResource` (interface)

> `github/types.ts`

```ts
export interface PRResource {
  id: number;
  number: number;
  nodeId: string;
  url: string;
  apiUrl: string;
  title: string;
  body: string;
  state: 'open' | 'closed';
  merged: boolean;
  draft: boolean;
  mergeable: boolean | null;
  mergeableState:
    | 'clean'
    | 'dirty'
    | 'blocked'
    | 'behind'
    | 'unstable'
    | 'unknown';
  baseRef: string;
  headRef: string;
  baseCommitSha: string;
  headCommitSha: string;
  additions: number;
  deletions: number;
  changedFiles: number;
  commits: number;
  author: GitHubUser;
  assignees: GitHubUser[];
  createdAt: Date;
  updatedAt: Date;
  mergedAt?: Date | null;
  closedAt?: Date | null;
}
```

### `RateLimitInfo` (interface)

> `github/types.ts`

```ts
export interface RateLimitInfo {
  limit: number;
  remaining: number;
  used: number;
  reset: Date;
}
```

### `StepDefinition` (type)

> `workflows/spec.ts`

```ts
export type StepDefinition = z.infer<typeof StepSchema>;
export type JobDefinition = z.infer<typeof JobSchema>;
```

### `StepSchema` (const)

> `workflows/spec.ts`

```ts
export const StepSchema = z
    .object({
        name: z.string().optional(),
        id: z.string().optional(),
        if: z.string().optional(),

        // Execution: Either 'uses' or 'run' is usually required, but allowed optional for flexibility
        uses: z.string().optional(),
        run: z.string().optional(),

        with: z
            .record(z.string(), z.union([z.string(), z.number(), z.boolean()]))
            .optional(),
        env: z.record(z.string(), z.string()).optional(),

        'continue-on-error': z.boolean().optional(),
        'timeout-minutes': z.number().optional(),
    })
```

### `WebPlatform` (class)

> `platform/web.ts`

```ts
export class WebPlatform implements Platform {
    /**
     * File saving is not supported in the Web Platform.
     * Use NodePlatform or BrowserPlatform for file operations.
     */
    async saveFile(
        filepath: string,
        data: string,
        encoding: 'base64',
        activityId?: string,
    ): Promise<void> {
        throw new Error(
            'saveFile is not supported in WebPlatform. Use NodePlatform for file operations.',
        );
    }

    async sleep(ms: number): Promise<void> {
        await new Promise((resolve) => setTimeout(resolve, ms));
    }

    createDataUrl(data: string, mimeType: string): string {
        return `data:${mimeType};base64,${data}`;
    }

    async fetch(input: string, init?: any): Promise<PlatformResponse> {
        const res = await globalThis.fetch(input, init);
        return {
            ok: res.ok,
            status: res.status,
            json: () => res.json(),
            text: () => res.text(),
        };
    }

    crypto = {
        randomUUID: (): string => globalThis.crypto.randomUUID(),

        async sign(text: string, secret: string): Promise<string> {
            const enc = new TextEncoder();
            const key = await globalThis.crypto.subtle.importKey(
                'raw',
                enc.encode(secret),
                {name: 'HMAC', hash: 'SHA-256'},
                false,
                ['sign'],
            );
            const signature = await globalThis.crypto.subtle.sign(
                'HMAC',
                key,
                enc.encode(text),
            );
            return this.arrayBufferToBase64Url(signature);
        },

        async verify(
            text: string,
            signature: string,
            secret: string,
        ): Promise<boolean> {
            const expected = await this.sign(text, secret);
```

### `WorkflowBuilder` (class)

> `workflows/builder.ts`

```ts
export class WorkflowBuilder implements WorkflowBuilderSpec {
    private state: WorkflowState;

    constructor(name: string) {
        this.state = {
            name,
            on: {},
            jobs: {},
        };
    }

    /**
     * Defines or updates the workflow triggers.
     * Merges with existing triggers to allow composition from multiple sources.
     */
    public on(triggers: WorkflowTrigger): this {
        // Validate input first
        const result = WorkflowTriggersSchema.safeParse(triggers);
        if (!result.success) {
            console.warn('Invalid trigger definition passed to .on()', result.error);
            return this; // Chainable, but maybe should throw in strict mode
        }

        // Deep merge logic (simplified for clarity)
        this.state.on = {
            ...this.state.on,
            ...triggers,
            push: {...this.state.on.push, ...triggers.push},
            pull_request: {...this.state.on.pull_request, ...triggers.pull_request},
        };

        return this;
    }

    /**
     * Adds a job to the workflow.
     * Fails if the Job ID is invalid or already exists.
     */
    public addJob(id: string, job: JobDefinition): BuilderResult {
        // 1. Validate Input (ID format and Job Structure)
        const inputResult = AddJobInputSchema.safeParse({id, job});
        if (!inputResult.success) {
            return {
                success: false,
                error: {
                    code: 'INVALID_JOB_ID', // Simplified mapping, could check error path
                    message: 'Invalid Job ID or Job Definition',
                    details: inputResult.error.format(),
                },
            };
        }

        // 2. Check Duplicates
        if (this.state.jobs[id]) {
            return {
                success: false,
                error: {
                    code: 'DUPLICATE_JOB_ID',
                    message: `Job with ID '${id}' already exists.`,
                },
```

### `WorkflowBuilderSpec` (interface)

> `workflows/spec.ts`

```ts
export interface WorkflowBuilderSpec {
    /** Set the triggers. Merges with existing triggers if called multiple times. */
    on(triggers: WorkflowTrigger): this;

    /** Add a job to the workflow. Returns validation error if invalid. */
    addJob(id: string, job: JobDefinition): BuilderResult;

    /** Add a step to an existing job. */
    addStep(jobId: string, step: StepDefinition): BuilderResult;

    /** Validates the current state and returns the YAML string */
    toYaml(): Promise<
        { success: true; yaml: string } | { success: false; error: BuilderError }
    >;

    /** Get read-only copy of internal state for inspection */
    getState(): WorkflowState;
}
```

### `WorkflowState` (type)

> `workflows/spec.ts`

```ts
export type WorkflowState = z.infer<typeof WorkflowStateSchema>;
```

### `WorkflowStateSchema` (const)

> `workflows/spec.ts`

```ts
export const WorkflowStateSchema = z.object({
  name: z.string().min(1, 'Workflow name is required'),
  on: WorkflowTriggersSchema,
  env: z.record(z.string(), z.string()).optional(),
  jobs: z.record(z.string(), JobSchema),
});
```

### `WorkflowTrigger` (type)

> `workflows/spec.ts`

```ts
export type WorkflowTrigger = z.infer<typeof WorkflowTriggersSchema>;
export type StepDefinition = z.infer<typeof StepSchema>;
```

### `WorkflowTriggersSchema` (const)

> `workflows/spec.ts`

```ts
export const WorkflowTriggersSchema = z.object({
  push: z
    .object({
      branches: z.array(z.string()).optional(),
      tags: z.array(z.string()).optional(),
      paths: z.array(z.string()).optional(),
    })
    .optional(),
  pull_request: z
    .object({
      types: z.array(z.string()).optional(),
      branches: z.array(z.string()).optional(),
      paths: z.array(z.string()).optional(),
    })
    .optional(),
  workflow_dispatch: z
    .object({
      inputs: z.record(z.string(), z.any()).optional(),
    })
    .optional(),
  schedule: z.array(z.object({ cron: z.string() })).optional(),
});
```

## Removed from SDK

These were in `@google/jules-sdk` but are not in modjules.

### `AutomationMode` (type)

> `types.d.ts`

```ts
export type AutomationMode = 'AUTOMATION_MODE_UNSPECIFIED' | 'AUTO_CREATE_PR';
/**
```

### `createGeneratedFiles` (function)

> `artifacts.d.ts`

```ts
export declare function createGeneratedFiles(files: GeneratedFile[]): GeneratedFiles;
/**
```

### `GeneratedFile` (interface)

> `types.d.ts`

```ts
export interface GeneratedFile {
    /** The file path relative to the repository root */
    path: string;
    /** The type of change */
    changeType: 'created' | 'modified' | 'deleted';
    /**
     * The full content of the file.
     * For 'created' files: the complete file content.
     * For 'modified' files: only the added lines (base content is not available).
     * For 'deleted' files: empty string.
     */
    content: string;
    /** Number of lines added */
    additions: number;
    /** Number of lines removed */
    deletions: number;
}
```

### `GeneratedFiles` (interface)

> `types.d.ts`

```ts
export interface GeneratedFiles {
    /** Returns all generated files */
    all(): GeneratedFile[];

    /** Find a file by its path */
    get(path: string): GeneratedFile | undefined;

    /** Filter files by change type */
    filter(changeType: 'created' | 'modified' | 'deleted'): GeneratedFile[];
}
```

### `getActivityCount` (function)

> `storage/cache-info.d.ts`

```ts
export declare function getActivityCount(sessionId: string, rootDirOverride?: string): Promise<number>;
export declare function getLatestActivities(sessionId: string, n: number, rootDirOverride?: string): Promise<Activity[]>;
```

### `getCacheInfo` (function)

> `storage/cache-info.d.ts`

```ts
export declare function getCacheInfo(rootDirOverride?: string): Promise<GlobalCacheInfo>;
export declare function getSessionCount(rootDirOverride?: string): Promise<number>;
```

### `getLatestActivities` (function)

> `storage/cache-info.d.ts`

```ts
export declare function getLatestActivities(sessionId: string, n: number, rootDirOverride?: string): Promise<Activity[]>;
```

### `getSessionCacheInfo` (function)

> `storage/cache-info.d.ts`

```ts
export declare function getSessionCacheInfo(sessionId: string, rootDirOverride?: string): Promise<SessionCacheInfo | null>;
export declare function updateGlobalCacheMetadata(rootDirOverride?: string): Promise<void>;
```

### `getSessionCount` (function)

> `storage/cache-info.d.ts`

```ts
export declare function getSessionCount(rootDirOverride?: string): Promise<number>;
export declare function getActivityCount(sessionId: string, rootDirOverride?: string): Promise<number>;
```

### `ListSourcesOptions` (interface)

> `types.d.ts`

```ts
export interface ListSourcesOptions {
    /**
     * A filter expression to filter sources.
     * Currently supports filtering by name (e.g., 'name="sources/github/owner/repo"').
     */
    filter?: string;
    /**
     * The maximum number of sources to return per page.
     * @default 100
     */
    pageSize?: number;
}
```

### `mapRestOutputToSdkOutput` (function)

> `mappers.d.ts`

```ts
export declare function mapRestOutputToSdkOutput(rest: RestSessionOutput): SessionOutput;

export declare function mapRestSessionToSdkSession(rest: RestSessionResource, platform?: any): SessionResource;
```

### `mapRestSessionToSdkSession` (function)

> `mappers.d.ts`

```ts
export declare function mapRestSessionToSdkSession(rest: RestSessionResource, platform?: any): SessionResource;

/**
```

### `mapRestSourceToSdkSource` (function)

> `mappers.d.ts`

```ts
export declare function mapRestSourceToSdkSource(rest: RestSource): Source;
export declare function mapRestOutputToSdkOutput(rest: RestSessionOutput): SessionOutput;
```

### `mapRestStateToSdkState` (function)

> `mappers.d.ts`

```ts
export declare function mapRestStateToSdkState(state: string): SessionState;
export declare function mapRestSourceToSdkSource(rest: RestSource): Source;
```

### `parseUnidiffWithContent` (function)

> `artifacts.d.ts`

```ts
export declare function parseUnidiffWithContent(patch?: string | null): GeneratedFile[];
/**
```

### `pMap` (function)

> `utils.d.ts`

```ts
export declare function pMap<T, R>(items: T[], mapper: (item: T, index: number) => Promise<R>, options?: {
    concurrency?: number;
    stopOnError?: boolean;
    delayMs?: number;
}): Promise<R[]>;
```

### `pollSession` (function)

> `polling.d.ts`

```ts
export declare function pollSession(sessionId: string, apiClient: ApiClient, predicateFn: (session: SessionResource) => boolean, pollingInterval: number, platform: any, timeoutMs?: number): Promise<SessionResource>;
/**
```

### `pollUntilCompletion` (function)

> `polling.d.ts`

```ts
export declare function pollUntilCompletion(sessionId: string, apiClient: ApiClient, pollingInterval: number, platform: any, timeoutMs?: number): Promise<SessionResource>;
```

### `RestGitHubRepo` (interface)

> `types.d.ts`

```ts
export interface RestGitHubRepo {
    owner: string;
    repo: string;
    isPrivate: boolean;
    defaultBranch?: {
        displayName: string;
    };
    branches?: {
        displayName: string;
    }[];
}
```

### `RestPullRequest` (interface)

> `types.d.ts`

```ts
export interface RestPullRequest {
    url: string;
    title: string;
    description: string;
    baseRef?: string;
    headRef?: string;
}
```

### `RestSessionOutput` (interface)

> `types.d.ts`

```ts
export interface RestSessionOutput {
    pullRequest?: RestPullRequest;
    changeSet?: ChangeSet;
}
```

### `RestSessionResource` (interface)

> `types.d.ts`

```ts
export interface RestSessionResource {
    name: string;
    id: string;
    prompt: string;
    sourceContext: SourceContext;
    source?: RestSource;
    title: string;
    createTime: string;
    updateTime: string;
    state: string;
    requirePlanApproval?: boolean;
    automationMode?: string;
    url: string;
    outputs?: RestSessionOutput[];
    activities?: any[];
    generatedFiles?: GeneratedFile[];
    archived?: boolean;
}
```

### `RestSource` (interface)

> `types.d.ts`

```ts
export interface RestSource {
    name: string;
    id: string;
    githubRepo?: RestGitHubRepo;
}
```

### `select` (function)

> `query/select.d.ts`

```ts
export declare function select<T extends JulesDomain>(client: JulesClient, query: JulesQuery<T>): Promise<QueryResult<T>[]>;
```

### `SessionOutcome` (interface)

> `types.d.ts`

```ts
export interface SessionOutcome {
    sessionId: string;
    title: string;
    state: 'completed' | 'failed';
    /**
     * The primary Pull Request created by the session, if applicable.
     */
    pullRequest?: PullRequest;
    /**
     * All outputs generated by the session.
     */
    outputs: SessionOutput[];

    /**
     * Returns all files generated by this session with their full content.
     * This is a convenience method for accessing session outputs as files.
     *
     * @example
     * const result = await session.result();
     * const files = result.generatedFiles();
     * const answer = files.get('answer.md');
     * console.log(answer?.content);
     */
    generatedFiles(): GeneratedFiles;

    /**
     * Returns the change set artifact if one exists, providing access to
     * the unified diff and parsed file changes.
     *
     * @example
     * const result = await session.result();
     * const changeSet = result.changeSet();
     * if (changeSet) {
     *   const parsed = changeSet.parsed();
     *   console.log(`${parsed.summary.totalFiles} files changed`);
     * }
     */
    changeSet(): ChangeSetArtifact | undefined;
}
```

### `SessionSnapshotOptions` (interface)

> `snapshot.d.ts`

```ts
export interface SessionSnapshotOptions {
    data: {
        session: SessionResource;
        activities?: Activity[];
    };
}
```

### `SnapshotField` (type)

> `types.d.ts`

```ts
export type SnapshotField = keyof SerializedSnapshot;
/**
```

### `streamActivities` (function)

> `streaming.d.ts`

```ts
export declare function streamActivities(sessionId: string, apiClient: ApiClient, pollingInterval: number, platform: Platform, options?: StreamActivitiesOptions): AsyncGenerator<Activity>;
```

### `TimeoutError` (class)

> `errors.d.ts`

```ts
export declare class TimeoutError extends JulesError {
    constructor(message: string);
}
```

### `ToJSONOptions` (interface)

> `types.d.ts`

```ts
export interface ToJSONOptions {
    /**
     * Fields to include in the output. If specified, only these fields are returned.
     * Takes precedence over `exclude` if both are provided.
     */
    include?: SnapshotField[];
    /**
     * Fields to exclude from the output. Ignored if `include` is specified.
     */
    exclude?: SnapshotField[];
}
```

### `updateGlobalCacheMetadata` (function)

> `storage/cache-info.d.ts`

```ts
export declare function updateGlobalCacheMetadata(rootDirOverride?: string): Promise<void>;
export declare function getCacheInfo(rootDirOverride?: string): Promise<GlobalCacheInfo>;
```

### `withFirstRequestRetry` (function)

> `retry-utils.d.ts`

```ts
export declare function withFirstRequestRetry<T>(fn: () => Promise<T>, options?: FirstRequestRetryOptions): Promise<T>;
```

## Shared symbols

Present in both. Not expanded — check individual API docs for signatures.

**Interfaces:** `NetworkClient`, `ListOptions`, `SelectOptions`, `ActivityClient`, `PlatformResponse`, `Platform`,
`SelectExpression`, `FieldMeta`, `DomainSchema`, `QueryExample`, `ValidationError`, `ValidationWarning`,
`ValidationResult`, `FirstRequestRetryOptions`, `SessionStorage`, `ActivityStorage`, `GlobalCacheMetadata`,
`JulesOptions`, `SourceInput`, `SessionConfig`, `GitHubRepo`, `PullRequest`, `SourceContext`, `SessionResource`,
`PlanStep`, `Plan`, `GitPatch`, `ChangeSet`, `ParsedFile`, `ParsedChangeSet`, `ChangeSetArtifact`, `MediaArtifact`,
`BashArtifact`, `RestChangeSetArtifact`, `RestMediaArtifact`, `RestBashOutputArtifact`, `ActivityAgentMessaged`,
`ActivityUserMessaged`, `ActivityPlanGenerated`, `ActivityPlanApproved`, `ActivityProgressUpdated`,
`ActivitySessionCompleted`, `ActivitySessionFailed`, `ActivitySummary`, `LightweightActivity`, `AutomatedSession`,
`JulesQuery`, `SessionClient`, `SessionSnapshot`, `TimelineEntry`, `SessionInsights`, `SerializedSnapshot`,
`SourceManager`, `JulesClient`, `SyncProgress`, `SyncStats`, `SyncCheckpoint`, `SyncOptions`

**Types:** `RateLimitRetryConfig`, `ApiClientOptions`, `ApiRequestOptions`, `CacheTier`, `InternalConfig`,
`ValidationErrorCode`, `ListSessionsOptions`, `ListSessionsResponse`, `SessionCacheInfo`, `GlobalCacheInfo`,
`CachedSession`, `SessionIndexEntry`, `SessionMetadata`, `StreamActivitiesOptions`, `StorageFactory`, `Source`,
`SessionState`, `Origin`, `SessionOutput`, `Artifact`, `RestArtifact`, `StrippedMediaArtifact`, `LightweightArtifact`,
`Activity`, `JulesDomain`, `FilterOp`, `WhereClause`, `IncludeClause`, `QueryResult`, `StreamActivitiesOptions`,
`SyncDepth`

**Functions:** `toSummary`, `parseUnidiff`, `connect`, `determineCacheTier`, `isCacheValid`, `connect`,
`mapRestArtifactToSdkArtifact`, `mapRestActivityToSdkActivity`, `mapSessionResourceToOutcome`,
`isActivityComputedField`, `isSessionComputedField`, `computeArtifactCount`, `computeSummary`, `computeDurationMs`,
`injectActivityComputedFields`, `injectSessionComputedFields`, `parseSelectExpression`, `getPath`, `setPath`,
`deletePath`, `deepClone`, `projectDocument`, `isPathPrefix`, `getSchema`, `getAllSchemas`, `generateTypeDefinition`,
`generateMarkdownDocs`, `validateQuery`, `formatValidationResult`, `createSourceManager`, `getRootDir`, `isWritable`,
`isWritable`, `getRootDir`, `pageTokenToDate`, `isSessionFrozen`

**Classs:** `DefaultActivityClient`, `ApiClient`, `MediaArtifact`, `BashArtifact`, `ChangeSetArtifact`,
`JulesClientImpl`, `JulesError`, `JulesNetworkError`, `JulesApiError`, `JulesAuthenticationError`,
`JulesRateLimitError`, `MissingApiKeyError`, `SourceNotFoundError`, `AutomatedSessionFailedError`,
`SyncInProgressError`, `InvalidStateError`, `NetworkAdapter`, `NodePlatform`, `SessionClientImpl`, `SessionCursor`,
`SessionSnapshotImpl`, `MemoryStorage`, `MemorySessionStorage`, `NodeFileStorage`, `NodeSessionStorage`

**Consts:** `jules`, `jules`, `ACTIVITY_COMPUTED_FIELDS`, `SESSION_COMPUTED_FIELDS`, `DEFAULT_ACTIVITY_PROJECTION`,
`DEFAULT_SESSION_PROJECTION`, `SESSION_SCHEMA`, `ACTIVITY_SCHEMA`, `FILTER_OP_SCHEMA`, `PROJECTION_SCHEMA`, `jules`
