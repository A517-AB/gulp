# modjules API

**Total exported symbols: 201**

## Contents

- [Interfaces](#interfaces) (68)
- [Types](#types) (40)
- [Classs](#classs) (35)
- [Functions](#functions) (39)
- [Consts](#consts) (19)

## Interfaces

### `ActivityAgentMessaged`

> `types.ts`

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

> `activities/types.ts`

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
  list(
    options?: ListOptions,
  ): Promise<{ activities: Activity[]; nextPageToken?: string }>;

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

> `types.ts`

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

> `types.ts`

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

> `types.ts`

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

> `types.ts`

```ts
export interface ActivitySessionCompleted extends BaseActivity {
  type: 'sessionCompleted';
}
```

---

### `ActivitySessionFailed`

> `types.ts`

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

> `storage/types.ts`

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

> `types.ts`

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

> `types.ts`

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

> `types.ts`

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
  result(): Promise<Outcome>;
}
```

---

### `BashArtifact`

> `types.ts`

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

### `CachedPR`

> `github/types.ts`

```ts
export interface CachedPR {
  resource: PRResource;
  _lastSyncedAt: number;
}
```

---

### `ChangeSet`

> `types.ts`

```ts
export interface ChangeSet {
  source: string;
  gitPatch: GitPatch;
}
```

---

### `ChangeSetArtifact`

> `types.ts`

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

> `query/schema.ts`

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

> `query/schema.ts`

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

> `retry-utils.ts`

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

### `GitHubAdapter`

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

---

### `GitHubConfig`

> `github/types.ts`

```ts
export interface GitHubConfig {
  token: string;
  baseUrl?: string; // Default: 'https://api.github.com'
  pollingIntervalMs?: number; // Default: 30000
}
```

---

### `GitHubRepo`

> `types.ts`

```ts
export interface GitHubRepo {
  owner: string;
  repo: string;
  isPrivate: boolean;
}
```

---

### `GitHubUser`

> `github/types.ts`

```ts
export interface GitHubUser {
  id: number;
  login: string;
  type: 'User' | 'Bot' | 'Organization';
  avatarUrl?: string;
}
```

---

### `GitPatch`

> `types.ts`

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

> `storage/types.ts`

```ts
export interface GlobalCacheMetadata {
  lastSyncedAt: number;
  sessionCount: number;
}
```

---

### `JulesClient`

> `types.ts`

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
   *   source: { github: 'my-org/my-project', branch: 'main' }
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
   *   source: { github: 'my-org/my-project', branch: 'develop' }
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
```

---

### `JulesOptions`

> `types.ts`

```ts
export interface JulesOptions {
  /**
   * The API key used for authentication.
   * If not provided, the SDK will attempt to read it from the JULES_API_KEY environment variable.
   * Authenticates requests via the `X-Goog-Api-Key` header.
   */
  apiKey?: string;
  /**
   * Proxy Configuration (Browser / Client Mode).
   * Allows the SDK to communicate via a trusted proxy (e.g. Google Apps Script)
   * to handle authentication securely without exposing API keys.
   */
  proxy?: ProxyConfig;
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
```

---

### `JulesQuery`

> `types.ts`

```ts
export interface JulesQuery<T extends JulesDomain> {
  from: T;
  select?: T extends 'sessions'
    ? (keyof SessionResource)[]
    : (keyof Activity)[];
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

> `types.ts`

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

> `activities/types.ts`

```ts
export interface ListOptions {
  pageSize?: number;
  pageToken?: string;
  filter?: string;
}
```

---

### `MediaArtifact`

> `types.ts`

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

> `activities/client.ts`

```ts
export interface NetworkClient {
  rawStream(): AsyncIterable<Activity>;
  listActivities(
    options?: ListOptions,
  ): Promise<{ activities: Activity[]; nextPageToken?: string }>;
  fetchActivity(activityId: string): Promise<Activity>;
}
```

---

### `Outcome`

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

---

### `ParsedChangeSet`

> `types.ts`

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

> `types.ts`

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

> `types.ts`

```ts
export interface Plan {
  id: string;
  steps: PlanStep[];
  createTime: string;
}
```

---

### `PlanStep`

> `types.ts`

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

> `platform/types.ts`

```ts
export interface Platform {
  /**
   * Saves a file to the platform's filesystem.
   */
  saveFile(
    filepath: string,
    data: string,
    encoding: 'base64',
    activityId?: string,
  ): Promise<void>;

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
```

---

### `PlatformResponse`

> `platform/types.ts`

```ts
export interface PlatformResponse {
  ok: boolean;
  status: number;
  json<T = any>(): Promise<T>;
  text(): Promise<string>;
}
```

---

### `PRClient`

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

---

### `ProxyConfig`

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

---

### `PRResource`

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

---

### `PullRequest`

> `types.ts`

```ts
export interface PullRequest {
  url: string;
  title: string;
  description: string;
}
```

---

### `QueryExample`

> `query/schema.ts`

```ts
export interface QueryExample {
  /** Natural language description */
  description: string;
  /** JQL query */
  query: Record<string, unknown>;
}
```

---

### `RateLimitInfo`

> `github/types.ts`

```ts
export interface RateLimitInfo {
  limit: number;
  remaining: number;
  used: number;
  reset: Date;
}
```

---

### `RestBashOutputArtifact`

> `types.ts`

```ts
export interface RestBashOutputArtifact {
  bashOutput: {
    command: string;
    stdout: string;
    stderr: string;
    exitCode: number | null;
  };
}
```

---

### `RestChangeSetArtifact`

> `types.ts`

```ts
export interface RestChangeSetArtifact {
  changeSet: ChangeSet;
}
```

---

### `RestMediaArtifact`

> `types.ts`

```ts
export interface RestMediaArtifact {
  media: {
    data: string;
    format: string;
  };
}
```

---

### `SelectExpression`

> `query/projection.ts`

```ts
export interface SelectExpression {
  path: string[];
  exclude: boolean;
  wildcard: boolean;
}
```

---

### `SelectOptions`

> `activities/types.ts`

```ts
export interface SelectOptions {
  after?: string; // Activity ID
  before?: string; // Activity ID
  type?: string; // Activity Type
  limit?: number;
  order?: 'asc' | 'desc';
}
```

---

### `SerializedSnapshot`

> `types.ts`

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
  insights: {
    completionAttempts: number;
    planRegenerations: number;
    userInterventions: number;
    failedCommandCount: number;
  };
  pr?: { url: string; title: string; description: string };
}
```

---

### `SessionClient`

> `types.ts`

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
```

---

### `SessionConfig`

> `types.ts`

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
   * Optional title for the session. If not provided, the system will generate one.
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
  /**
   * The ID of the user who owns this session.
   * This is primarily used by the Proxy/Authorization layer to enforce permissions.
   */
  ownerId?: string;
}
```

---

### `SessionInsights`

> `types.ts`

```ts
export interface SessionInsights {
  readonly completionAttempts: number;
  readonly planRegenerations: number;
  readonly userInterventions: number;
  readonly failedCommands: readonly Activity[];
}
```

---

### `SessionResource`

> `types.ts`

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
  source: Source;
  title: string;
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
  /**
   * The final outcome of the session, if it is in a terminal state.
   */
  outcome?: {
    status: 'SUCCESS' | 'FAILURE';
    summary: string;
  };
}
```

---

### `SessionSnapshot`

> `types.ts`

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
  toJSON(): SerializedSnapshot;
  toMarkdown(): string;
}
```

---

### `SessionStorage`

> `storage/types.ts`

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

> `types.ts`

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
}
```

---

### `SourceInput`

> `types.ts`

```ts
export interface SourceInput {
  /**
   * The GitHub repository identifier in the format 'owner/repo'.
   * The SDK will resolve this to the full source name (e.g., 'sources/github/owner/repo').
   */
  github: string;
  /**
   * The name of the branch to start the session from.
   * Maps to `sourceContext.githubRepoContext.startingBranch` in the REST API.
   */
  branch: string;
  /**
   * Whether to enable access to environment variables configured in the Jules dashboard.
   * When true, Jules can access secure environment variables you've set up for this source.
   * Maps to `sourceContext.githubRepoContext.environmentVariablesEnabled` in the REST API.
   *
   * @default undefined (uses source's default configuration)
   */
  environmentVariablesEnabled?: boolean;
}
```

---

### `SourceManager`

> `types.ts`

```ts
export interface SourceManager {
  /**
   * Iterates over all connected sources.
   * Uses an Async Iterator to abstract API pagination.
   *
   * @example
   * for await (const source of jules.sources()) {
   *   if (source.type === 'githubRepo') {
   *     console.log(`Found repo: ${source.githubRepo.owner}/${source.githubRepo.repo}`);
   *   }
   * }
   */
  (): AsyncIterable<Source>;

  /**
   * Locates a specific source based on ergonomic filters.
   *
   * @param filter The filter criteria (e.g., { github: 'owner/repo' }).
   * @returns The matching Source or undefined if not found.
   * @example
   * const myRepo = await jules.sources.get({ github: 'my-org/my-project' });
   */
  get(filter: { github: string }): Promise<Source | undefined>;
}
```

---

### `SyncCheckpoint`

> `types.ts`

```ts
export interface SyncCheckpoint {
  lastProcessedSessionId: string;
  sessionsProcessed: number;
  startedAt: string; // ISO timestamp
}
```

---

### `SyncOptions`

> `types.ts`

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

> `types.ts`

```ts
export interface SyncProgress {
  phase:
    | 'fetching_list'
    | 'hydrating_records'
    | 'hydrating_activities'
    | 'checkpoint';
  current: number;
  total?: number;
  lastIngestedId?: string;
  activityCount?: number;
}
```

---

### `SyncStats`

> `types.ts`

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

> `types.ts`

```ts
export interface TimelineEntry {
  readonly time: string;
  readonly type: string;
  readonly summary: string;
}
```

---

### `ValidationError`

> `query/validate.ts`

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

> `query/validate.ts`

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

> `query/validate.ts`

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

---

### `WorkflowBuilderSpec`

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

## Types

### `Activity`

> `types.ts`

```ts
export type Activity =
  | ActivityAgentMessaged
```

---

### `AddJobInput`

> `workflows/spec.ts`

```ts
export type AddJobInput = z.infer<typeof AddJobInputSchema>;
```

---

### `ApiClientOptions`

> `api.ts`

```ts
export type ApiClientOptions = {
  apiKey: string | undefined;
  baseUrl: string;
  requestTimeoutMs: number;
  proxy?: ProxyConfig;
  rateLimitRetry?: Partial<RateLimitRetryConfig>;
};
```

---

### `ApiRequestOptions`

> `api.ts`

```ts
export type ApiRequestOptions = {
  method?: 'GET' | 'POST';
  body?: Record<string, unknown>;
  query?: Record<string, any>;
  headers?: Record<string, string>;
  handshake?: HandshakeContext;
  _isRetry?: boolean; // Internal flag to prevent infinite loops
};
```

---

### `Artifact`

> `types.ts`

```ts
export type Artifact = ChangeSetArtifact | MediaArtifact | BashArtifact;
```

---

### `BuilderError`

> `workflows/spec.ts`

```ts
export type BuilderError = z.infer<typeof BuilderErrorSchema>;
```

---

### `BuilderErrorCode`

> `workflows/spec.ts`

```ts
export type BuilderErrorCode = z.infer<typeof BuilderErrorCode>;
```

---

### `BuilderResult`

> `workflows/spec.ts`

```ts
export type BuilderResult = z.infer<typeof BuilderResultSchema>;
```

---

### `CachedSession`

> `storage/types.ts`

```ts
export type CachedSession = {
  resource: SessionResource;
  _lastSyncedAt: number; // Epoch timestamp of last successful network sync
};
```

---

### `CacheTier`

> `caching.ts`

```ts
export type CacheTier = 'hot' | 'warm' | 'frozen';
```

---

### `FilterOp`

> `types.ts`

```ts
export type FilterOp<V> =
  | V
```

---

### `GlobalCacheInfo`

> `storage/cache-info.ts`

```ts
export type GlobalCacheInfo = {
  lastSyncedAt: Date;
  sessionCount: number;
};
```

---

### `HandshakeContext`

> `api.ts`

```ts
export type HandshakeContext =
  | { intent: 'create'; sessionConfig: any }
```

---

### `IncludeClause`

> `types.ts`

```ts
export type IncludeClause<T extends JulesDomain> = T extends 'sessions'
  ? {
      activities?:
        | boolean
        | {
            where?: WhereClause<'activities'>;
            limit?: number;
            select?: (keyof Activity)[];
          };
    }
```

---

### `InternalConfig`

> `client.ts`

```ts
export type InternalConfig = {
  pollingIntervalMs: number;
  requestTimeoutMs: number;
};
```

---

### `JobDefinition`

> `workflows/spec.ts`

```ts
export type JobDefinition = z.infer<typeof JobSchema>;
export type WorkflowState = z.infer<typeof WorkflowStateSchema>;
```

---

### `JulesDomain`

> `types.ts`

```ts
export type JulesDomain = 'sessions' | 'activities';
```

---

### `LightweightArtifact`

> `types.ts`

```ts
export type LightweightArtifact =
  | Exclude<Artifact, MediaArtifact>
```

---

### `ListSessionsOptions`

> `sessions.ts`

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
};
```

---

### `ListSessionsResponse`

> `sessions.ts`

```ts
export type ListSessionsResponse = {
  sessions: SessionResource[];
  nextPageToken?: string;
};
```

---

### `Origin`

> `types.ts`

```ts
export type Origin = 'user' | 'agent' | 'system';
```

---

### `QueryResult`

> `types.ts`

```ts
export type QueryResult<T extends JulesDomain> = T extends 'sessions'
  ? SessionResource
```

---

### `RateLimitRetryConfig`

> `api.ts`

```ts
export type RateLimitRetryConfig = {
  maxRetryTimeMs: number;
  baseDelayMs: number;
  maxDelayMs: number;
};
```

---

### `RestArtifact`

> `types.ts`

```ts
export type RestArtifact =
  | RestChangeSetArtifact
```

---

### `SessionCacheInfo`

> `storage/cache-info.ts`

```ts
export type SessionCacheInfo = {
  sessionId: string;
  activityCount: number;
  lastSyncedAt: Date;
};
```

---

### `SessionIndexEntry`

> `storage/types.ts`

```ts
export type SessionIndexEntry = {
  id: string;
  title: string;
  state: string;
  createTime: string;
  source: string; // "sources/github/..."
  _updatedAt: number; // Local write time
};
```

---

### `SessionMetadata`

> `storage/types.ts`

```ts
export type SessionMetadata = {
  activityCount: number;
};
```

---

### `SessionOutput`

> `types.ts`

```ts
export type SessionOutput =
  | {
      type: 'pullRequest';
      pullRequest: PullRequest;
    }
```

---

### `SessionState`

> `types.ts`

```ts
export type SessionState =
  | 'unspecified'
```

---

### `Source`

> `types.ts`

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
  /**
   * Whether environment variables configured in the dashboard are enabled for this source.
   */
  environmentVariablesEnabled?: boolean;
} & {
  type: 'githubRepo';
  githubRepo: GitHubRepo;
};
```

---

### `StepDefinition`

> `workflows/spec.ts`

```ts
export type StepDefinition = z.infer<typeof StepSchema>;
export type JobDefinition = z.infer<typeof JobSchema>;
```

---

### `StorageFactory`

> `types.ts`

```ts
export type StorageFactory = {
  activity: (sessionId: string) => ActivityStorage;
  session: () => SessionStorage;
};
```

---

### `StreamActivitiesOptions`

> `streaming.ts`

```ts
export type StreamActivitiesOptions = {
  /**
   * Filters to exclude certain activities.
   */
  exclude?: {
    originator: Origin;
  };
};
```

---

### `StreamActivitiesOptions`

> `types.ts`

```ts
export type StreamActivitiesOptions = {
  exclude?: {
    originator: Origin;
  };
};
```

---

### `StrippedMediaArtifact`

> `types.ts`

```ts
export type StrippedMediaArtifact = Omit<MediaArtifact, 'data'> & {
  dataStripped: true;
  hasData: true;
};
```

---

### `SyncDepth`

> `types.ts`

```ts
export type SyncDepth = 'metadata' | 'activities';
```

---

### `ValidationErrorCode`

> `query/validate.ts`

```ts
export type ValidationErrorCode =
  | 'INVALID_STRUCTURE'
```

---

### `WhereClause`

> `types.ts`

```ts
export type WhereClause<T extends JulesDomain> = T extends 'sessions'
  ? {
      id?: FilterOp<string>;
      state?: FilterOp<string>;
      title?: FilterOp<string>;
      search?: string;
    }
```

---

### `WorkflowState`

> `workflows/spec.ts`

```ts
export type WorkflowState = z.infer<typeof WorkflowStateSchema>;
```

---

### `WorkflowTrigger`

> `workflows/spec.ts`

```ts
export type WorkflowTrigger = z.infer<typeof WorkflowTriggersSchema>;
export type StepDefinition = z.infer<typeof StepSchema>;
```

## Classs

### `ApiClient`

> `api.ts`

```ts
export class ApiClient {
  private readonly apiKey: string | undefined;
  private readonly baseUrl: string;
  private readonly requestTimeoutMs: number;
  private readonly proxy?: ProxyConfig;
  private readonly rateLimitConfig: RateLimitRetryConfig;
  private capabilityToken: string | null = null;
  // Cache the handshake promise to prevent parallel handshakes (thundering herd)
  private handshakePromise: Promise<string> | null = null;

  constructor(options: ApiClientOptions) {
    this.apiKey = options.apiKey;
    this.baseUrl = options.baseUrl;
    this.requestTimeoutMs = options.requestTimeoutMs;
    this.proxy = options.proxy;
    this.rateLimitConfig = {
      maxRetryTimeMs: options.rateLimitRetry?.maxRetryTimeMs ?? 300000, // 5 minutes
      baseDelayMs: options.rateLimitRetry?.baseDelayMs ?? 1000,
      maxDelayMs: options.rateLimitRetry?.maxDelayMs ?? 30000,
    };
  }

  async request<T>(
    endpoint: string,
    options: ApiRequestOptions = {},
  ): Promise<T> {
    const {
      method = 'GET',
      body,
      query,
      headers: customHeaders,
      handshake,
      _isRetry,
    } = options;
    const url = this.resolveUrl(endpoint);

    if (query) {
      Object.entries(query).forEach(([key, value]) => {
        url.searchParams.append(key, String(value));
      });
    }

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...customHeaders,
    };

    // 1. Inject Credentials
    if (this.apiKey) {
      // Direct Mode
      headers['X-Goog-Api-Key'] = this.apiKey;
    } else if (this.proxy) {
      // Proxy Mode
      const token = await this.ensureToken(handshake);
      headers['Authorization'] = `Bearer ${token}`;
    } else {
      throw new MissingApiKeyError();
    }

    // 2. Execute Request
```

---

### `AutomatedSessionFailedError`

> `errors.ts`

```ts
export class AutomatedSessionFailedError extends JulesError {
  constructor(reason?: string) {
    let message = 'The Jules automated session terminated with a FAILED state.';
    if (reason) {
      message += ` Reason: ${reason}`;
    }
    super(message);
  }
}
```

---

### `BashArtifact`

> `artifacts.ts`

```ts
export class BashArtifact {
  public readonly type = 'bashOutput';
  public readonly command: string;
  public readonly stdout: string;
  public readonly stderr: string;
  public readonly exitCode: number | null;

  constructor(artifact: RestBashOutputArtifact['bashOutput']) {
    this.command = artifact.command;
    this.stdout = artifact.stdout;
    this.stderr = artifact.stderr;
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
  toString(): string {
    const output = [this.stdout, this.stderr].filter(Boolean).join('');
    const commandLine = `$ ${this.command}`;
    const outputLine = output ? `${output}\n` : '';
    const exitLine = `[exit code: ${this.exitCode ?? 'N/A'}]`;
    return `${commandLine}\n${outputLine}${exitLine}`;
  }
}
```

---

### `BrowserPlatform`

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

---

### `BrowserStorage`

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

---

### `ChangeSetArtifact`

> `artifacts.ts`

```ts
export class ChangeSetArtifact {
  public readonly type = 'changeSet' as const;
  public readonly source: string;
  public readonly gitPatch: GitPatch;

  constructor(source: string, gitPatch: GitPatch) {
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
  parsed(): ParsedChangeSet {
    if (!this.gitPatch?.unidiffPatch) {
      return {
        files: [],
        summary: { totalFiles: 0, created: 0, modified: 0, deleted: 0 },
      };
    }
    const files = parseUnidiff(this.gitPatch.unidiffPatch);

    const summary = {
      totalFiles: files.length,
      created: files.filter((f) => f.changeType === 'created').length,
      modified: files.filter((f) => f.changeType === 'modified').length,
      deleted: files.filter((f) => f.changeType === 'deleted').length,
    };

    return { files, summary };
  }
}
```

---

### `DefaultActivityClient`

> `activities/client.ts`

```ts
export class DefaultActivityClient implements ActivityClient {
  constructor(
    private storage: ActivityStorage,
    private network: NetworkClient,
  ) {}

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
  private _hydrateActivityArtifacts(activity: Activity): Activity {
    if (!activity.artifacts || activity.artifacts.length === 0) {
      return activity;
    }

    const hydratedArtifacts = activity.artifacts.map((artifact) => {
      // If it's already a class instance, we're done.
      if (artifact instanceof MediaArtifact) return artifact;
      if (artifact instanceof BashArtifact) return artifact;
      if (artifact instanceof ChangeSetArtifact) return artifact;

      // It's a plain object from JSON.parse(), so we need to re-hydrate it.
      // We check for the 'type' property to know which class to use.
      switch (artifact.type) {
        case 'changeSet':
          // The raw cached format has artifact.changeSet.gitPatch structure.
          // We need to handle this legacy format gracefully.
          const rawChangeSet = (artifact as any).changeSet || artifact;
          return new ChangeSetArtifact(
            rawChangeSet.source,
            rawChangeSet.gitPatch,
          );
        case 'bashOutput':
          // The raw cached format has artifact.bashOutput
          const rawBashOutput = (artifact as any).bashOutput || artifact;
          return new BashArtifact(rawBashOutput);
        case 'media':
          // TODO: MediaArtifact requires the platform object for some methods.
          // However, for local cache re-hydration, we don't have access to it here.
          // For now, we accept this limitation as the primary bug is with ChangeSetArtifact.
          // A future refactor could pass the platform object down.
          const rawMedia = (artifact as any).media || artifact;
          return new MediaArtifact(rawMedia, {} as any, activity.id);
        default:
          // If we don't recognize the type, return it as-is.
          return artifact as Artifact;
      }
    });

    return {
      ...activity,
      artifacts: hydratedArtifacts,
```

---

### `GitHubApiClient`

> `github/api.ts`

```ts
export class GitHubApiClient {
  constructor(
    private token: string,
    private baseUrl: string = 'https://api.github.com',
  ) {}

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

---

### `GitHubAuthError`

> `github/errors.ts`

```ts
export class GitHubAuthError extends GitHubError {
  constructor(message: string) {
    super(message, 401);
    this.name = 'GitHubAuthError';
  }
}
```

---

### `GitHubError`

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

---

### `GitHubNotFoundError`

> `github/errors.ts`

```ts
export class GitHubNotFoundError extends GitHubError {
  constructor(resource: string) {
    super(`GitHub resource not found: ${resource}`, 404);
    this.name = 'GitHubNotFoundError';
  }
}
```

---

### `GitHubRateLimitError`

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

---

### `InvalidStateError`

> `errors.ts`

```ts
export class InvalidStateError extends JulesError {
  constructor(message: string) {
    super(message);
  }
}
```

---

### `JulesApiError`

> `errors.ts`

```ts
export class JulesApiError extends JulesError {
  public readonly url: string;
  public readonly status: number;
  public readonly statusText: string;

  constructor(
    url: string,
    status: number,
    statusText: string,
    message?: string, // optional override
    options?: { cause?: Error },
  ) {
    const finalMessage =
      message ?? `[${status} ${statusText}] Request to ${url} failed`;
    super(finalMessage, options);
    this.url = url;
    this.status = status;
    this.statusText = statusText;
  }
}
```

---

### `JulesAuthenticationError`

> `errors.ts`

```ts
export class JulesAuthenticationError extends JulesApiError {
  constructor(url: string, status: number, statusText: string) {
    super(
      url,
      status,
      statusText,
      `[${status} ${statusText}] Authentication to ${url} failed. Ensure your API key is correct.`,
    );
  }
}
```

---

### `JulesClientImpl`

> `client.ts`

```ts
export class JulesClientImpl implements JulesClient {
  /**
   * Manages source connections (e.g., GitHub repositories).
   */
  public sources: SourceManager;
  // Expose storage for modular functions (Phase 3 requirement)
  public readonly storage: SessionStorage;

  private apiClient: ApiClient;
  private config: InternalConfig;
  private options: JulesOptions;
  private storageFactory: StorageFactory;
  private platform: Platform;

  /**
   * Lock to prevent concurrent sync operations.
   * Using a simple boolean for in-process locking.
   */
  private syncInProgress: boolean = false;

  /**
   * Creates a new instance of the JulesClient.
   *
   * @param options Configuration options for the client.
   * @param defaultStorageFactory Factory for creating storage instances.
   * @param defaultPlatform Platform-specific implementation.
   */
  constructor(
    options: JulesOptions = {},
    defaultStorageFactory: StorageFactory,
    defaultPlatform: Platform,
  ) {
    this.options = options;
    this.storageFactory = options.storageFactory ?? defaultStorageFactory;
    this.platform = options.platform ?? defaultPlatform;

    // Phase 1 / Phase 2 Integration: Initialize Session Storage
    // NOTE: This assumes StorageFactory was updated to { activity: ..., session: ... } in Phase 1
    this.storage = this.storageFactory.session();

    // 1. Resolve Proxy Configuration
    const envProxyUrl = this.getEnv('JULES_PROXY');
    const envSecret = this.getEnv('JULES_SECRET');

    // Priority: Options > Env > Default (Node Only)
    if (!options.proxy && envProxyUrl) {
      options.proxy = {
        url: envProxyUrl,
        auth: envSecret ? () => envSecret : undefined,
      };
    }

    const apiKey =
      options.apiKey_TEST_ONLY_DO_NOT_USE_IN_PRODUCTION ??
      options.apiKey ??
      this.platform.getEnv('JULES_API_KEY');
    const baseUrl = options.baseUrl ?? 'https://jules.googleapis.com/v1alpha';

    // Apply defaults to the user-provided config
    this.config = {
```

---

### `JulesError`

> `errors.ts`

```ts
export class JulesError extends Error {
  /** The original error that caused this error, if any. */
  public readonly cause?: Error;

  constructor(message: string, options?: { cause?: Error }) {
    super(message);
    this.name = this.constructor.name;
    this.cause = options?.cause;
  }
}
```

---

### `JulesNetworkError`

> `errors.ts`

```ts
export class JulesNetworkError extends JulesError {
  public readonly url: string;
  constructor(url: string, options?: { cause?: Error }) {
    super(`Network request to ${url} failed`, options);
    this.url = url;
  }
}
```

---

### `JulesRateLimitError`

> `errors.ts`

```ts
export class JulesRateLimitError extends JulesApiError {
  constructor(url: string, status: number, statusText: string) {
    super(
      url,
      status,
      statusText,
      `[${status} ${statusText}] API rate limit exceeded for ${url}.`,
    );
  }
}
```

---

### `MediaArtifact`

> `artifacts.ts`

```ts
export class MediaArtifact {
  public readonly type = 'media';
  public readonly data: string;
  public readonly format: string;
  private platform: Platform;
  private activityId?: string;

  constructor(
    artifact: RestMediaArtifact['media'],
    platform: Platform,
    activityId?: string,
  ) {
    this.data = artifact.data;
    this.format = artifact.format;
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
  async save(filepath: string): Promise<void> {
    await this.platform.saveFile(
      filepath,
      this.data,
      'base64',
      this.activityId,
    );
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
  toUrl(): string {
    return this.platform.createDataUrl(this.data, this.format);
  }
}
```

---

### `MemorySessionStorage`

> `storage/memory.ts`

```ts
export class MemorySessionStorage implements SessionStorage {
  private sessions: Map<string, CachedSession> = new Map();
  private index: SessionIndexEntry[] = [];

  async init(): Promise<void> {
    // No-op
  }

  async upsert(session: SessionResource): Promise<void> {
    this.sessions.set(session.id, {
      resource: session,
      _lastSyncedAt: Date.now(),
    });

    // Append to index (mimicking file behavior)
    this.index.push({
      id: session.id,
      title: session.title,
      state: session.state,
      createTime: session.createTime,
      source: session.sourceContext?.source || 'unknown',
      _updatedAt: Date.now(),
    });
  }

  async upsertMany(sessions: SessionResource[]): Promise<void> {
    for (const s of sessions) {
      await this.upsert(s);
    }
  }

  async get(sessionId: string): Promise<CachedSession | undefined> {
    return this.sessions.get(sessionId);
  }

  async delete(sessionId: string): Promise<void> {
    this.sessions.delete(sessionId);
    // Index entries remain (append-only simulation), or we could filter them out.
    // Spec says "We do NOT rewrite the index here for performance", so we leave them.
  }

  async *scanIndex(): AsyncIterable<SessionIndexEntry> {
    for (const entry of this.index) {
      yield entry;
    }
  }
}
```

---

### `MemoryStorage`

> `storage/memory.ts`

```ts
export class MemoryStorage implements ActivityStorage {
  private activities: Activity[] = [];
  private indices: Map<string, number> = new Map();

  /**
   * Initializes the storage. No-op for memory storage.
   */
  async init(): Promise<void> {
    // No-op for memory
  }

  /**
   * Closes the storage and clears memory.
   */
  async close(): Promise<void> {
    this.activities = []; // Clear memory on close
    this.indices.clear();
  }

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
  async append(activity: Activity): Promise<void> {
    // Upsert logic to maintain idempotency contract
    if (this.indices.has(activity.id)) {
      const index = this.indices.get(activity.id)!;
      // Maintain original position
      this.activities[index] = activity;
    } else {
      const index = this.activities.push(activity) - 1;
      this.indices.set(activity.id, index);
    }
  }

  /**
   * Retrieves an activity by ID.
   */
  async get(activityId: string): Promise<Activity | undefined> {
    const index = this.indices.get(activityId);
    if (index !== undefined) {
      return this.activities[index];
    }
    return undefined;
  }

  /**
   * Retrieves the latest activity.
   */
  async latest(): Promise<Activity | undefined> {
    if (this.activities.length === 0) return undefined;
    return this.activities[this.activities.length - 1];
  }
```

---

### `MissingApiKeyError`

> `errors.ts`

```ts
export class MissingApiKeyError extends JulesError {
  constructor() {
    super(
      'Jules API key is missing. Pass it to the constructor or set the JULES_API_KEY environment variable.',
    );
  }
}
```

---

### `NetworkAdapter`

> `network/adapter.ts`

```ts
export class NetworkAdapter implements NetworkClient {
  // Track if this is the first request to this session, for 404 retry logic
  private isFirstRequest = true;

  constructor(
    private apiClient: ApiClient,
    private sessionId: string,
    private pollingIntervalMs: number = 5000,
    private platform: Platform,
  ) {}

  /**
   * Fetches a single activity from the API.
   * Includes 404 retry logic on first request for eventual consistency.
   */
  async fetchActivity(activityId: string): Promise<Activity> {
    const endpoint = `sessions/${this.sessionId}/activities/${activityId}`;

    const fetch = async () => {
      const restActivity = await this.apiClient.request<any>(endpoint);
      return mapRestActivityToSdkActivity(restActivity, this.platform);
    };

    // Apply retry logic only on first request
    if (this.isFirstRequest) {
      const result = await withFirstRequestRetry(fetch);
      this.isFirstRequest = false;
      return result;
    }

    return fetch();
  }

  /**
   * Lists activities from the API with pagination.
   * Includes 404 retry logic on first request for eventual consistency.
   */
  async listActivities(
    options?: ListOptions,
  ): Promise<{ activities: Activity[]; nextPageToken?: string }> {
    const params: Record<string, string> = {};
    if (options?.pageSize) {
      params.pageSize = options.pageSize.toString();
    }
    if (options?.pageToken) {
      params.pageToken = options.pageToken;
    }
    if (options?.filter) {
      params.filter = options.filter;
    }

    const endpoint = `sessions/${this.sessionId}/activities`;

    const fetch = async () => {
      const response = await this.apiClient.request<{
        activities?: any[];
        nextPageToken?: string;
      }>(endpoint, { query: params });

      return {
```

---

### `NodeFileStorage`

> `storage/node-fs.ts`

```ts
export class NodeFileStorage implements ActivityStorage {
  private filePath: string;
  private metadataPath: string;
  private initialized = false;
  private writeStream: WriteStream | null = null;

  // In-memory index: ActivityID -> Byte Offset
  private index: Map<string, number> = new Map();
  private indexBuilt = false;
  private indexBuildPromise: Promise<void> | null = null;

  // Tracks the current file size to calculate offsets for new appends
  private currentFileSize = 0;

  constructor(sessionId: string, rootDir: string) {
    const sessionCacheDir = path.resolve(rootDir, '.jules/cache', sessionId);
    this.filePath = path.join(sessionCacheDir, 'activities.jsonl');
    this.metadataPath = path.join(sessionCacheDir, 'metadata.json');
  }

  /**
   * Initializes the storage by ensuring the cache directory exists.
   *
   * **Side Effects:**
   * - Creates the `.jules/cache/<sessionId>` directory if it does not exist.
   * - Sets the internal `initialized` flag.
   */
  async init(): Promise<void> {
    if (this.initialized) return;
    // Ensure the cache directory exists before we ever try to read/write
    await fs.mkdir(path.dirname(this.filePath), { recursive: true });

    // Initialize currentFileSize for accurate append offsets
    try {
      const stats = await fs.stat(this.filePath);
      this.currentFileSize = stats.size;
    } catch (e: any) {
      if (e.code === 'ENOENT') {
        this.currentFileSize = 0;
      } else {
        throw e;
      }
    }

    // Open a persistent write stream for efficient appending
    this.writeStream = createWriteStream(this.filePath, {
      flags: 'a',
      encoding: 'utf8',
    });

    // Prevent process crash on stream error
    this.writeStream.on('error', (err) => {
      console.error(
        `[NodeFileStorage] WriteStream error for ${this.filePath}:`,
        err,
      );
      // We might want to set initialized = false or nullify stream,
      // but for now, logging prevents the crash.
    });
```

---

### `NodePlatform`

> `platform/node.ts`

```ts
export class NodePlatform implements Platform {
  /**
   * Saves a file to the local filesystem using `node:fs/promises`.
   *
   * **Side Effects:**
   * - Writes a file to disk.
   * - Overwrites the file if it already exists.
   */
  async saveFile(
    filepath: string,
    data: string,
    encoding: 'base64',
    activityId?: string, // unused in Node.js, standard filesystem doesn't support this metadata easily
  ): Promise<void> {
    const buffer = Buffer.from(data, encoding);
    await writeFile(filepath, buffer);
  }

  async sleep(ms: number): Promise<void> {
    await setTimeout(ms);
  }

  createDataUrl(data: string, mimeType: string): string {
    return `data:${mimeType};base64,${data}`;
  }

  async fetch(input: string, init?: any): Promise<PlatformResponse> {
    const res = await global.fetch(input, init);
    return {
      ok: res.ok,
      status: res.status,
      json: () => res.json(),
      text: () => res.text(),
    };
  }

  crypto = {
    randomUUID: () => crypto.randomUUID(),

    async sign(text: string, secret: string): Promise<string> {
      const hmac = crypto.createHmac('sha256', secret);
      hmac.update(text);
      return hmac.digest('base64url');
    },

    async verify(
      text: string,
      signature: string,
      secret: string,
    ): Promise<boolean> {
      const expected = await this.sign(text, secret);
      // Use timingSafeEqual to prevent timing attacks
      const a = Buffer.from(expected);
      const b = Buffer.from(signature);
      return a.length === b.length && crypto.timingSafeEqual(a, b);
    },
  };

  encoding = {
    base64Encode: (text: string): string => {
```

---

### `NodeSessionStorage`

> `storage/node-fs.ts`

```ts
export class NodeSessionStorage implements SessionStorage {
  private cacheDir: string;
  private indexFilePath: string;
  private initialized = false;

  constructor(rootDir: string) {
    this.cacheDir = path.resolve(rootDir, '.jules/cache');
    this.indexFilePath = path.join(this.cacheDir, 'sessions.jsonl');
  }

  async init(): Promise<void> {
    if (this.initialized) return;
    await fs.mkdir(this.cacheDir, { recursive: true });
    this.initialized = true;
  }

  private getSessionPath(sessionId: string): string {
    return path.join(this.cacheDir, sessionId, 'session.json');
  }

  async upsert(session: SessionResource): Promise<void> {
    await this.init();

    // 1. Write the Atomic "Source of Truth"
    const sessionDir = path.join(this.cacheDir, session.id);
    await fs.mkdir(sessionDir, { recursive: true });

    const cached: CachedSession = {
      resource: session,
      _lastSyncedAt: Date.now(),
    };

    // Write atomically (JSON.stringify is fast for single sessions)
    await fs.writeFile(
      path.join(sessionDir, 'session.json'),
      JSON.stringify(cached, null, 2),
      'utf8',
    );

    // 2. Update the High-Speed Index (Append-Only)
    // We strictly append. The reader is responsible for deduplication.
    const indexEntry: SessionIndexEntry = {
      id: session.id,
      title: session.title,
      state: session.state,
      createTime: session.createTime,
      source: session.sourceContext?.source || 'unknown',
      _updatedAt: Date.now(),
    };

    await fs.appendFile(
      this.indexFilePath,
      JSON.stringify(indexEntry) + '\n',
      'utf8',
    );
  }

  async upsertMany(sessions: SessionResource[]): Promise<void> {
    // Parallelize file writes, sequentialize index write
    await Promise.all(sessions.map((s) => this.upsert(s)));
```

---

### `PRClientImpl`

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

    this.cache = { resource, _lastSyncedAt: Date.now() };

    return resource;
  }
}
```

---

### `SessionClientImpl`

> `session.ts`

```ts
export class SessionClientImpl implements SessionClient {
  readonly id: string;
  private apiClient: ApiClient;
  private config: InternalConfig;
  private sessionStorage: SessionStorage; // Added property
  private _activities: ActivityClient;

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
  constructor(
    sessionId: string,
    apiClient: ApiClient,
    config: InternalConfig,
    activityStorage: ActivityStorage,
    sessionStorage: SessionStorage, // Injected dependency
    platform: any,
  ) {
    this.id = sessionId.replace(/^sessions\//, '');
    this.apiClient = apiClient;
    this.config = config;
    this.sessionStorage = sessionStorage;

    // --- WIRING THE NEW ENGINE ---
    const network = new NetworkAdapter(
      this.apiClient,
      this.id,
      this.config.pollingIntervalMs,
      platform,
    );

    this._activities = new DefaultActivityClient(activityStorage, network);
  }

  // Private helper wrapper to enforce resume context
  private async request<T>(path: string, options: ApiRequestOptions = {}) {
    return this.apiClient.request<T>(path, {
      ...options,
      // Always attach 'resume' context for this session instance
      handshake: { intent: 'resume', sessionId: this.id },
    });
  }

  /**
   * COLD STREAM: Yields all known past activities from local storage.
   * If local cache is empty, fetches from network first.
   */
  history(): AsyncIterable<Activity> {
    return this._activities.history();
  }

  /**
   * Forces a full sync of activities from the network to local cache.
```

---

### `SessionCursor`

> `sessions.ts`

```ts
export class SessionCursor
  implements PromiseLike<ListSessionsResponse>, AsyncIterable<SessionResource>
```

---

### `SessionSnapshotImpl`

> `snapshot.ts`

```ts
export class SessionSnapshotImpl implements SessionSnapshot {
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

  constructor(session: SessionResource, activities: Activity[]) {
    this.id = session.id;
    this.state = session.state;
    this.url = session.url;
    this.createdAt = new Date(session.createTime);
    this.updatedAt = new Date(session.updateTime);
    this.durationMs = this.updatedAt.getTime() - this.createdAt.getTime();
    this.prompt = session.prompt;
    this.title = session.title;
    this.pr = session.outputs.find(
      (o) => o.type === 'pullRequest',
    )?.pullRequest;
    this.activities = Object.freeze(activities);

    // Compute derived views
    this.activityCounts = this.computeActivityCounts();
    this.timeline = this.computeTimeline();
    this.insights = this.computeInsights();

    // Make the instance immutable
    Object.freeze(this);
  }

  private computeActivityCounts(): Readonly<Record<string, number>> {
    const counts: Record<string, number> = {};
    for (const activity of this.activities) {
      counts[activity.type] = (counts[activity.type] || 0) + 1;
    }
    return counts;
  }

  private computeTimeline(): readonly TimelineEntry[] {
    return this.activities.map((activity) => ({
      time: activity.createTime,
      type: activity.type,
      summary: this.generateSummary(activity),
    }));
  }

  private generateSummary(activity: Activity): string {
    switch (activity.type) {
      case 'planGenerated':
        return `Plan with ${(activity as ActivityPlanGenerated).plan.steps.length} steps`;
      case 'planApproved':
        return 'Plan approved';
```

---

### `SourceNotFoundError`

> `errors.ts`

```ts
export class SourceNotFoundError extends JulesError {
  constructor(sourceIdentifier: string) {
    super(`Could not get source '${sourceIdentifier}'`);
  }
}
```

---

### `SyncInProgressError`

> `errors.ts`

```ts
export class SyncInProgressError extends JulesError {
  constructor() {
    super(
      'A sync operation is already in progress. Wait for it to complete before starting another.',
    );
  }
}
```

---

### `WebPlatform`

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
        { name: 'HMAC', hash: 'SHA-256' },
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

---

### `WorkflowBuilder`

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
      push: { ...this.state.on.push, ...triggers.push },
      pull_request: { ...this.state.on.pull_request, ...triggers.pull_request },
    };

    return this;
  }

  /**
   * Adds a job to the workflow.
   * Fails if the Job ID is invalid or already exists.
   */
  public addJob(id: string, job: JobDefinition): BuilderResult {
    // 1. Validate Input (ID format and Job Structure)
    const inputResult = AddJobInputSchema.safeParse({ id, job });
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

## Functions

### `computeArtifactCount`

> `query/computed.ts`

```ts
export function computeArtifactCount(activity: Activity): number {
  return activity.artifacts?.length ?? 0;
}
```

---

### `computeDurationMs`

> `query/computed.ts`

```ts
export function computeDurationMs(session: {
  createTime?: string;
  updateTime?: string;
}): number {
  if (!session.createTime || !session.updateTime) return 0;

  const created = new Date(session.createTime).getTime();
  const updated = new Date(session.updateTime).getTime();

  if (isNaN(created) || isNaN(updated)) return 0;

  return Math.max(0, updated - created);
}
```

---

### `computeSummary`

> `query/computed.ts`

```ts
export function computeSummary(activity: Activity): string {
  return toSummary(activity).summary;
}
```

---

### `connect`

> `browser.ts`

```ts
export function connect(options: JulesOptions = {}): JulesClient {
```

---

### `connect`

> `index.ts`

```ts
export function connect(options: JulesOptions = {}): JulesClient {
```

---

### `createSourceManager`

> `sources.ts`

```ts
export function createSourceManager(apiClient: ApiClient): SourceManager {
  const manager = new SourceManagerImpl(apiClient);

  const callable = manager.list.bind(manager);

  // Attach the 'get' method to the callable function object
  const sourceManager = callable as SourceManager;
  sourceManager.get = manager.get.bind(manager);

  return sourceManager;
}
```

---

### `createTimeToPageToken`

> `utils/page-token.ts`

```ts
export function createTimeToPageToken(
  createTime: string,
```

---

### `deepClone`

> `query/projection.ts`

```ts
export function deepClone<T>(obj: T): T {
  if (obj === null || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map((item) => deepClone(item)) as T;

  const cloned: Record<string, unknown> = {};
  for (const key of Object.keys(obj)) {
    cloned[key] = deepClone((obj as Record<string, unknown>)[key]);
  }
  return cloned as T;
}
```

---

### `deletePath`

> `query/projection.ts`

```ts
export function deletePath(obj: unknown, path: string[]): void {
  if (path.length === 0 || obj === null || obj === undefined) return;

  if (Array.isArray(obj)) {
    obj.forEach((item) => deletePath(item, path));
    return;
  }

  if (typeof obj !== 'object') return;

  const record = obj as Record<string, unknown>;
  const [head, ...tail] = path;

  if (tail.length === 0) {
    delete record[head];
    return;
  }

  if (head in record) {
    deletePath(record[head], tail);
  }
}
```

---

### `determineCacheTier`

> `caching.ts`

```ts
export function determineCacheTier(
  cached: CachedSession,
```

---

### `formatValidationResult`

> `query/validate.ts`

```ts
export function formatValidationResult(result: ValidationResult): string {
  const lines: string[] = [];

  if (result.valid) {
    lines.push('Query is valid.');
  } else {
    lines.push('Query validation failed:');
  }

  if (result.errors.length > 0) {
    lines.push('\nErrors:');
    for (const error of result.errors) {
      lines.push(`  - [${error.code}] ${error.path}: ${error.message}`);
      if (error.suggestion) {
        lines.push(`    Suggestion: ${error.suggestion}`);
      }
    }
  }

  if (result.warnings.length > 0) {
    lines.push('\nWarnings:');
    for (const warning of result.warnings) {
      lines.push(`  - [${warning.code}] ${warning.path}: ${warning.message}`);
    }
  }

  return lines.join('\n');
}
```

---

### `generateMarkdownDocs`

> `query/schema.ts`

```ts
export function generateMarkdownDocs(): string {
  const lines: string[] = [];

  lines.push('# Jules Query Language (JQL) Schema Reference\n');

  // Sessions
  lines.push('## Sessions Domain\n');
  lines.push(SESSION_SCHEMA.description + '\n');
  lines.push('### Fields\n');
  lines.push('| Field | Type | Description | Filterable |');
  lines.push('|-------|------|-------------|------------|');
  for (const field of SESSION_SCHEMA.fields) {
    const filterable = field.filterable ? 'Yes' : 'No';
    const computed = field.computed ? ' (computed)' : '';
    lines.push(
      `| ${field.name} | ${field.type}${computed} | ${field.description} | ${filterable} |`,
    );
  }

  // Activities
  lines.push('\n## Activities Domain\n');
  lines.push(ACTIVITY_SCHEMA.description + '\n');
  lines.push('### Fields\n');
  lines.push('| Field | Type | Description | Filterable |');
  lines.push('|-------|------|-------------|------------|');
  for (const field of ACTIVITY_SCHEMA.fields) {
    const filterable = field.filterable ? 'Yes' : 'No';
    const computed = field.computed ? ' (computed)' : '';
    lines.push(
      `| ${field.name} | ${field.type}${computed} | ${field.description} | ${filterable} |`,
    );
  }

  // Filter Operators
  lines.push('\n## Filter Operators\n');
  for (const op of FILTER_OP_SCHEMA.operators) {
    lines.push(`- **${op.name}**: ${op.description}`);
    lines.push(`  - Example: \`${op.example}\``);
  }

  // Dot Notation
  lines.push('\n### Dot Notation\n');
  lines.push(FILTER_OP_SCHEMA.dotNotation.description + '\n');
  lines.push('Examples:');
  for (const ex of FILTER_OP_SCHEMA.dotNotation.examples) {
    lines.push(`- \`${ex}\``);
  }

  // Projection
  lines.push('\n## Projection (Select)\n');
  for (const syntax of PROJECTION_SCHEMA.syntax) {
    lines.push(`- **${syntax.name}**: ${syntax.description}`);
    lines.push(`  - Example: \`${syntax.example}\``);
  }

  // Examples
  lines.push('\n## Query Examples\n');
  lines.push('### Sessions');
  for (const ex of SESSION_SCHEMA.examples) {
    lines.push(`\n**${ex.description}**`);
```

---

### `generateTypeDefinition`

> `query/schema.ts`

```ts
export function generateTypeDefinition(
  domain: 'sessions' | 'activities',
```

---

### `getAllSchemas`

> `query/schema.ts`

```ts
export function getAllSchemas(): {
  sessions: DomainSchema;
  activities: DomainSchema;
  filterOps: typeof FILTER_OP_SCHEMA;
  projection: typeof PROJECTION_SCHEMA;
} {
  return {
    sessions: SESSION_SCHEMA,
    activities: ACTIVITY_SCHEMA,
    filterOps: FILTER_OP_SCHEMA,
    projection: PROJECTION_SCHEMA,
  };
}
```

---

### `getPath`

> `query/projection.ts`

```ts
export function getPath(obj: unknown, path: string[]): unknown {
  if (path.length === 0) return obj;
  if (obj === null || obj === undefined) return undefined;

  const [head, ...tail] = path;

  if (Array.isArray(obj)) {
    // Map over array elements and collect values
    const results = obj
      .map((item) => getPath(item, path))
      .filter((v) => v !== undefined);
    return results.length > 0 ? results : undefined;
  }

  if (typeof obj === 'object') {
    const value = (obj as Record<string, unknown>)[head];
    return getPath(value, tail);
  }

  return undefined;
}
```

---

### `getRootDir`

> `storage/root.browser.ts`

```ts
export function getRootDir(): string { return '' }
```

---

### `getRootDir`

> `storage/root.ts`

```ts
export function getRootDir(): string {
  // 1. Explicit environment variable (highest priority)
  const julesHome = process.env.JULES_HOME;
  if (julesHome && isWritable(julesHome)) {
    return julesHome;
  }

  // 2. Project-first: If package.json exists in cwd, use project-local cache
  const cwd = process.cwd();
  const isInProject = existsSync(path.join(cwd, 'package.json'));
  if (isInProject && cwd !== '/' && isWritable(cwd)) {
    return cwd;
  }

  // 3. HOME environment variable
  const home = process.env.HOME;
  if (home && home !== '/' && isWritable(home)) {
    return home;
  }

  // 4. os.homedir() (may use /etc/passwd on Unix)
  const osHome = homedir();
  if (osHome && osHome !== '/' && isWritable(osHome)) {
    return osHome;
  }

  // 5. Temporary directory as last resort
  const tmpDir = process.env.TMPDIR || process.env.TMP || '/tmp';
  return tmpDir;
}
```

---

### `getSchema`

> `query/schema.ts`

```ts
export function getSchema(domain: 'sessions' | 'activities'): DomainSchema {
  return domain === 'sessions' ? SESSION_SCHEMA : ACTIVITY_SCHEMA;
}
```

---

### `github`

> `github/adapter.ts`

```ts
export function github(config: GitHubConfig): GitHubAdapter {
  return new GitHubAdapterImpl(config);
}
```

---

### `injectActivityComputedFields`

> `query/computed.ts`

```ts
export function injectActivityComputedFields(
  activity: Activity,
```

---

### `injectSessionComputedFields`

> `query/computed.ts`

```ts
export function injectSessionComputedFields<
  T extends { createTime?: string; updateTime?: string },
```

---

### `isActivityComputedField`

> `query/computed.ts`

```ts
export function isActivityComputedField(field: string): boolean {
  return ACTIVITY_COMPUTED_FIELDS.includes(
    field as (typeof ACTIVITY_COMPUTED_FIELDS)[number],
  );
}
```

---

### `isCacheValid`

> `caching.ts`

```ts
export function isCacheValid(
  cached: CachedSession | undefined,
```

---

### `isPathPrefix`

> `query/projection.ts`

```ts
export function isPathPrefix(prefix: string[], path: string[]): boolean {
  if (prefix.length > path.length) return false;
  return prefix.every((p, i) => p === path[i]);
}
```

---

### `isPRCacheValid`

> `github/caching.ts`

```ts
export function isPRCacheValid(
  cached: CachedPR | undefined,
```

---

### `isSessionComputedField`

> `query/computed.ts`

```ts
export function isSessionComputedField(field: string): boolean {
  return SESSION_COMPUTED_FIELDS.includes(
    field as (typeof SESSION_COMPUTED_FIELDS)[number],
  );
}
```

---

### `isSessionFrozen`

> `utils/page-token.ts`

```ts
export function isSessionFrozen(
  lastActivityCreateTime: string,
```

---

### `isWritable`

> `storage/root.browser.ts`

```ts
export function isWritable(_dir: string): boolean { return false }
```

---

### `isWritable`

> `storage/root.ts`

```ts
export function isWritable(dir: string): boolean {
  try {
    accessSync(dir, constants.W_OK);
    return true;
  } catch {
    return false;
  }
}
```

---

### `mapRestActivityToSdkActivity`

> `mappers.ts`

```ts
export function mapRestActivityToSdkActivity(
  restActivity: any,
```

---

### `mapRestArtifactToSdkArtifact`

> `mappers.ts`

```ts
export function mapRestArtifactToSdkArtifact(
  restArtifact: RestArtifact,
```

---

### `mapSessionResourceToOutcome`

> `mappers.ts`

```ts
export function mapSessionResourceToOutcome(session: SessionResource): Outcome {
  if (session.state === 'failed') {
    // TODO: The reason is not available on the session resource directly.
    // This will be improved when the API provides a failure reason.
    throw new AutomatedSessionFailedError(`Session ${session.id} failed.`);
  }

  // Find the pull request output, if it exists.
  const prOutput = session.outputs.find((o) => 'pullRequest' in o);
  const pullRequest = prOutput
    ? (prOutput as { pullRequest: PullRequest }).pullRequest
    : undefined;

  return {
    sessionId: session.id,
    title: session.title,
    state: 'completed', // We only call this mapper on a completed session.
    pullRequest,
    outputs: session.outputs,
  };
}
```

---

### `pageTokenToDate`

> `utils/page-token.ts`

```ts
export function pageTokenToDate(token: string): Date {
  const tokenNs = BigInt(token);
  const tokenMs = Number(tokenNs / 1000000n);
  return new Date(tokenMs);
}
```

---

### `parseSelectExpression`

> `query/projection.ts`

```ts
export function parseSelectExpression(expr: string): SelectExpression {
  if (expr === '*') {
    return { path: [], exclude: false, wildcard: true };
  }

  const exclude = expr.startsWith('-');
  const pathStr = exclude ? expr.slice(1) : expr;

  // Remove optional array markers like "[]" - they're implicit
  const cleanPath = pathStr.replace(/\[\]/g, '');
  const path = cleanPath.split('.').filter((p) => p.length > 0);

  return { path, exclude, wildcard: false };
}
```

---

### `parseUnidiff`

> `artifacts.ts`

```ts
export function parseUnidiff(patch?: string | null): ParsedFile[] {
  if (!patch) return [];
  const files: ParsedFile[] = [];
  // Split by diff headers (diff --git a/... b/...)
  const diffSections = patch.split(/^diff --git /m).filter(Boolean);

  for (const section of diffSections) {
    const lines = section.split('\n');

    // Extract file path from the +++ line (destination file)
    // Format: +++ b/path/to/file or +++ /dev/null
    let path = '';
    let fromPath = '';
    let toPath = '';

    for (const line of lines) {
      if (line.startsWith('--- ')) {
        // --- a/path or --- /dev/null
        fromPath = line
          .slice(4)
          .replace(/^a\//, '')
          .replace(/^\/dev\/null$/, '');
      } else if (line.startsWith('+++ ')) {
        // +++ b/path or +++ /dev/null
        toPath = line
          .slice(4)
          .replace(/^b\//, '')
          .replace(/^\/dev\/null$/, '');
      }
    }

    // Determine change type and path
    let changeType: 'created' | 'modified' | 'deleted';
    if (fromPath === '' || lines.some((l) => l.startsWith('--- /dev/null'))) {
      changeType = 'created';
      path = toPath;
    } else if (
      toPath === '' ||
      lines.some((l) => l.startsWith('+++ /dev/null'))
    ) {
      changeType = 'deleted';
      path = fromPath;
    } else {
      changeType = 'modified';
      path = toPath;
    }

    // Skip if we couldn't determine a path
    if (!path) continue;

    // Count additions and deletions (lines starting with + or - in hunks)
    let additions = 0;
    let deletions = 0;
    let inHunk = false;

    for (const line of lines) {
      if (line.startsWith('@@')) {
        inHunk = true;
        continue;
      }
```

---

### `projectDocument`

> `query/projection.ts`

```ts
export function projectDocument(
  doc: Record<string, unknown>,
```

---

### `setPath`

> `query/projection.ts`

```ts
export function setPath(
  obj: Record<string, unknown>,
```

---

### `toSummary`

> `activity/summary.ts`

```ts
export function toSummary(activity: Activity): ActivitySummary {
  const { id, type, createTime } = activity;
  let summary: string = type; // Default fallback is the type name

  switch (activity.type) {
    case 'agentMessaged':
    case 'userMessaged': {
      const message = (activity as ActivityAgentMessaged | ActivityUserMessaged)
        .message;
      if (!message || message.length === 0) {
        summary = type; // Fallback to type name for empty messages
      } else if (message.length > MAX_SUMMARY_LENGTH) {
        summary = message.substring(0, MAX_SUMMARY_LENGTH) + '...';
      } else {
        summary = message;
      }
      break;
    }
    case 'progressUpdated': {
      const progress = activity as ActivityProgressUpdated;
      // Handle missing title/description gracefully
      if (progress.title && progress.description) {
        summary = `${progress.title}: ${progress.description}`;
      } else if (progress.title) {
        summary = progress.title;
      } else if (progress.description) {
        summary = progress.description;
      }
      // else: fallback to type name (already set)
      break;
    }
    case 'planGenerated': {
      const plan = activity as ActivityPlanGenerated;
      const stepCount = plan.plan?.steps?.length ?? 0;
      summary = `Plan generated with ${stepCount} steps`;
      break;
    }
    case 'planApproved':
      summary = 'Plan approved';
      break;
    case 'sessionCompleted':
      summary = 'Session completed';
      break;
    case 'sessionFailed': {
      const failed = activity as ActivitySessionFailed;
      summary = failed.reason
        ? `Session failed: ${failed.reason}`
        : 'Session failed';
      break;
    }
  }

  return { id, type, createTime, summary };
}
```

---

### `validateQuery`

> `query/validate.ts`

```ts
export function validateQuery(query: unknown): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];

  // Step 1: Validate basic structure
  if (!validateStructure(query, errors)) {
    return { valid: false, errors, warnings };
  }

  const queryObj = query as Record<string, unknown>;

  // Step 2: Validate domain
  const domain = validateDomain(queryObj, errors);
  if (!domain) {
    return { valid: false, errors, warnings };
  }

  // Step 3: Validate select
  validateSelect(queryObj.select, domain, errors, warnings);

  // Step 4: Validate where
  validateWhere(queryObj.where, domain, errors, warnings);

  // Step 5: Validate order
  validateOrder(queryObj.order, errors);

  // Step 6: Validate limit
  validateLimit(queryObj.limit, errors, warnings);

  // Step 7: Validate cursors
  validateCursor(queryObj.startAfter, 'startAfter', errors);
  validateCursor(queryObj.startAt, 'startAt', errors);

  // Step 8: Check for unknown top-level fields
  const validTopLevelFields = new Set([
    'from',
    'select',
    'where',
    'order',
    'limit',
    'startAfter',
    'startAt',
    'include',
    'tokenBudget',
    'offset',
  ]);

  for (const key of Object.keys(queryObj)) {
    if (!validTopLevelFields.has(key)) {
      warnings.push({
        code: 'UNKNOWN_QUERY_FIELD',
        path: key,
        message: `Unknown query field: "${key}"`,
      });
    }
  }

  return {
    valid: errors.length === 0,
    errors,
```

## Consts

### `ACTIVITY_COMPUTED_FIELDS`

> `query/computed.ts`

```ts
export const ACTIVITY_COMPUTED_FIELDS = ['artifactCount', 'summary'] as const;
```

---

### `ACTIVITY_SCHEMA`

> `query/schema.ts`

```ts
export const ACTIVITY_SCHEMA: DomainSchema = {
  domain: 'activities',
  description: 'An event or action within a session',
  fields: [
    {
      name: 'id',
      type: 'string',
      description: 'Unique activity identifier',
      filterable: true,
      selectable: true,
    },
    {
      name: 'name',
      type: 'string',
      description: 'Full resource name',
      selectable: true,
    },
    {
      name: 'type',
      type: 'ActivityType',
      description:
        'Activity type: "agentMessaged" | "userMessaged" | "planGenerated" | "planApproved" | "progressUpdated" | "sessionCompleted" | "sessionFailed"',
      filterable: true,
      selectable: true,
    },
    {
      name: 'createTime',
      type: 'string',
      description: 'RFC 3339 timestamp when activity was created',
      filterable: true,
      selectable: true,
    },
    {
      name: 'originator',
      type: '"user" | "agent" | "system"',
      description: 'Entity that originated this activity',
      filterable: true,
      selectable: true,
    },
    {
      name: 'sessionId',
      type: 'string',
      description: 'ID of the parent session',
      filterable: true,
      selectable: true,
    },
    {
      name: 'artifactCount',
      type: 'number',
      description: 'Number of artifacts in this activity',
      computed: true,
      selectable: true,
    },
    {
      name: 'summary',
      type: 'string',
      description: 'Human-readable summary of the activity',
      computed: true,
      selectable: true,
    },
```

---

### `AddJobInputSchema`

> `workflows/spec.ts`

```ts
export const AddJobInputSchema = z.object({
  id: z
    .string()
    .regex(/^[a-zA-Z0-9_-]+$/, "Job ID must be alphanumeric, '-', or '_'"),
  job: JobSchema,
});
```

---

### `BuilderErrorCode`

> `workflows/spec.ts`

```ts
export const BuilderErrorCode = z.enum([
  'INVALID_TRIGGER', // 'on' config is malformed
```

---

### `BuilderErrorSchema`

> `workflows/spec.ts`

```ts
export const BuilderErrorSchema = z.object({
  code: BuilderErrorCode,
  message: z.string(),
  details: z.any().optional(),
});
```

---

### `BuilderResultSchema`

> `workflows/spec.ts`

```ts
export const BuilderResultSchema = z.discriminatedUnion('success', [
  z.object({ success: z.literal(true), data: z.any().optional() }),
```

---

### `DEFAULT_ACTIVITY_PROJECTION`

> `query/computed.ts`

```ts
export const DEFAULT_ACTIVITY_PROJECTION = [
  'id',
```

---

### `DEFAULT_SESSION_PROJECTION`

> `query/computed.ts`

```ts
export const DEFAULT_SESSION_PROJECTION = [
  'id',
```

---

### `FILTER_OP_SCHEMA`

> `query/schema.ts`

```ts
export const FILTER_OP_SCHEMA = {
  description: 'Filter operators for where clause',
  operators: [
    {
      name: 'eq',
      description: 'Equals (also supports direct value)',
      example: '{ id: "abc" } or { id: { eq: "abc" } }',
    },
    {
      name: 'neq',
      description: 'Not equals',
      example: '{ state: { neq: "failed" } }',
    },
    {
      name: 'contains',
      description: 'Case-insensitive substring match',
      example: '{ title: { contains: "bug" } }',
    },
    {
      name: 'gt',
      description: 'Greater than',
      example: '{ createTime: { gt: "2024-01-01" } }',
    },
    {
      name: 'lt',
      description: 'Less than',
      example: '{ createTime: { lt: "2024-12-31" } }',
    },
    {
      name: 'gte',
      description: 'Greater than or equal',
      example: '{ artifactCount: { gte: 1 } }',
    },
    {
      name: 'lte',
      description: 'Less than or equal',
      example: '{ artifactCount: { lte: 10 } }',
    },
    {
      name: 'in',
      description: 'Value in array',
      example: '{ state: { in: ["completed", "failed"] } }',
    },
    {
      name: 'exists',
      description: 'Field existence check',
      example: '{ "outputs.pullRequest": { exists: true } }',
    },
  ],
  dotNotation: {
    description:
      'Use dot notation for nested field paths. When filtering arrays, uses existential matching (ANY element matches).',
    examples: [
      '"artifacts.type": "bashOutput"',
      '"artifacts.exitCode": { neq: 0 }',
      '"plan.steps.title": { contains: "test" }',
      '"outputs.pullRequest.url": { exists: true }',
    ],
  },
};
```

---

### `JobSchema`

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

---

### `jules`

> `browser.ts`

```ts
export const jules: JulesClient = connect();
```

---

### `jules`

> `index.ts`

```ts
export const jules: JulesClient = connect();
```

---

### `jules`

> `types.ts`

```ts
export declare const jules: JulesClient;
```

---

### `PROJECTION_SCHEMA`

> `query/schema.ts`

```ts
export const PROJECTION_SCHEMA = {
  description: 'Select clause projection syntax',
  syntax: [
    {
      name: 'Field selection',
      description: 'Include specific fields',
      example: '["id", "title", "state"]',
    },
    {
      name: 'Dot notation',
      description: 'Select nested fields',
      example: '["id", "artifacts.type", "artifacts.command"]',
    },
    {
      name: 'Wildcard',
      description: 'Include all fields',
      example: '["*"]',
    },
    {
      name: 'Exclusion',
      description: 'Exclude specific fields (use with wildcard)',
      example: '["*", "-artifacts.data"]',
    },
  ],
  defaults: {
    sessions: ['id', 'state', 'title', 'createTime'],
    activities: [
      'id',
      'type',
      'createTime',
      'originator',
      'artifactCount',
      'summary',
    ],
  },
};
```

---

### `SESSION_COMPUTED_FIELDS`

> `query/computed.ts`

```ts
export const SESSION_COMPUTED_FIELDS = ['durationMs'] as const;
```

---

### `SESSION_SCHEMA`

> `query/schema.ts`

```ts
export const SESSION_SCHEMA: DomainSchema = {
  domain: 'sessions',
  description:
    'A Jules session representing a task or conversation with the agent',
  fields: [
    {
      name: 'id',
      type: 'string',
      description: 'Unique session identifier',
      filterable: true,
      selectable: true,
    },
    {
      name: 'name',
      type: 'string',
      description: 'Full resource name (e.g., "sessions/314159...")',
      selectable: true,
    },
    {
      name: 'title',
      type: 'string',
      description: 'Human-readable session title',
      filterable: true,
      selectable: true,
    },
    {
      name: 'prompt',
      type: 'string',
      description: 'The initial instruction or task description',
      selectable: true,
    },
    {
      name: 'state',
      type: 'SessionState',
      description:
        'Current session state: "queued" | "planning" | "awaitingPlanApproval" | "awaitingUserFeedback" | "inProgress" | "paused" | "failed" | "completed"',
      filterable: true,
      selectable: true,
    },
    {
      name: 'createTime',
      type: 'string',
      description: 'RFC 3339 timestamp when session was created',
      filterable: true,
      selectable: true,
    },
    {
      name: 'updateTime',
      type: 'string',
      description: 'RFC 3339 timestamp when session was last updated',
      filterable: true,
      selectable: true,
    },
    {
      name: 'url',
      type: 'string',
      description: 'URL to view the session in the Jules web app',
      selectable: true,
    },
    {
```

---

### `StepSchema`

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

---

### `WorkflowStateSchema`

> `workflows/spec.ts`

```ts
export const WorkflowStateSchema = z.object({
  name: z.string().min(1, 'Workflow name is required'),
  on: WorkflowTriggersSchema,
  env: z.record(z.string(), z.string()).optional(),
  jobs: z.record(z.string(), JobSchema),
});
```

---

### `WorkflowTriggersSchema`

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
