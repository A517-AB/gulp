# @google/jules-sdk API

**Total exported symbols: 189**

## Contents

- [Interfaces](#interfaces) (69)
- [Types](#types) (33)
- [Classs](#classs) (26)
- [Functions](#functions) (51)
- [Consts](#consts) (10)

## Interfaces

### `ActivityAgentMessaged`

> `types.d.ts`

```ts
export interface ActivityAgentMessaged extends BaseActivity {
    type: 'agentMessaged';
    /**
     * The message the agent posted.
     */
    message: string;
}
```

---

### `ActivityClient`

> `activities/types.d.ts`

```ts
export interface ActivityClient {
    /**
     * COLD STREAM: Yields all known past activities from local storage.
     * Ends immediately after yielding the last known activity.
     * Does NOT open a network connection.
     */
    history(): AsyncIterable<Activity>;

    /**
     * HOT STREAM: Yields ONLY future activities as they arrive from the network.
     * Blocks indefinitely.
     */
    updates(): AsyncIterable<Activity>;

    /**
     * HYBRID STREAM: Yields full history(), then seamlessly switches to updates().
     * The standard choice for most applications.
     */
    stream(): AsyncIterable<Activity>;

    /**
     * LOCAL QUERY: Performs rich filtering against local storage only.
     * Fast, but might be incomplete if not synced.
     */
    select(options?: SelectOptions): Promise<Activity[]>;

    /**
     * NETWORK LIST: Honest wrapper around standard REST pagination.
     * Uses opaque tokens.
     */
    list(options?: ListOptions): Promise<{
        activities: Activity[];
        nextPageToken?: string;
    }>;

    /**
     * NETWORK GET: Fetches a specific activity from the network and caches it.
     */
    get(activityId: string): Promise<Activity>;

    /**
     * NETWORK SYNC: Fetches all activities from the network and caches them.
     * Useful when you suspect the cache is stale.
     * @returns The number of activities synced.
     */
    hydrate(): Promise<number>;
}
```

---

### `ActivityPlanApproved`

> `types.d.ts`

```ts
export interface ActivityPlanApproved extends BaseActivity {
    type: 'planApproved';
    /**
     * The ID of the plan that was approved.
     */
    planId: string;
}
```

---

### `ActivityPlanGenerated`

> `types.d.ts`

```ts
export interface ActivityPlanGenerated extends BaseActivity {
    type: 'planGenerated';
    /**
     * The plan that was generated.
     */
    plan: Plan;
}
```

---

### `ActivityProgressUpdated`

> `types.d.ts`

```ts
export interface ActivityProgressUpdated extends BaseActivity {
    type: 'progressUpdated';
    /**
     * The title of the progress update.
     */
    title: string;
    /**
     * The description of the progress update.
     */
    description: string;
}
```

---

### `ActivitySessionCompleted`

> `types.d.ts`

```ts
export interface ActivitySessionCompleted extends BaseActivity {
    type: 'sessionCompleted';
}
```

---

### `ActivitySessionFailed`

> `types.d.ts`

```ts
export interface ActivitySessionFailed extends BaseActivity {
    type: 'sessionFailed';
    /**
     * The reason the session failed.
     */
    reason: string;
}
```

---

### `ActivityStorage`

> `storage/types.d.ts`

```ts
export interface ActivityStorage {
    /**
     * Lifecycle method to initialize the storage (e.g., open DB connection, ensure storage directory exists).
     * Must be called before any other method.
     */
    init(): Promise<void>;

    /**
     * Lifecycle method to close connections or flush buffers.
     */
    close(): Promise<void>;

    /**
     * Persists a single activity.
     * Implementations MUST guarantee this is an append-only operation (or upsert if ID matches).
     * It should NEVER delete or modify a different activity.
     */
    append(activity: Activity): Promise<void>;

    /**
     * Retrieves a specific activity by its ID.
     * @returns The activity if found, or undefined.
     */
    get(activityId: string): Promise<Activity | undefined>;

    /**
     * Retrieves the most recently appended activity.
     * Crucial for determining the high-water mark for network synchronization.
     */
    latest(): Promise<Activity | undefined>;

    /**
     * Yields all stored activities in chronological order (insertion order).
     * Must support standard 'for await...of' loops.
     */
    scan(): AsyncIterable<Activity>;
}
```

---

### `ActivitySummary`

> `types.d.ts`

```ts
export interface ActivitySummary {
    id: string;
    type: string;
    createTime: string;
    summary: string;
}
```

---

### `ActivityUserMessaged`

> `types.d.ts`

```ts
export interface ActivityUserMessaged extends BaseActivity {
    type: 'userMessaged';
    /**
     * The message the user posted.
     */
    message: string;
}
```

---

### `AutomatedSession`

> `types.d.ts`

```ts
export interface AutomatedSession {
    /**
     * The unique ID of the session.
     */
    readonly id: string;

    /**
     * Provides a real-time stream of activities as the automated run progresses.
     * This uses an Async Iterator, making it easy to consume events as they happen.
     *
     * @example
     * const run = await jules.run({ ... });
     * for await (const activity of run.stream()) {
     *   console.log(`[${activity.type}]`);
     * }
     */
    stream(): AsyncIterable<Activity>;

    /**
     * Waits for the session to complete and returns the final outcome.
     *
     * @example
     * const run = await jules.run({ ... });
     * const outcome = await run.result();
     */
    result(): Promise<SessionOutcome>;
}
```

---

### `BashArtifact`

> `types.d.ts`

```ts
export interface BashArtifact {
    readonly type: 'bashOutput';
    readonly command: string;
    readonly stdout: string;
    readonly stderr: string;
    readonly exitCode: number | null;
    /**
     * Returns a cleanly formatted string combining the command, output, and exit code.
     *
     * @example
     * if (artifact.type === 'bashOutput') {
     *   console.log(artifact.toString());
     * }
     */
    toString(): string;
}
```

---

### `ChangeSet`

> `types.d.ts`

```ts
export interface ChangeSet {
    source: string;
    gitPatch: GitPatch;
}
```

---

### `ChangeSetArtifact`

> `types.d.ts`

```ts
export interface ChangeSetArtifact {
    readonly type: 'changeSet';
    readonly source: string;
    readonly gitPatch: GitPatch;

    /**
     * Parses the unified diff and returns structured file change information.
     *
     * @returns Parsed diff with file paths, change types, and line counts.
     *
     * @example
     * if (artifact.type === 'changeSet') {
     *   const parsed = artifact.parsed();
     *   console.log(`Changed ${parsed.summary.totalFiles} files`);
     *   for (const file of parsed.files) {
     *     console.log(`${file.changeType}: ${file.path} (+${file.additions}/-${file.deletions})`);
     *   }
     * }
     */
    parsed(): ParsedChangeSet;
}
```

---

### `DomainSchema`

> `query/schema.d.ts`

```ts
export interface DomainSchema {
    /** Domain name */
    domain: 'sessions' | 'activities';
    /** Human-readable description */
    description: string;
    /** All fields in this domain */
    fields: FieldMeta[];
    /** Example queries for this domain */
    examples: QueryExample[];
}
```

---

### `FieldMeta`

> `query/schema.d.ts`

```ts
export interface FieldMeta {
    /** Field name */
    name: string;
    /** TypeScript type representation */
    type: string;
    /** Human-readable description */
    description: string;
    /** Whether field is optional */
    optional?: boolean;
    /** Whether field is computed (not stored, derived at query time) */
    computed?: boolean;
    /** Whether field can be filtered in where clause */
    filterable?: boolean;
    /** Whether field can be used in select projection */
    selectable?: boolean;
    /** Nested fields if this is an object or array type */
    fields?: FieldMeta[];
}
```

---

### `FirstRequestRetryOptions`

> `retry-utils.d.ts`

```ts
export interface FirstRequestRetryOptions {
    /**
     * Maximum number of retry attempts after the initial failure.
     * @default 5
     */
    maxRetries?: number;
    /**
     * Initial delay in milliseconds before the first retry.
     * Subsequent retries use exponential backoff (delay * 2^attempt).
     * @default 1000
     */
    initialDelayMs?: number;
}
```

---

### `GeneratedFile`

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

---

### `GeneratedFiles`

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

---

### `GitHubRepo`

> `types.d.ts`

```ts
export interface GitHubRepo {
    owner: string;
    repo: string;
    isPrivate: boolean;
    defaultBranch?: string;
    branches?: string[];
}
```

---

### `GitPatch`

> `types.d.ts`

```ts
export interface GitPatch {
    /**
     * The patch content.
     */
    unidiffPatch: string;
    /**
     * The base commit id the patch should be applied to.
     */
    baseCommitId: string;
    /**
     * A suggested commit message for the.
     */
    suggestedCommitMessage: string;
}
```

---

### `GlobalCacheMetadata`

> `storage/types.d.ts`

```ts
export interface GlobalCacheMetadata {
    lastSyncedAt: number;
    sessionCount: number;
}
```

---

### `JulesClient`

> `types.d.ts`

```ts
export interface JulesClient {
    /**
     * Executes a task in automated mode.
     * This is a high-level abstraction for "fire-and-forget" tasks.
     *
     * @param config The configuration for the run.
     * @returns A `AutomatedSession` object, which is an enhanced Promise that resolves to the final outcome.
     *
     * @example
     * const run = await jules.run({
     *   prompt: "Fix the bug described in issue #123",
     *   source: { github: 'my-org/my-project', baseBranch: 'main' }
     * });
     * // The session is now running in the background.
     * // You can optionally wait for the result:
     * // const outcome = await run.result();
     */
    run(config: SessionConfig): Promise<AutomatedSession>;

    /**
     * Creates a new interactive session for workflows requiring human oversight.
     *
     * @param config The configuration for the session.
     * @returns A Promise resolving to the interactive `SessionClient`.
     *
     * @example
     * const session = await jules.session({
     *   prompt: "Let's refactor the authentication module.",
     *   source: { github: 'my-org/my-project', baseBranch: 'develop' }
     * });
     */
    session(config: SessionConfig): Promise<SessionClient>;

    /**
     * Rehydrates an existing session from its ID, allowing you to resume interaction.
     *
     * @param sessionId The ID of the existing session.
     * @returns The interactive `SessionClient`.
     *
     * @example
     * const session = jules.session('EXISTING_SESSION_ID');
     * // now you can interact with it
     * const info = await session.info();
     */
    session(sessionId: string): SessionClient;

    /**
     * Provides access to the Source Management interface.
     *
     * @example
     * const sources = jules.sources;
     * const allSources = await Array.fromAsync(sources());
     */
    sources: SourceManager;

/**
 * Creates a new Jules client instance with updated configuration.
 * This is an immutable operation; the original client instance remains unchanged.
 *
 * @param options The new configuration options to merge with the existing ones.
 * @returns A new JulesClient instance with the updated configuration.
 *
 * @example
 * const specialized = jules.with({ apiKey: 'NEW_KEY' });
```

---

### `JulesOptions`

> `types.d.ts`

```ts
export interface JulesOptions {
    /**
     * The API key used for authentication.
     * If not provided, the SDK will attempt to read it from the JULES_API_KEY environment variable.
     * Authenticates requests via the `X-Goog-Api-Key` header.
     */
    apiKey?: string;
    /**
     * **FOR TEST/DEV USE ONLY.**
     * Explicitly sets the API key for client-side environments (like browsers).
     * Do NOT use this in production as it exposes your credentials.
     *
     * @deprecated Use `apiKey` in secure server-side environments instead.
     */
    apiKey_TEST_ONLY_DO_NOT_USE_IN_PRODUCTION?: string;
    /**
     * The base URL for the Jules API.
     * @default 'https://jules.googleapis.com/v1alpha'
     */
    baseUrl?: string;
    /**
     * (Internal) A factory for creating storage instances.
     * This is used to inject platform-specific storage implementations (Node vs. Browser).
     * @internal
     */
    storageFactory?: StorageFactory;
    /**
     * (Internal) The platform implementation.
     * This is used to inject platform-specific functionality (Node vs. Browser).
     * @internal
     */
    platform?: any;
    /**
     * Advanced operational parameters for the SDK.
     */
    config?: {
        /**
         * The interval in milliseconds to poll for session and activity updates.
         * @default 5000
         */
        pollingIntervalMs?: number;
        /**
         * The timeout in milliseconds for individual HTTP requests to the Jules API.
         * @default 30000
         */
        requestTimeoutMs?: number;
        /**
         * Configuration for 429 rate limit retry behavior.
         * The SDK will automatically retry rate-limited requests with exponential backoff
         * until the configured time window is exhausted.
         */
        rateLimitRetry?: {
            /**
             * Maximum time in milliseconds to keep retrying before throwing JulesRateLimitError.
             * @default 300000 (5 minutes)
             */
            maxRetryTimeMs?: number;

/**
 * Base delay in milliseconds for exponential backoff.
 * @default 1000
```

---

### `JulesQuery`

> `types.d.ts`

```ts
export interface JulesQuery<T extends JulesDomain> {
    from: T;
    select?: T extends 'sessions' ? (keyof SessionResource)[] : (keyof Activity)[];
    where?: WhereClause<T>;
    include?: IncludeClause<T>;
    limit?: number;
    offset?: number;
    order?: 'asc' | 'desc';
    startAt?: string;
    startAfter?: string;
}
```

---

### `LightweightActivity`

> `types.d.ts`

```ts
export interface LightweightActivity extends ActivitySummary {
    /**
     * The full message content for activities that have one (agentMessaged, userMessaged).
     * Unlike `summary`, this is not truncated.
     */
    message?: string;
    artifacts: LightweightArtifact[] | null;
    artifactCount: number;
}
```

---

### `ListOptions`

> `activities/types.d.ts`

```ts
export interface ListOptions {
    pageSize?: number;
    pageToken?: string;
    filter?: string;
}
```

---

### `ListSourcesOptions`

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

---

### `MediaArtifact`

> `types.d.ts`

```ts
export interface MediaArtifact {
    readonly type: 'media';
    /**
     * The base64-encoded media data.
     */
    readonly data: string;
    /**
     * The format of the media (e.g., 'image/png').
     */
    readonly format: string;

    /**
     * Saves the media data to a file.
     * This method is only available in Node.js environments.
     *
     * @param filepath The path to save the file to.
     * @throws {Error} If called in a non-Node.js environment.
     *
     * @example
     * if (artifact.type === 'media' && artifact.format.startsWith('image/')) {
     *   await artifact.save('./screenshot.png');
     * }
     */
    save(filepath: string): Promise<void>;

    /**
     * Creates a blob URL for the media data.
     * This works in both Node.js and browser environments.
     *
     * @returns A URL string that can be used to display or download the media.
     *
     * @example
     * if (artifact.type === 'media') {
     *   const url = artifact.toUrl();
     *   // Browser: <img src={url} />
     *   // Node: console.log('Media URL:', url);
     * }
     */
    toUrl(): string;
}
```

---

### `NetworkClient`

> `activities/client.d.ts`

```ts
export interface NetworkClient {
    rawStream(): AsyncIterable<Activity>;

    listActivities(options?: ListOptions): Promise<{
        activities: Activity[];
        nextPageToken?: string;
    }>;

    fetchActivity(activityId: string): Promise<Activity>;
}
```

---

### `ParsedChangeSet`

> `types.d.ts`

```ts
export interface ParsedChangeSet {
    /** Individual file changes */
    files: ParsedFile[];
    /** Summary counts */
    summary: {
        totalFiles: number;
        created: number;
        modified: number;
        deleted: number;
    };
}
```

---

### `ParsedFile`

> `types.d.ts`

```ts
export interface ParsedFile {
    /** The file path relative to the repository root */
    path: string;
    /** The type of change */
    changeType: 'created' | 'modified' | 'deleted';
    /** Number of lines added */
    additions: number;
    /** Number of lines removed */
    deletions: number;
}
```

---

### `Plan`

> `types.d.ts`

```ts
export interface Plan {
    id: string;
    steps: PlanStep[];
    createTime: string;
}
```

---

### `PlanStep`

> `types.d.ts`

```ts
export interface PlanStep {
    id: string;
    title: string;
    description?: string;
    index: number;
}
```

---

### `Platform`

> `platform/types.d.ts`

```ts
export interface Platform {
    /**
     * Saves a file to the platform's filesystem.
     */
    saveFile(filepath: string, data: string, encoding: 'base64', activityId?: string): Promise<void>;

    /**
     * Pauses execution for the specified duration.
     */
    sleep(ms: number): Promise<void>;

    /**
     * Creates a data URL for the given data.
     */
    createDataUrl(data: string, mimeType: string): string;

    /**
     * Unified network fetch.
     */
    fetch(input: string, init?: any): Promise<PlatformResponse>;

    /**
     * Unified crypto operations.
     */
    crypto: {
        /**
         * Generates a standard UUID v4.
         */
        randomUUID(): string;
        /**
         * Signs a string using HMAC-SHA256 and returns a Base64Url encoded string.
         * Used for minting Capability Tokens.
         */
        sign(text: string, secret: string): Promise<string>;
        /**
         * Verifies a signature.
         */
        verify(text: string, signature: string, secret: string): Promise<boolean>;
    };
    /**
     * Unified encoding/decoding operations.
     */
    encoding: {
        /**
         * Encodes a string to Base64URL format.
         * (URL-safe: '-' instead of '+', '_' instead of '/', no padding)
         */
        base64Encode(text: string): string;
        /**
         * Decodes a Base64URL encoded string.
         */
        base64Decode(text: string): string;
    };

    /**
     * Retrieves an environment variable or configuration value.
     *
     * @param key The name of the environment variable (e.g., "JULES_API_KEY").
     * @returns The value of the environment variable, or `undefined` if not set.
     */
    getEnv(key: string): string | undefined;

    readFile?(path: string): Promise<string>;

    writeFile?(path: string, content: string): Promise<void>;

    deleteFile?(path: string): Promise<void>;
}
```

---

### `PlatformResponse`

> `platform/types.d.ts`

```ts
export interface PlatformResponse {
    ok: boolean;
    status: number;
    json<T = any>(): Promise<T>;
    text(): Promise<string>;
}
```

---

### `PullRequest`

> `types.d.ts`

```ts
export interface PullRequest {
    url: string;
    title: string;
    description: string;
    baseRef?: string;
    headRef?: string;
}
```

---

### `QueryExample`

> `query/schema.d.ts`

```ts
export interface QueryExample {
    /** Natural language description */
    description: string;
    /** JQL query */
    query: Record<string, unknown>;
}
```

---

### `RestBashOutputArtifact`

> `types.d.ts`

```ts
export interface RestBashOutputArtifact {
    bashOutput: {
        command: string;
        output: string;
        exitCode: number | null;
    };
}
```

---

### `RestChangeSetArtifact`

> `types.d.ts`

```ts
export interface RestChangeSetArtifact {
    changeSet: ChangeSet;
}
```

---

### `RestGitHubRepo`

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

---

### `RestMediaArtifact`

> `types.d.ts`

```ts
export interface RestMediaArtifact {
    media: {
        data: string;
        mimeType: string;
    };
}
```

---

### `RestPullRequest`

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

---

### `RestSessionOutput`

> `types.d.ts`

```ts
export interface RestSessionOutput {
    pullRequest?: RestPullRequest;
    changeSet?: ChangeSet;
}
```

---

### `RestSessionResource`

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

---

### `RestSource`

> `types.d.ts`

```ts
export interface RestSource {
    name: string;
    id: string;
    githubRepo?: RestGitHubRepo;
}
```

---

### `SelectExpression`

> `query/projection.d.ts`

```ts
export interface SelectExpression {
    path: string[];
    exclude: boolean;
    wildcard: boolean;
}
```

---

### `SelectOptions`

> `activities/types.d.ts`

```ts
export interface SelectOptions {
    after?: string;
    before?: string;
    type?: string;
    limit?: number;
    order?: 'asc' | 'desc';
}
```

---

### `SerializedSnapshot`

> `types.d.ts`

```ts
export interface SerializedSnapshot {
    id: string;
    state: string;
    url: string;
    createdAt: string;
    updatedAt: string;
    durationMs: number;
    prompt: string;
    title: string;
    activities: Activity[];
    activityCounts: Record<string, number>;
    timeline: TimelineEntry[];
    generatedFiles: GeneratedFile[];
    insights: {
        completionAttempts: number;
        planRegenerations: number;
        userInterventions: number;
        failedCommandCount: number;
    };
    pr?: {
        url: string;
        title: string;
        description: string;
    };
}
```

---

### `SessionClient`

> `types.d.ts`

```ts
export interface SessionClient {
    /**
     * The unique ID of the session.
     */
    readonly id: string;
    /**
     * Scoped access to activity-specific operations.
     */
    readonly activities: ActivityClient;

    /**
     * COLD STREAM: Yields all known past activities from local storage.
     * Ends immediately after yielding the last known activity.
     * Does NOT open a network connection.
     */
    history(): AsyncIterable<Activity>;

    /**
     * HOT STREAM: Yields ONLY future activities as they arrive from the network.
     * Blocks indefinitely.
     */
    updates(): AsyncIterable<Activity>;

    /**
     * LOCAL QUERY: Performs rich filtering against local storage only.
     * Fast, but might be incomplete if not synced.
     *
     * @deprecated Use `session.activities.select()` instead.
     */
    select(options?: SelectOptions): Promise<Activity[]>;

    /**
     * Provides a real-time stream of activities for the session.
     * This uses an Async Iterator to abstract the polling of the ListActivities endpoint.
     *
     * @param options Options to control the stream, such as filters.
     * @example
     * // Filter out activities originated by the user
     * for await (const activity of session.stream({ exclude: { originator: 'user' } })) {
     *   console.log(activity.type);
     * }
     */
    stream(options?: StreamActivitiesOptions): AsyncIterable<Activity>;

    /**
     * Approves the currently pending plan.
     * Only valid if the session state is `awaitingPlanApproval`.
     *
     * @example
     * await session.waitFor('awaitingPlanApproval');
     * await session.approve();
     */
    approve(): Promise<void>;

    /**
     * Sends a message (prompt) to the agent in the context of the current session.
     * This is a fire-and-forget operation. To see the response, use `stream()` or `ask()`.
     *
     * @param prompt The message to send.
     * @example
     * await session.send("Can you start working on the first step?");
     */
    send(prompt: string): Promise<void>;

/**
 * Sends a message to the agent and waits specifically for the agent's immediate reply.
 * This provides a convenient request/response flow for conversational interactions.
```

---

### `SessionConfig`

> `types.d.ts`

```ts
export interface SessionConfig {
    /**
     * The initial instruction or task description for the agent.
     * Required. Maps to `prompt` in the REST API `POST /sessions` payload.
     */
    prompt: string;
    /**
     * The source code context for the session.
     * Optional. If omitted, creates a "repoless" session not attached to any repository.
     * The SDK constructs the `sourceContext` payload from this input when provided.
     */
    source?: SourceInput;
    /**
     * A short, descriptive title for the session. Strongly recommended.
     * This title is displayed in the Jules UI and helps identify the session at a glance.
     * If omitted, the session will have no title in the UI.
     * Maps to `title` in the REST API.
     */
    title?: string;
    /**
     * If true, the agent will pause and wait for explicit approval (via `session.approve()`)
     * before executing any generated plan.
     *
     * @default false for `jules.run()`
     * @default true for `jules.session()`
     */
    requireApproval?: boolean;
    /**
     * If true, the agent will automatically create a Pull Request when the task is completed.
     * Maps to `automationMode: AUTO_CREATE_PR` in the REST API.
     * If false, maps to `AUTOMATION_MODE_UNSPECIFIED`.
     *
     * @default true for `jules.run()`
     */
    autoPr?: boolean;
}
```

---

### `SessionInsights`

> `types.d.ts`

```ts
export interface SessionInsights {
    readonly completionAttempts: number;
    readonly planRegenerations: number;
    readonly userInterventions: number;
    readonly failedCommands: readonly Activity[];
}
```

---

### `SessionOutcome`

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

---

### `SessionResource`

> `types.d.ts`

```ts
export interface SessionResource {
    /**
     * The full resource name (e.g., "sessions/314159...").
     */
    name: string;
    /**
     * The unique ID of the session.
     */
    id: string;
    prompt: string;
    sourceContext: SourceContext;
    source?: Source;
    title: string;
    requirePlanApproval?: boolean;
    automationMode?: AutomationMode;
    /**
     * The time the session was created (RFC 3339 timestamp).
     */
    createTime: string;
    /**
     * The time the session was last updated (RFC 3339 timestamp).
     */
    updateTime: string;
    /**
     * The current state of the session.
     */
    state: SessionState;
    /**
     * The URL to view the session in the Jules web app.
     */
    url: string;
    /**
     * The outputs of the session, if any.
     */
    outputs: SessionOutput[];
    /**
     * The activities associated with the session.
     * Only populated when `include: { activities: true }` is used in `jules.select()`.
     */
    activities?: Activity[];
    outcome: SessionOutcome;
    /**
     * The generated files of the session if it reaches a stable state.
     */
    generatedFiles?: GeneratedFile[];
    archived: boolean;
}
```

---

### `SessionSnapshot`

> `types.d.ts`

```ts
export interface SessionSnapshot {
    readonly id: string;
    readonly state: SessionState;
    readonly url: string;
    readonly createdAt: Date;
    readonly updatedAt: Date;
    readonly durationMs: number;
    readonly prompt: string;
    readonly title: string;
    readonly pr?: PullRequest;
    readonly activities: readonly Activity[];
    readonly activityCounts: Readonly<Record<string, number>>;
    readonly timeline: readonly TimelineEntry[];
    readonly insights: SessionInsights;
    readonly generatedFiles: GeneratedFiles;
    readonly changeSet: () => ChangeSetArtifact | undefined;

    toJSON(options?: ToJSONOptions): Partial<SerializedSnapshot>;

    toMarkdown(): string;
}
```

---

### `SessionSnapshotOptions`

> `snapshot.d.ts`

```ts
export interface SessionSnapshotOptions {
    data: {
        session: SessionResource;
        activities?: Activity[];
    };
}
```

---

### `SessionStorage`

> `storage/types.d.ts`

```ts
export interface SessionStorage {
    /**
     * Initializes the storage (ensure directories exist).
     */
    init(): Promise<void>;

    /**
     * Persists a session state.
     * 1. Writes the full resource to atomic storage (.jules/cache/<id>/session.json).
     * 2. Appends metadata to the high-speed index (.jules/cache/sessions.jsonl).
     */
    upsert(session: SessionResource): Promise<void>;

    /**
     * Bulk optimization for upserting pages from the API.
     */
    upsertMany(sessions: SessionResource[]): Promise<void>;

    /**
     * Retrieves a specific session by ID.
     * Returns undefined if not found or if the file is corrupt.
     */
    get(sessionId: string): Promise<CachedSession | undefined>;

    /**
     * Deletes a session and its associated artifacts from local cache.
     */
    delete(sessionId: string): Promise<void>;

    /**
     * Scans the high-speed index.
     * Implementation MUST handle deduplication (Last-Write-Wins) because the
     * index is an append-only log.
     */
    scanIndex(): AsyncIterable<SessionIndexEntry>;
}
```

---

### `SourceContext`

> `types.d.ts`

```ts
export interface SourceContext {
    /**
     * The name of the source (e.g., "sources/github/owner/repo").
     */
    source: string;
    /**
     * Context specific to GitHub repos.
     */
    githubRepoContext?: {
        startingBranch: string;
    };
    workingBranch?: string;
    environmentVariablesEnabled?: boolean;
}
```

---

### `SourceInput`

> `types.d.ts`

```ts
export interface SourceInput {
    /**
     * The GitHub repository identifier in the format 'owner/repo'.
     * The SDK will resolve this to the full source name (e.g., 'sources/github/owner/repo').
     */
    github: string;
    /**
     * The base branch that Jules will branch off of when starting the session.
     * Maps to `sourceContext.githubRepoContext.startingBranch` in the REST API.
     */
    baseBranch: string;
}
```

---

### `SourceManager`

> `types.d.ts`

```ts
export interface SourceManager {
    /**
     * Iterates over all connected sources.
     * Uses an Async Iterator to abstract API pagination.
     *
     * @param options Optional configuration for listing sources (filter, pageSize).
     * @example
     * for await (const source of jules.sources({ filter: 'name="sources/github/owner/repo"' })) {
     *   if (source.type === 'githubRepo') {
     *     console.log(`Found repo: ${source.githubRepo.owner}/${source.githubRepo.repo}`);
     *   }
     * }
     */
    (options?: ListSourcesOptions): AsyncIterable<Source>;

    /**
     * Locates a specific source based on ergonomic filters.
     *
     * @param filter The filter criteria (e.g., { github: 'owner/repo' }).
     * @returns The matching Source or undefined if not found.
     * @example
     * const myRepo = await jules.sources.get({ github: 'my-org/my-project' });
     */
    get(filter: {
        github: string;
    }): Promise<Source | undefined>;
}
```

---

### `SyncCheckpoint`

> `types.d.ts`

```ts
export interface SyncCheckpoint {
    lastProcessedSessionId: string;
    sessionsProcessed: number;
    startedAt: string;
}
```

---

### `SyncOptions`

> `types.d.ts`

```ts
export interface SyncOptions {
    /**
     * If set, syncs only this specific session.
     * Overrides `limit` and full-scan behavior.
     */
    sessionId?: string;
    /**
     * Maximum number of sessions to ingest in one pass.
     * @default 100
     */
    limit?: number;
    /**
     * Data depth per session.
     * @default 'metadata'
     */
    depth?: SyncDepth;
    /**
     * If true, stops when hitting a record already in the local cache.
     * @default true
     */
    incremental?: boolean;
    /**
     * Simultaneous hydration jobs. Use low values for SBCs/low bandwidth.
     * @default 3
     */
    concurrency?: number;
    /**
     * Optional callback for UI/CLI progress bars.
     */
    onProgress?: (progress: SyncProgress) => void;
    /**
     * If true, saves progress to disk and resumes from checkpoint on restart.
     * Checkpoint stored at .jules/cache/sync-checkpoint.json
     */
    checkpoint?: boolean;
    /**
     * AbortSignal to gracefully cancel the sync operation.
     * When aborted, sync returns partial stats with isComplete: false.
     * Does NOT throw an error.
     */
    signal?: AbortSignal;
}
```

---

### `SyncProgress`

> `types.d.ts`

```ts
export interface SyncProgress {
    phase: 'fetching_list' | 'hydrating_records' | 'hydrating_activities' | 'checkpoint';
    current: number;
    total?: number;
    lastIngestedId?: string;
    activityCount?: number;
}
```

---

### `SyncStats`

> `types.d.ts`

```ts
export interface SyncStats {
    sessionsIngested: number;
    activitiesIngested: number;
    isComplete: boolean;
    durationMs: number;
}
```

---

### `TimelineEntry`

> `types.d.ts`

```ts
export interface TimelineEntry {
    readonly time: string;
    readonly type: string;
    readonly summary: string;
}
```

---

### `ToJSONOptions`

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

---

### `ValidationError`

> `query/validate.d.ts`

```ts
export interface ValidationError {
    /** Error code for programmatic handling */
    code: ValidationErrorCode;
    /** JSON path to the error location (e.g., "where.artifacts.type") */
    path: string;
    /** Human-readable error message */
    message: string;
    /** Suggested fix or valid alternatives */
    suggestion?: string;
}
```

---

### `ValidationResult`

> `query/validate.d.ts`

```ts
export interface ValidationResult {
    /** Whether the query is valid */
    valid: boolean;
    /** Validation errors (if any) */
    errors: ValidationError[];
    /** Validation warnings (non-blocking issues) */
    warnings: ValidationWarning[];
    /** Auto-corrected query (if corrections were possible) */
    correctedQuery?: Record<string, unknown>;
}
```

---

### `ValidationWarning`

> `query/validate.d.ts`

```ts
export interface ValidationWarning {
    /** Warning code */
    code: string;
    /** JSON path to the warning location */
    path: string;
    /** Human-readable warning message */
    message: string;
}
```

## Types

### `Activity`

> `types.d.ts`

```ts
export type Activity = ActivityAgentMessaged | ActivityUserMessaged | ActivityPlanGenerated | ActivityPlanApproved | ActivityProgressUpdated | ActivitySessionCompleted | ActivitySessionFailed;
/**
```

---

### `ApiClientOptions`

> `api.d.ts`

```ts
export type ApiClientOptions = {
    apiKey: string | undefined;
    baseUrl: string;
    requestTimeoutMs: number;
    rateLimitRetry?: Partial<RateLimitRetryConfig>;
    maxConcurrentRequests?: number;
};
```

---

### `ApiRequestOptions`

> `api.d.ts`

```ts
export type ApiRequestOptions = {
    method?: 'GET' | 'POST';
    body?: Record<string, unknown>;
    query?: Record<string, any>;
    headers?: Record<string, string>;
    _isRetry?: boolean;
};
```

---

### `Artifact`

> `types.d.ts`

```ts
export type Artifact = ChangeSetArtifact | MediaArtifact | BashArtifact;

export interface RestChangeSetArtifact {
    changeSet: ChangeSet;
}
```

---

### `AutomationMode`

> `types.d.ts`

```ts
export type AutomationMode = 'AUTOMATION_MODE_UNSPECIFIED' | 'AUTO_CREATE_PR';
/**
```

---

### `CachedSession`

> `storage/types.d.ts`

```ts
export type CachedSession = {
    resource: SessionResource;
    _lastSyncedAt: number;
};
```

---

### `CacheTier`

> `caching.d.ts`

```ts
export type CacheTier = 'hot' | 'warm' | 'frozen';
/**
```

---

### `FilterOp`

> `types.d.ts`

```ts
export type FilterOp<V> = V | {
    eq?: V;
    neq?: V;
    contains?: string;
    gt?: V;
    lt?: V;
    gte?: V;
    lte?: V;
    in?: V[];
    exists?: boolean;
};
```

---

### `GlobalCacheInfo`

> `storage/cache-info.d.ts`

```ts
export type GlobalCacheInfo = {
    lastSyncedAt: Date;
    sessionCount: number;
};
```

---

### `IncludeClause`

> `types.d.ts`

```ts
export type IncludeClause<T extends JulesDomain> = T extends 'sessions' ? {
    activities?: boolean | {
        where?: WhereClause<'activities'>;
        limit?: number;
        select?: (keyof Activity)[];
    };
} : {
    session?: boolean | {
        select?: (keyof SessionResource)[];
    };
};
```

---

### `InternalConfig`

> `client.d.ts`

```ts
export type InternalConfig = {
    pollingIntervalMs: number;
    requestTimeoutMs: number;
};
```

---

### `JulesDomain`

> `types.d.ts`

```ts
export type JulesDomain = 'sessions' | 'activities';
/**
```

---

### `LightweightArtifact`

> `types.d.ts`

```ts
export type LightweightArtifact = Exclude<Artifact, MediaArtifact> | StrippedMediaArtifact;
/**
```

---

### `ListSessionsOptions`

> `sessions.d.ts`

```ts
export type ListSessionsOptions = {
    pageSize?: number;
    pageToken?: string;
    /**
     * Hard limit on the number of items to yield when iterating.
     * Useful if you want "The last 50" without manual counting.
     */
    limit?: number;
    /**
     * Whether to persist fetched sessions to local storage.
     * Defaults to `true` (Write-Through Caching).
     * Set to `false` to disable side effects.
     */
    persist?: boolean;
    /**
     * Filter expression to restrict the sessions returned.
     * The syntax follows the AIP-160 standard (e.g., `archived = true`).
     * By default, archived sessions are excluded.
     */
    filter?: string;
};
```

---

### `ListSessionsResponse`

> `sessions.d.ts`

```ts
export type ListSessionsResponse = {
    sessions: SessionResource[];
    nextPageToken?: string;
};
```

---

### `Origin`

> `types.d.ts`

```ts
export type Origin = 'user' | 'agent' | 'system';
/**
```

---

### `QueryResult`

> `types.d.ts`

```ts
export type QueryResult<T extends JulesDomain> = T extends 'sessions' ? SessionResource : Activity;
/**
```

---

### `RateLimitRetryConfig`

> `api.d.ts`

```ts
export type RateLimitRetryConfig = {
    maxRetryTimeMs: number;
    baseDelayMs: number;
    maxDelayMs: number;
};
```

---

### `RestArtifact`

> `types.d.ts`

```ts
export type RestArtifact = RestChangeSetArtifact | RestMediaArtifact | RestBashOutputArtifact;
/**
```

---

### `SessionCacheInfo`

> `storage/cache-info.d.ts`

```ts
export type SessionCacheInfo = {
    sessionId: string;
    activityCount: number;
    lastSyncedAt: Date;
};
```

---

### `SessionIndexEntry`

> `storage/types.d.ts`

```ts
export type SessionIndexEntry = {
    id: string;
    title: string;
    state: string;
    createTime: string;
    source: string;
    _updatedAt: number;
};
```

---

### `SessionMetadata`

> `storage/types.d.ts`

```ts
export type SessionMetadata = {
    activityCount: number;
};
```

---

### `SessionOutput`

> `types.d.ts`

```ts
export type SessionOutput = {
    type: 'pullRequest';
    pullRequest: PullRequest;
} | {
    type: 'changeSet';
    changeSet: ChangeSet;
};
```

---

### `SessionState`

> `types.d.ts`

```ts
export type SessionState = 'unspecified' | 'queued' | 'planning'
/** The agent is waiting for plan approval. Call `session.approve()`. */
```

---

### `SnapshotField`

> `types.d.ts`

```ts
export type SnapshotField = keyof SerializedSnapshot;
/**
```

---

### `Source`

> `types.d.ts`

```ts
export type Source = {
    /**
     * The full resource name (e.g., "sources/github/owner/repo").
     */
    name: string;
    /**
     * The short identifier of the source (e.g., "github/owner/repo").
     */
    id: string;
} & {
    type: 'githubRepo';
    githubRepo: GitHubRepo;
};
```

---

### `StorageFactory`

> `types.d.ts`

```ts
export type StorageFactory = {
    activity: (sessionId: string) => ActivityStorage;
    session: () => SessionStorage;
};
```

---

### `StreamActivitiesOptions`

> `streaming.d.ts`

```ts
export type StreamActivitiesOptions = {
    /**
     * Filters to exclude certain activities.
     */
    exclude?: {
        originator: Origin;
    };
    /**
     * Number of retries for initial 404 errors when session is not yet ready.
     * @default 10
     */
    initialRetries?: number;
};
```

---

### `StreamActivitiesOptions`

> `types.d.ts`

```ts
export type StreamActivitiesOptions = {
    exclude?: {
        originator: Origin;
    };
};
```

---

### `StrippedMediaArtifact`

> `types.d.ts`

```ts
export type StrippedMediaArtifact = Omit<MediaArtifact, 'data'> & {
    dataStripped: true;
    hasData: true;
};
```

---

### `SyncDepth`

> `types.d.ts`

```ts
export type SyncDepth = 'metadata' | 'activities';
/**
```

---

### `ValidationErrorCode`

> `query/validate.d.ts`

```ts
export type ValidationErrorCode = 'INVALID_STRUCTURE' | 'MISSING_REQUIRED_FIELD' | 'INVALID_DOMAIN' | 'INVALID_FIELD_PATH' | 'INVALID_OPERATOR' | 'INVALID_OPERATOR_VALUE' | 'COMPUTED_FIELD_FILTER' | 'INVALID_ORDER' | 'INVALID_LIMIT' | 'INVALID_SELECT_EXPRESSION';
/**
```

---

### `WhereClause`

> `types.d.ts`

```ts
export type WhereClause<T extends JulesDomain> = T extends 'sessions' ? {
    id?: FilterOp<string>;
    state?: FilterOp<string>;
    title?: FilterOp<string>;
    search?: string;
} : {
    id?: FilterOp<string>;
    type?: FilterOp<string>;
    sessionId?: FilterOp<string>;
    search?: string;
};
```

## Classs

### `ApiClient`

> `api.d.ts`

```ts
export declare class ApiClient {
    private readonly apiKey;
    private readonly baseUrl;
    private readonly requestTimeoutMs;
    private readonly rateLimitConfig;
    private readonly semaphore;

    constructor(options: ApiClientOptions);

    request<T>(endpoint: string, options?: ApiRequestOptions): Promise<T>;

    private resolveUrl;
    private fetchWithTimeout;
}
```

---

### `AutomatedSessionFailedError`

> `errors.d.ts`

```ts
export declare class AutomatedSessionFailedError extends JulesError {
    constructor(reason?: string);
}
```

---

### `BashArtifact`

> `artifacts.d.ts`

```ts
export declare class BashArtifact {
    readonly type = "bashOutput";
    readonly command: string;
    readonly stdout: string;
    readonly stderr: string;
    readonly exitCode: number | null;

    constructor(artifact: RestBashOutputArtifact['bashOutput']);

    /**
     * Formats the bash output as a string, mimicking a terminal session.
     *
     * **Data Transformation:**
     * - Combines `stdout` and `stderr`.
     * - Formats the command with a `$` prompt.
     * - Appends the exit code.
     */
    toString(): string;
}
```

---

### `ChangeSetArtifact`

> `artifacts.d.ts`

```ts
export declare class ChangeSetArtifact {
    readonly type: "changeSet";
    readonly source: string;
    readonly gitPatch: GitPatch;

    constructor(source: string, gitPatch: GitPatch);

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
    parsed(): ParsedChangeSet;
}
```

---

### `DefaultActivityClient`

> `activities/client.d.ts`

```ts
export declare class DefaultActivityClient implements ActivityClient {
    private storage;
    private network;
    private platform;

    constructor(storage: ActivityStorage, network: NetworkClient, platform: Platform);

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
    private _hydrateActivityArtifacts;

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
    history(): AsyncIterable<Activity>;

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
    hydrate(): Promise<number>;

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
    updates(): AsyncIterable<Activity>;

/**
```

---

### `InvalidStateError`

> `errors.d.ts`

```ts
export declare class InvalidStateError extends JulesError {
    constructor(message: string);
}
```

---

### `JulesApiError`

> `errors.d.ts`

```ts
export declare class JulesApiError extends JulesError {
    readonly url: string;
    readonly status: number;
    readonly statusText: string;

    constructor(url: string, status: number, statusText: string, message?: string, // optional override
                options?: {
                    cause?: Error;
                });
}
```

---

### `JulesAuthenticationError`

> `errors.d.ts`

```ts
export declare class JulesAuthenticationError extends JulesApiError {
    constructor(url: string, status: number, statusText: string);
}
```

---

### `JulesClientImpl`

> `client.d.ts`

```ts
export declare class JulesClientImpl implements JulesClient {
    /**
     * Manages source connections (e.g., GitHub repositories).
     */
    sources: SourceManager;
    readonly storage: SessionStorage;
    private apiClient;
    private config;
    private options;
    private storageFactory;
    private platform;
    /**
     * Lock to prevent concurrent sync operations.
     * Using a simple boolean for in-process locking.
     */
    private syncInProgress;

    /**
     * Creates a new instance of the JulesClient.
     *
     * @param options Configuration options for the client.
     * @param defaultStorageFactory Factory for creating storage instances.
     * @param defaultPlatform Platform-specific implementation.
     */
    constructor(options: JulesOptions | undefined, defaultStorageFactory: StorageFactory, defaultPlatform: Platform);

    /**
     * Fluent API for rich local querying across sessions and activities.
     * This method uses the modular query engine internally.
     */
    select<T extends JulesDomain>(query: JulesQuery<T>): Promise<QueryResult<T>[]>;

    /**
     * Synchronizes local state with the server.
     * Logic:
     * 1. Find High-Water Mark (newest local record).
     * 2. Stream latest sessions from API.
     * 3. Terminate stream early if 'incremental' and High-Water Mark is hit.
     * 4. Throttled hydration of activities if depth is 'activities'.
     */
    sync(options?: SyncOptions): Promise<SyncStats>;

    private getCheckpointPath;
    private loadCheckpoint;
    private saveCheckpoint;
    private clearCheckpoint;
    private _getHighWaterMark;
    /**
     * Helper to resolve environment variables with support for frontend prefixes.
     */
    private getEnv;

    /**
     * Creates a new Jules client instance with updated configuration.
     * This is an immutable operation; the original client instance remains unchanged.
     *
     * @param options The new configuration options to merge with the existing ones.
     * @returns A new JulesClient instance with the updated configuration.
     */
    with(options: JulesOptions): JulesClient;

/**
 * Connects to the Jules service with the provided configuration.
 * Acts as a factory method for creating a new client instance.
 *
 * @param options Configuration options for the client.
```

---

### `JulesError`

> `errors.d.ts`

```ts
export declare class JulesError extends Error {
    /** The original error that caused this error, if any. */
    readonly cause?: Error;

    constructor(message: string, options?: {
        cause?: Error;
    });
}
```

---

### `JulesNetworkError`

> `errors.d.ts`

```ts
export declare class JulesNetworkError extends JulesError {
    readonly url: string;

    constructor(url: string, options?: {
        cause?: Error;
    });
}
```

---

### `JulesRateLimitError`

> `errors.d.ts`

```ts
export declare class JulesRateLimitError extends JulesApiError {
    constructor(url: string, status: number, statusText: string);
}
```

---

### `MediaArtifact`

> `artifacts.d.ts`

```ts
export declare class MediaArtifact {
    readonly type = "media";
    readonly data: string;
    readonly format: string;
    private platform;
    private activityId?;

    constructor(artifact: RestMediaArtifact['media'], platform: Platform, activityId?: string);

    /**
     * Saves the media artifact to a file.
     *
     * **Side Effects:**
     * - Node.js: Writes the file to disk (overwrites if exists).
     * - Browser: Saves the file to the 'artifacts' object store in IndexedDB.
     *
     * @param filepath The path where the file should be saved.
     */
    save(filepath: string): Promise<void>;

    /**
     * Converts the media artifact to a data URL.
     * Useful for displaying images in a browser.
     *
     * **Data Transformation:**
     * - Prefixes the base64 data with `data:<mimeType>;base64,`.
     *
     * @returns A valid Data URI string.
     */
    toUrl(): string;
}
```

---

### `MemorySessionStorage`

> `storage/memory.d.ts`

```ts
export declare class MemorySessionStorage implements SessionStorage {
    private sessions;
    private index;

    init(): Promise<void>;

    upsert(session: SessionResource): Promise<void>;

    upsertMany(sessions: SessionResource[]): Promise<void>;

    get(sessionId: string): Promise<CachedSession | undefined>;

    delete(sessionId: string): Promise<void>;

    scanIndex(): AsyncIterable<SessionIndexEntry>;
}
```

---

### `MemoryStorage`

> `storage/memory.d.ts`

```ts
export declare class MemoryStorage implements ActivityStorage {
    private activities;
    private indices;

    /**
     * Initializes the storage. No-op for memory storage.
     */
    init(): Promise<void>;

    /**
     * Closes the storage and clears memory.
     */
    close(): Promise<void>;

    /**
     * Appends an activity to the in-memory list.
     *
     * **Guarantee:**
     * - Idempotent: If an activity with the same ID exists, it updates it in place.
     * - Append-only: New activities are always added to the end.
     *
     * **Side Effects:**
     * - Modifies the internal `activities` array.
     */
    append(activity: Activity): Promise<void>;

    /**
     * Retrieves an activity by ID.
     */
    get(activityId: string): Promise<Activity | undefined>;

    /**
     * Retrieves the latest activity.
     */
    latest(): Promise<Activity | undefined>;

    /**
     * Yields all activities in chronological order.
     */
    scan(): AsyncIterable<Activity>;
}
```

---

### `MissingApiKeyError`

> `errors.d.ts`

```ts
export declare class MissingApiKeyError extends JulesError {
    constructor();
}
```

---

### `NetworkAdapter`

> `network/adapter.d.ts`

```ts
export declare class NetworkAdapter implements NetworkClient {
    private apiClient;
    private sessionId;
    private pollingIntervalMs;
    private platform;

    constructor(apiClient: ApiClient, sessionId: string, pollingIntervalMs: number | undefined, platform: Platform);

    /**
     * Fetches a single activity from the API.
     */
    fetchActivity(activityId: string): Promise<Activity>;

    /**
     * Lists activities from the API with pagination.
     */
    listActivities(options?: ListOptions): Promise<{
        activities: Activity[];
        nextPageToken?: string;
    }>;

    /**
     * Polls the API for new activities and yields them.
     * This stream never ends unless the process is terminated.
     */
    rawStream(): AsyncIterable<Activity>;
}
```

---

### `NodeFileStorage`

> `storage/node-fs.d.ts`

```ts
export declare class NodeFileStorage implements ActivityStorage {
    private filePath;
    private metadataPath;
    private initialized;
    private writeStream;
    private index;
    private indexBuilt;
    private indexBuildPromise;
    private currentFileSize;

    constructor(sessionId: string, rootDir: string);

    /**
     * Initializes the storage by ensuring the cache directory exists.
     *
     * **Side Effects:**
     * - Creates the `.jules/cache/<sessionId>` directory if it does not exist.
     * - Sets the internal `initialized` flag.
     */
    init(): Promise<void>;

    /**
     * Closes the storage.
     */
    close(): Promise<void>;

    private _readMetadata;
    private _writeMetadata;

    /**
     * Appends an activity to the file.
     *
     * **Side Effects:**
     * - Appends a new line containing the JSON representation of the activity to `activities.jsonl`.
     * - Implicitly calls `init()` if not already initialized.
     */
    append(activity: Activity): Promise<void>;

    /**
     * Builds the in-memory index by scanning the file once.
     * Handles concurrency by coalescing multiple calls into a single promise.
     */
    private buildIndex;

    /**
     * Retrieves an activity by ID.
     * Uses an in-memory index (ID -> Offset) to seek directly to the line.
     */
    get(activityId: string): Promise<Activity | undefined>;

    /**
     * Retrieves the latest activity.
     * Efficiently reads the file backwards to find the last valid entry.
     */
    latest(): Promise<Activity | undefined>;

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
    scan(): AsyncIterable<Activity>;
```

---

### `NodePlatform`

> `platform/node.d.ts`

```ts
export declare class NodePlatform implements Platform {
    /**
     * Saves a file to the local filesystem using `node:fs/promises`.
     *
     * **Side Effects:**
     * - Writes a file to disk.
     * - Overwrites the file if it already exists.
     */
    saveFile(filepath: string, data: string, encoding: 'base64', activityId?: string): Promise<void>;

    sleep(ms: number): Promise<void>;

    createDataUrl(data: string, mimeType: string): string;

    fetch(input: string, init?: any): Promise<PlatformResponse>;

    crypto: {
        randomUUID: () => `${string}-${string}-${string}-${string}-${string}`;
        sign(text: string, secret: string): Promise<string>;
        verify(text: string, signature: string, secret: string): Promise<boolean>;
    };
    encoding: {
        base64Encode: (text: string) => string;
        base64Decode: (text: string) => string;
    };

    getEnv(key: string): string | undefined;

    readFile(path: string): Promise<string>;

    writeFile(path: string, content: string): Promise<void>;

    deleteFile(path: string): Promise<void>;
}
```

---

### `NodeSessionStorage`

> `storage/node-fs.d.ts`

```ts
export declare class NodeSessionStorage implements SessionStorage {
    private cacheDir;
    private indexFilePath;
    private initialized;

    constructor(rootDir: string);

    init(): Promise<void>;

    private getSessionPath;

    upsert(session: SessionResource): Promise<void>;

    upsertMany(sessions: SessionResource[]): Promise<void>;

    get(sessionId: string): Promise<CachedSession | undefined>;

    delete(sessionId: string): Promise<void>;

    scanIndex(): AsyncIterable<SessionIndexEntry>;
}
```

---

### `SessionClientImpl`

> `session.d.ts`

```ts
export declare class SessionClientImpl implements SessionClient {
    readonly id: string;
    private apiClient;
    private config;
    private sessionStorage;
    private _activities;
    private platform;

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
    constructor(sessionId: string, apiClient: ApiClient, config: InternalConfig, activityStorage: ActivityStorage, sessionStorage: SessionStorage, // Injected dependency
                platform: any);

    private request;

    /**
     * COLD STREAM: Yields all known past activities from local storage.
     * If local cache is empty, fetches from network first.
     */
    history(): AsyncIterable<Activity>;

    /**
     * Forces a full sync of activities from the network to local cache.
     * @returns The number of new activities synced.
     */
    hydrate(): Promise<number>;

    /**
     * HOT STREAM: Yields ONLY future activities as they arrive from the network.
     */
    updates(): AsyncIterable<Activity>;

    /**
     * LOCAL QUERY: Performs rich filtering against local storage only.
     *
     * @deprecated Use `session.activities.select()` instead.
     */
    select(options?: SelectOptions): Promise<Activity[]>;

    /**
     * Scoped access to activity-specific operations.
     */
    get activities(): ActivityClient;

    /**
     * Provides a real-time stream of activities for the session.
     *
     * @param options Options to control the stream.
     */
    stream(options?: StreamActivitiesOptions): AsyncIterable<Activity>;

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
```

---

### `SessionCursor`

> `sessions.d.ts`

```ts
export declare class SessionCursor implements PromiseLike<ListSessionsResponse>, AsyncIterable<SessionResource> {
    private apiClient;
    private storage;
    private platform;
    private options;

    constructor(apiClient: ApiClient, storage: SessionStorage, platform: any, options?: ListSessionsOptions);

    /**
     * DX Feature: Promise Compatibility.
     * Allows `const page = await jules.sessions()` to just get the first page.
     * This is great for UIs that render a list and a "Load More" button.
     */
    then<TResult1 = ListSessionsResponse, TResult2 = never>(onfulfilled?: ((value: ListSessionsResponse) => TResult1 | PromiseLike<TResult1>) | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | null): PromiseLike<TResult1 | TResult2>;

    /**
     * DX Feature: Async Iterator.
     * Allows `for await (const s of jules.sessions())` to stream ALL items.
     * Automatically handles page tokens and fetching behind the scenes.
     */
    [Symbol.asyncIterator](): AsyncIterator<SessionResource>;

    /**
     * Helper to fetch all pages into a single array.
     * WARNING: Use with caution on large datasets.
     */
    all(): Promise<SessionResource[]>;

    /**
     * Internal fetcher that maps the options to the REST parameters.
     */
    private fetchPage;
}
```

---

### `SessionSnapshotImpl`

> `snapshot.d.ts`

```ts
export declare class SessionSnapshotImpl implements SessionSnapshot {
    readonly id: string;
    readonly state: SessionState;
    readonly url: string;
    readonly createdAt: Date;
    readonly updatedAt: Date;
    readonly durationMs: number;
    readonly prompt: string;
    readonly title: string;
    readonly pr?: PullRequest;
    readonly activities: readonly Activity[];
    readonly activityCounts: Readonly<Record<string, number>>;
    readonly timeline: readonly TimelineEntry[];
    readonly insights: SessionInsights;
    readonly generatedFiles: GeneratedFiles;
    readonly changeSet: () => ChangeSetArtifact | undefined;

    constructor(options: SessionSnapshotOptions);

    private computeActivityCounts;
    private computeTimeline;
    private generateSummary;
    private computeInsights;

    toJSON(options?: ToJSONOptions): Partial<SerializedSnapshot>;

    toMarkdown(): string;
}
```

---

### `SourceNotFoundError`

> `errors.d.ts`

```ts
export declare class SourceNotFoundError extends JulesError {
    constructor(sourceIdentifier: string);
}
```

---

### `SyncInProgressError`

> `errors.d.ts`

```ts
export declare class SyncInProgressError extends JulesError {
    constructor();
}
```

---

### `TimeoutError`

> `errors.d.ts`

```ts
export declare class TimeoutError extends JulesError {
    constructor(message: string);
}
```

## Functions

### `computeArtifactCount`

> `query/computed.d.ts`

```ts
export declare function computeArtifactCount(activity: Activity): number;
/**
```

---

### `computeDurationMs`

> `query/computed.d.ts`

```ts
export declare function computeDurationMs(session: {
    createTime?: string;
    updateTime?: string;
}): number;
```

---

### `computeSummary`

> `query/computed.d.ts`

```ts
export declare function computeSummary(activity: Activity): string;
/**
```

---

### `connect`

> `index.d.ts`

```ts
export declare function connect(options?: JulesOptions): JulesClient;

/**
```

---

### `createGeneratedFiles`

> `artifacts.d.ts`

```ts
export declare function createGeneratedFiles(files: GeneratedFile[]): GeneratedFiles;
/**
```

---

### `createSourceManager`

> `sources.d.ts`

```ts
export declare function createSourceManager(apiClient: ApiClient): SourceManager;
```

---

### `deepClone`

> `query/projection.d.ts`

```ts
export declare function deepClone<T>(obj: T): T;
/**
```

---

### `deletePath`

> `query/projection.d.ts`

```ts
export declare function deletePath(obj: unknown, path: string[]): void;
/**
```

---

### `determineCacheTier`

> `caching.d.ts`

```ts
export declare function determineCacheTier(cached: CachedSession, now?: number): CacheTier;
/**
```

---

### `formatValidationResult`

> `query/validate.d.ts`

```ts
export declare function formatValidationResult(result: ValidationResult): string;
```

---

### `generateMarkdownDocs`

> `query/schema.d.ts`

```ts
export declare function generateMarkdownDocs(): string;
```

---

### `generateTypeDefinition`

> `query/schema.d.ts`

```ts
export declare function generateTypeDefinition(domain: 'sessions' | 'activities'): string;

/**
```

---

### `getActivityCount`

> `storage/cache-info.d.ts`

```ts
export declare function getActivityCount(sessionId: string, rootDirOverride?: string): Promise<number>;
export declare function getLatestActivities(sessionId: string, n: number, rootDirOverride?: string): Promise<Activity[]>;
```

---

### `getAllSchemas`

> `query/schema.d.ts`

```ts
export declare function getAllSchemas(): {
    sessions: DomainSchema;
    activities: DomainSchema;
    filterOps: typeof FILTER_OP_SCHEMA;
    projection: typeof PROJECTION_SCHEMA;
};
```

---

### `getCacheInfo`

> `storage/cache-info.d.ts`

```ts
export declare function getCacheInfo(rootDirOverride?: string): Promise<GlobalCacheInfo>;
export declare function getSessionCount(rootDirOverride?: string): Promise<number>;
```

---

### `getLatestActivities`

> `storage/cache-info.d.ts`

```ts
export declare function getLatestActivities(sessionId: string, n: number, rootDirOverride?: string): Promise<Activity[]>;
```

---

### `getPath`

> `query/projection.d.ts`

```ts
export declare function getPath(obj: unknown, path: string[]): unknown;
/**
```

---

### `getRootDir`

> `storage/root.d.ts`

```ts
export declare function getRootDir(): string;
```

---

### `getSchema`

> `query/schema.d.ts`

```ts
export declare function getSchema(domain: 'sessions' | 'activities'): DomainSchema;
/**
```

---

### `getSessionCacheInfo`

> `storage/cache-info.d.ts`

```ts
export declare function getSessionCacheInfo(sessionId: string, rootDirOverride?: string): Promise<SessionCacheInfo | null>;
export declare function updateGlobalCacheMetadata(rootDirOverride?: string): Promise<void>;
```

---

### `getSessionCount`

> `storage/cache-info.d.ts`

```ts
export declare function getSessionCount(rootDirOverride?: string): Promise<number>;
export declare function getActivityCount(sessionId: string, rootDirOverride?: string): Promise<number>;
```

---

### `injectActivityComputedFields`

> `query/computed.d.ts`

```ts
export declare function injectActivityComputedFields(activity: Activity, selectFields?: string[]): Activity & {
    artifactCount?: number;
    summary?: string;
};
```

---

### `injectSessionComputedFields`

> `query/computed.d.ts`

```ts
export declare function injectSessionComputedFields<T extends {
    createTime?: string;
    updateTime?: string;
}>(session: T, selectFields?: string[]): T & {
    durationMs?: number;
};
```

---

### `isActivityComputedField`

> `query/computed.d.ts`

```ts
export declare function isActivityComputedField(field: string): boolean;
/**
```

---

### `isCacheValid`

> `caching.d.ts`

```ts
export declare function isCacheValid(cached: CachedSession | undefined, now?: number): cached is CachedSession;
```

---

### `isPathPrefix`

> `query/projection.d.ts`

```ts
export declare function isPathPrefix(prefix: string[], path: string[]): boolean;
```

---

### `isSessionComputedField`

> `query/computed.d.ts`

```ts
export declare function isSessionComputedField(field: string): boolean;
/**
```

---

### `isSessionFrozen`

> `utils/page-token.d.ts`

```ts
export declare function isSessionFrozen(lastActivityCreateTime: string, thresholdDays?: number): boolean;
```

---

### `isWritable`

> `storage/root.d.ts`

```ts
export declare function isWritable(dir: string): boolean;
export declare function getRootDir(): string;
```

---

### `mapRestActivityToSdkActivity`

> `mappers.d.ts`

```ts
export declare function mapRestActivityToSdkActivity(restActivity: any, platform: any): Activity;
export declare function mapRestStateToSdkState(state: string): SessionState;
```

---

### `mapRestArtifactToSdkArtifact`

> `mappers.d.ts`

```ts
export declare function mapRestArtifactToSdkArtifact(restArtifact: RestArtifact, platform: any, activityId?: string): Artifact;
/**
```

---

### `mapRestOutputToSdkOutput`

> `mappers.d.ts`

```ts
export declare function mapRestOutputToSdkOutput(rest: RestSessionOutput): SessionOutput;

export declare function mapRestSessionToSdkSession(rest: RestSessionResource, platform?: any): SessionResource;
```

---

### `mapRestSessionToSdkSession`

> `mappers.d.ts`

```ts
export declare function mapRestSessionToSdkSession(rest: RestSessionResource, platform?: any): SessionResource;

/**
```

---

### `mapRestSourceToSdkSource`

> `mappers.d.ts`

```ts
export declare function mapRestSourceToSdkSource(rest: RestSource): Source;
export declare function mapRestOutputToSdkOutput(rest: RestSessionOutput): SessionOutput;
```

---

### `mapRestStateToSdkState`

> `mappers.d.ts`

```ts
export declare function mapRestStateToSdkState(state: string): SessionState;
export declare function mapRestSourceToSdkSource(rest: RestSource): Source;
```

---

### `mapSessionResourceToOutcome`

> `mappers.d.ts`

```ts
export declare function mapSessionResourceToOutcome(session: SessionResource): SessionOutcome;
```

---

### `pageTokenToDate`

> `utils/page-token.d.ts`

```ts
export declare function pageTokenToDate(token: string): Date;
/**
```

---

### `parseSelectExpression`

> `query/projection.d.ts`

```ts
export declare function parseSelectExpression(expr: string): SelectExpression;
/**
```

---

### `parseUnidiff`

> `artifacts.d.ts`

```ts
export declare function parseUnidiff(patch?: string | null): ParsedFile[];
/**
```

---

### `parseUnidiffWithContent`

> `artifacts.d.ts`

```ts
export declare function parseUnidiffWithContent(patch?: string | null): GeneratedFile[];
/**
```

---

### `pMap`

> `utils.d.ts`

```ts
export declare function pMap<T, R>(items: T[], mapper: (item: T, index: number) => Promise<R>, options?: {
    concurrency?: number;
    stopOnError?: boolean;
    delayMs?: number;
}): Promise<R[]>;
```

---

### `pollSession`

> `polling.d.ts`

```ts
export declare function pollSession(sessionId: string, apiClient: ApiClient, predicateFn: (session: SessionResource) => boolean, pollingInterval: number, platform: any, timeoutMs?: number): Promise<SessionResource>;
/**
```

---

### `pollUntilCompletion`

> `polling.d.ts`

```ts
export declare function pollUntilCompletion(sessionId: string, apiClient: ApiClient, pollingInterval: number, platform: any, timeoutMs?: number): Promise<SessionResource>;
```

---

### `projectDocument`

> `query/projection.d.ts`

```ts
export declare function projectDocument(doc: Record<string, unknown>, selects: string[]): Record<string, unknown>;
/**
```

---

### `select`

> `query/select.d.ts`

```ts
export declare function select<T extends JulesDomain>(client: JulesClient, query: JulesQuery<T>): Promise<QueryResult<T>[]>;
```

---

### `setPath`

> `query/projection.d.ts`

```ts
export declare function setPath(obj: Record<string, unknown>, path: string[], value: unknown): void;
/**
```

---

### `streamActivities`

> `streaming.d.ts`

```ts
export declare function streamActivities(sessionId: string, apiClient: ApiClient, pollingInterval: number, platform: Platform, options?: StreamActivitiesOptions): AsyncGenerator<Activity>;
```

---

### `toSummary`

> `activities/summary.d.ts`

```ts
export declare function toSummary(activity: Activity): ActivitySummary;
```

---

### `updateGlobalCacheMetadata`

> `storage/cache-info.d.ts`

```ts
export declare function updateGlobalCacheMetadata(rootDirOverride?: string): Promise<void>;
export declare function getCacheInfo(rootDirOverride?: string): Promise<GlobalCacheInfo>;
```

---

### `validateQuery`

> `query/validate.d.ts`

```ts
export declare function validateQuery(query: unknown): ValidationResult;

/**
```

---

### `withFirstRequestRetry`

> `retry-utils.d.ts`

```ts
export declare function withFirstRequestRetry<T>(fn: () => Promise<T>, options?: FirstRequestRetryOptions): Promise<T>;
```

## Consts

### `ACTIVITY_COMPUTED_FIELDS`

> `query/computed.d.ts`

```ts
export declare const ACTIVITY_COMPUTED_FIELDS: readonly ["artifactCount", "summary"];
/**
```

---

### `ACTIVITY_SCHEMA`

> `query/schema.d.ts`

```ts
export declare const ACTIVITY_SCHEMA: DomainSchema;
/**
```

---

### `DEFAULT_ACTIVITY_PROJECTION`

> `query/computed.d.ts`

```ts
export declare const DEFAULT_ACTIVITY_PROJECTION: string[];
/**
```

---

### `DEFAULT_SESSION_PROJECTION`

> `query/computed.d.ts`

```ts
export declare const DEFAULT_SESSION_PROJECTION: string[];
```

---

### `FILTER_OP_SCHEMA`

> `query/schema.d.ts`

```ts
export declare const FILTER_OP_SCHEMA: {
    description: string;
    operators: {
        name: string;
        description: string;
        example: string;
    }[];
    dotNotation: {
        description: string;
        examples: string[];
    };
};
```

---

### `jules`

> `index.d.ts`

```ts
export declare const jules: JulesClient;
export * from './errors.js';
```

---

### `jules`

> `types.d.ts`

```ts
export declare const jules: JulesClient;
```

---

### `PROJECTION_SCHEMA`

> `query/schema.d.ts`

```ts
export declare const PROJECTION_SCHEMA: {
    description: string;
    syntax: {
        name: string;
        description: string;
        example: string;
    }[];
    defaults: {
        sessions: string[];
        activities: string[];
    };
};
```

---

### `SESSION_COMPUTED_FIELDS`

> `query/computed.d.ts`

```ts
export declare const SESSION_COMPUTED_FIELDS: readonly ["durationMs"];
/**
```

---

### `SESSION_SCHEMA`

> `query/schema.d.ts`

```ts
export declare const SESSION_SCHEMA: DomainSchema;
/**
```
