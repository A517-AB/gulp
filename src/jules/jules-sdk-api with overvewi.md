# Jules SDK — Quick Reference

## Entry point
`jules`            — pre-built JulesClient singleton (main process)
`connect(options)` — make a new client with a different API key / baseUrl

---

## JulesClient  (top-level, what `jules` is)
`.session(id)`            — get a SessionClient for an existing session
`.session(config)`        — create + get a SessionClient in one call
`.sessions(options)`      — paginated cursor over session list; `.all()` to drain
`.run(config)`            — create session, run to completion, return AutomatedSession
`.all(items, mapper)`     — batch-run many sessions with concurrency control
`.sync(options)`          — pull remote sessions into local cache; fires onProgress
`.select(query)`          — structured query across sessions or activities
`.sources`                — SourceManager (see below)
`.storage`                — direct access to the local SessionStorage

---

## SessionClient  (`jules.session(id)`)
`.send(prompt)`           — send a message to an in-progress session
`.ask(prompt)`            — send + await agent reply in one call
`.approve()`              — approve a pending plan
`.info()`                 — fetch current SessionResource from API
`.result()`               — wait for completion, return SessionOutcome
`.waitFor(state)`         — block until session reaches a given state
`.stream(options)`        — AsyncIterable of activities as they arrive
`.updates()`              — AsyncIterable of new activities (polling)
`.history()`              — AsyncIterable of all past activities from cache
`.select(options)`        — filtered slice of stored activities
`.snapshot(options?)`     — full snapshot: state + activities + diffs
`.archive()` / `.unarchive()`
`.activities`             — ActivityClient (see below)
`.hydrate()`              — pull & cache all activities for this session

---

## ActivityClient  (`.activities` on SessionClient)
`.list(options)`          — paged fetch from API `{ activities, nextPageToken }`
`.get(activityId)`        — fetch one activity
`.select(options)`        — filtered slice from local cache
`.history()`              — all cached activities as AsyncIterable
`.updates()`              — new activities as AsyncIterable (polling)
`.stream()`               — live stream as AsyncIterable
`.hydrate()`              — fetch + store all activities, returns count

---

## Artifacts  (on SessionOutcome / ChangeSetArtifact)
`ChangeSetArtifact`       — `.gitPatch` (unidiff + commit msg) + `.parsed()` → files
`BashArtifact`            — `.command`, `.stdout`, `.stderr`, `.exitCode`
`MediaArtifact`           — `.data` (base64), `.format`, `.toUrl()`, `.save(path)`

---

## SourceManager  (`jules.sources`)
`.get({ github: 'owner/repo' })` — resolve a Source by GitHub slug

---

## Pure utility functions  (sync, no network)
`toSummary(activity)`                  — → `{ id, type, createTime, summary }` one-liner
`computeSummary(activity)`             — just the summary string
`computeArtifactCount(activity)`       — artifact count number
`computeDurationMs(session)`           — ms from createTime→updateTime
`parseUnidiff(patch)`                  — unidiff string → `ParsedFile[]`
`parseUnidiffWithContent(patch)`       — same + file content → `GeneratedFile[]`
`injectActivityComputedFields(a)`      — adds `artifactCount` + `summary` to activity
`injectSessionComputedFields(s)`       — adds `durationMs` to session
`validateQuery(query)`                 — validate a JulesQuery object → ValidationResult
`formatValidationResult(result)`       — → human-readable string
`getSchema(domain)`                    — field schema for 'sessions' | 'activities'
`getAllSchemas()`                       — both schemas + filter/projection docs
`generateTypeDefinition(domain)`       — TypeScript type string for the domain
`generateMarkdownDocs()`               — full markdown schema reference

---

## Cache/storage helpers  (Node, main process only)
`getRootDir()`                         — path to local SDK cache dir
`getCacheInfo()`                       — last sync time + session count
`getSessionCacheInfo(id)`              — per-session cache status
`getActivityCount(id)`                 — cached activity count for a session
`getLatestActivities(id, n)`           — last N cached activities
`getSessionCount()`                    — total cached sessions
`isSessionFrozen(lastActivityTime)`    — true if session looks abandoned

---

## Storage classes  (internal — you won't construct these)
`NodeSessionStorage`   — file-backed session index (main process)
`NodeFileStorage`      — file-backed activity log (main process)
`MemorySessionStorage` — in-memory session index (tests)
`MemoryStorage`        — in-memory activity log (tests)

---

## Errors
`JulesApiError`               — HTTP error from the API (status, url)
`JulesAuthenticationError`    — 401
`JulesRateLimitError`         — 429
`JulesNetworkError`           — fetch failed (no response)
`AutomatedSessionFailedError` — `.run()` / `.all()` session hit failed state
`MissingApiKeyError`          — no API key configured
`InvalidStateError`           — operation not valid in current session state
`SyncInProgressError`         — sync called while already syncing
`TimeoutError`                — waitFor / result timed out

---

## Key types
`SessionState`   — `queued | planning | awaitingPlanApproval | awaitingUserFeedback | inProgress | paused | failed | completed`
`Activity`       — union of 7: `agentMessaged | userMessaged | planGenerated | planApproved | progressUpdated | sessionCompleted | sessionFailed`
`Artifact`       — `ChangeSetArtifact | MediaArtifact | BashArtifact`
`SessionConfig`  — `{ prompt, source?, title?, requireApproval?, autoPr? }`
`SourceInput`    — `{ github: 'owner/repo', baseBranch: string }`
`SyncOptions`    — `{ sessionId?, limit?, depth?, incremental?, concurrency?, onProgress?, signal? }`
`StreamActivitiesOptions` — `{ exclude?: { originator }, initialRetries? }`

---

# Full API Reference Tree

### 🔑 Legend
* 🏫 **Classes**
* 🔌 **Interfaces**
* ⚙️ **Functions / Methods**
* 🧩 **Type Aliases**
* 📊 **Variables / Constants**
* 🏷️ **Enums**
* 📦 **Properties / Fields**

---

- 🏫 **Classes**
  - 📄 **ApiClient**
      - ⚙️ `constructor(options: ApiClientOptions)`
      - ⚙️ `request(endpoint: string, options?: ApiRequestOptions): Promise<T>`
  - 📄 **AutomatedSessionFailedError**
      - ⚙️ `constructor(reason?: string)`
  - 📄 **BashArtifact**
      - ⚙️ `constructor(artifact: indexedAccess)`
      - 📦 `readonly type: string`
      - 📦 `readonly command: string`
      - 📦 `readonly stdout: string`
      - 📦 `readonly stderr: string`
      - 📦 `readonly exitCode: number | null`
      - ⚙️ `toString(): string`
  - 📄 **ChangeSetArtifact**
      - ⚙️ `constructor(source: string, gitPatch: GitPatch)`
      - 📦 `readonly type: 'changeSet'`
      - 📦 `readonly source: string`
      - 📦 `readonly gitPatch: GitPatch`
      - ⚙️ `parsed(): ParsedChangeSet`
  - 📄 **DefaultActivityClient**
      - ⚙️ `constructor(storage: ActivityStorage, network: NetworkClient, platform: Platform)`
      - ⚙️ `history(): AsyncIterable<Activity>`
      - ⚙️ `hydrate(): Promise<number>`
      - ⚙️ `updates(): AsyncIterable<Activity>`
      - ⚙️ `stream(): AsyncIterable<Activity>`
      - ⚙️ `select(options?: SelectOptions): Promise<Activity[]>`
      - ⚙️ `list(options?: ListOptions): Promise<{ activities: Activity[]; nextPageToken?: string }>`
      - ⚙️ `get(activityId: string): Promise<Activity>`
  - 📄 **InvalidStateError**
      - ⚙️ `constructor(message: string)`
  - 📄 **JulesApiError**
      - ⚙️ `constructor(url: string, status: number, statusText: string, message?: string, options?: { cause?: Error })`
      - 📦 `readonly url: string`
      - 📦 `readonly status: number`
      - 📦 `readonly statusText: string`
  - 📄 **JulesAuthenticationError**
      - ⚙️ `constructor(url: string, status: number, statusText: string)`
  - 📄 **JulesClientImpl**
      - ⚙️ `constructor(options: JulesOptions | undefined, defaultStorageFactory: StorageFactory, defaultPlatform: Platform)`
      - 📦 `sources: SourceManager`
      - 📦 `readonly storage: SessionStorage`
      - ⚙️ `select(query: JulesQuery<T>): Promise<QueryResult<T>[]>`
      - ⚙️ `sync(options?: SyncOptions): Promise<SyncStats>`
      - ⚙️ `with(options: JulesOptions): JulesClient`
      - ⚙️ `connect(options: JulesOptions): JulesClient`
      - ⚙️ `getSessionResource(id: string): Promise<SessionResource>`
      - ⚙️ `sessions(options?: ListSessionsOptions): SessionCursor`
      - ⚙️ `all(items: T[], mapper: (item: T) => SessionConfig | Promise<SessionConfig>, options?: { concurrency?: number; stopOnError?: boolean; delayMs?: number }): Promise<AutomatedSession[]>`
      - ⚙️ `run(config: SessionConfig): Promise<AutomatedSession>`
      - ⚙️ `session(config: SessionConfig): Promise<SessionClient>`
      - ⚙️ `session(sessionId: string): SessionClient`
  - 📄 **JulesError**
      - ⚙️ `constructor(message: string, options?: { cause?: Error })`
      - 📦 `readonly cause: Error`
  - 📄 **JulesNetworkError**
      - ⚙️ `constructor(url: string, options?: { cause?: Error })`
      - 📦 `readonly url: string`
  - 📄 **JulesRateLimitError**
      - ⚙️ `constructor(url: string, status: number, statusText: string)`
  - 📄 **MediaArtifact**
      - ⚙️ `constructor(artifact: indexedAccess, platform: Platform, activityId?: string)`
      - 📦 `readonly type: string`
      - 📦 `readonly data: string`
      - 📦 `readonly format: string`
      - ⚙️ `save(filepath: string): Promise<void>`
      - ⚙️ `toUrl(): string`
  - 📄 **MemorySessionStorage**
      - ⚙️ `init(): Promise<void>`
      - ⚙️ `upsert(session: SessionResource): Promise<void>`
      - ⚙️ `upsertMany(sessions: SessionResource[]): Promise<void>`
      - ⚙️ `get(sessionId: string): Promise<CachedSession | undefined>`
      - ⚙️ `delete(sessionId: string): Promise<void>`
      - ⚙️ `scanIndex(): AsyncIterable<SessionIndexEntry>`
  - 📄 **MemoryStorage**
      - ⚙️ `init(): Promise<void>`
      - ⚙️ `close(): Promise<void>`
      - ⚙️ `append(activity: Activity): Promise<void>`
      - ⚙️ `get(activityId: string): Promise<Activity | undefined>`
      - ⚙️ `latest(): Promise<Activity | undefined>`
      - ⚙️ `scan(): AsyncIterable<Activity>`
  - 📄 **MissingApiKeyError**
      - ⚙️ `constructor()`
  - 📄 **NetworkAdapter**
      - ⚙️ `con@structor(apiClient: ApiClient, sessionId: string, pollingIntervalMs: number | undefined, platform: Platform)`
      - ⚙️ `fetchActivity(activityId: string): Promise<Activity>`
      - ⚙️ `listActivities(options?: ListOptions): Promise<{ activities: Activity[]; nextPageToken?: string }>`
      - ⚙️ `rawStream(): AsyncIterable<Activity>`
  - 📄 **NodeFileStorage**
      - ⚙️ `constructor(sessionId: string, rootDir: string)`
      - ⚙️ `init(): Promise<void>`
      - ⚙️ `close(): Promise<void>`
      - ⚙️ `append(activity: Activity): Promise<void>`
      - ⚙️ `get(activityId: string): Promise<Activity | undefined>`
      - ⚙️ `latest(): Promise<Activity | undefined>`
      - ⚙️ `scan(): AsyncIterable<Activity>`
  - 📄 **NodePlatform**
      - 📦 `crypto: { randomUUID: () => ${[0m[36mstring[0m}-${[0m[36mstring[0m}-${[0m[36mstring[0m}-${[0m[36mstring[0m}-${[0m[36mstring[0m}; sign(text: string, secret: string): Promise<string>; verify(text: string, signature: string, secret: string): Promise<boolean> }`
      - 📦 `encoding: { base64Encode: (text: string) => string; base64Decode: (text: string) => string }`
      - ⚙️ `saveFile(filepath: string, data: string, encoding: 'base64', activityId?: string): Promise<void>`
      - ⚙️ `sleep(ms: number): Promise<void>`
      - ⚙️ `createDataUrl(data: string, mimeType: string): string`
      - ⚙️ `fetch(input: string, init?: any): Promise<PlatformResponse>`
      - ⚙️ `getEnv(key: string): string | undefined`
      - ⚙️ `readFile(path: string): Promise<string>`
      - ⚙️ `writeFile(path: string, content: string): Promise<void>`
      - ⚙️ `deleteFile(path: string): Promise<void>`
  - 📄 **NodeSessionStorage**
      - ⚙️ `constructor(rootDir: string)`
      - ⚙️ `init(): Promise<void>`
      - ⚙️ `upsert(session: SessionResource): Promise<void>`
      - ⚙️ `upsertMany(sessions: SessionResource[]): Promise<void>`
      - ⚙️ `get(sessionId: string): Promise<CachedSession | undefined>`
      - ⚙️ `delete(sessionId: string): Promise<void>`
      - ⚙️ `scanIndex(): AsyncIterable<SessionIndexEntry>`
  - 📄 **SessionClientImpl**
      - ⚙️ `constructor(sessionId: string, apiClient: ApiClient, config: InternalConfig, activityStorage: ActivityStorage, sessionStorage: SessionStorage, platform: any)`
      - 📦 `readonly id: string`
      - ⚙️ `history(): AsyncIterable<Activity>`
      - ⚙️ `hydrate(): Promise<number>`
      - ⚙️ `updates(): AsyncIterable<Activity>`
      - ⚙️ `select(options?: SelectOptions): Promise<Activity[]>`
      - ⚙️ `activities(): ActivityClient`
      - ⚙️ `stream(options?: StreamActivitiesOptions): AsyncIterable<Activity>`
      - ⚙️ `approve(): Promise<void>`
      - ⚙️ `send(prompt: string): Promise<void>`
      - ⚙️ `ask(prompt: string): Promise<ActivityAgentMessaged>`
      - ⚙️ `result(options?: { timeoutMs?: number }): Promise<SessionOutcome>`
      - ⚙️ `waitFor(targetState: SessionState, options?: { timeoutMs?: number }): Promise<void>`
      - ⚙️ `archive(): Promise<void>`
      - ⚙️ `unarchive(): Promise<void>`
      - ⚙️ `info(): Promise<SessionResource>`
      - ⚙️ `snapshot(options?: { activities?: boolean }): Promise<SessionSnapshot>`
  - 📄 **SessionCursor**
      - ⚙️ `constructor(apiClient: ApiClient, storage: SessionStorage, platform: any, options?: ListSessionsOptions)`
      - ⚙️ `then(onfulfilled?: parenthesized | null, onrejected?: parenthesized | null): PromiseLike<TResult1 | TResult2>`
      - ⚙️ `[Symbol.asyncIterator](): AsyncIterator<SessionResource>`
      - ⚙️ `all(): Promise<SessionResource[]>`
  - 📄 **SessionSnapshotImpl**
      - ⚙️ `constructor(options: SessionSnapshotOptions)`
      - 📦 `readonly id: string`
      - 📦 `readonly state: SessionState`
      - 📦 `readonly url: string`
      - 📦 `readonly createdAt: Date`
      - 📦 `readonly updatedAt: Date`
      - 📦 `readonly durationMs: number`
      - 📦 `readonly prompt: string`
      - 📦 `readonly title: string`
      - 📦 `readonly pr: PullRequest`
      - 📦 `readonly activities: undefined any`
      - 📦 `readonly activityCounts: Readonly<Record<string, number>>`
      - 📦 `readonly timeline: undefined any`
      - 📦 `readonly insights: SessionInsights`
      - 📦 `readonly generatedFiles: GeneratedFiles`
      - 📦 `readonly changeSet: () => ChangeSetArtifact | undefined`
      - ⚙️ `toJSON(options?: ToJSONOptions): Partial<SerializedSnapshot>`
      - ⚙️ `toMarkdown(): string`
  - 📄 **SourceNotFoundError**
      - ⚙️ `constructor(sourceIdentifier: string)`
  - 📄 **SyncInProgressError**
      - ⚙️ `constructor()`
  - 📄 **TimeoutError**
      - ⚙️ `constructor(message: string)`
- 🔌 **Interfaces**
  - 📄 **ActivityAgentMessaged**
      - 📦 `type: 'agentMessaged'`
      - 📦 `message: string`
  - 📄 **ActivityClient**
      - ⚙️ `history(): AsyncIterable<Activity>`
      - ⚙️ `updates(): AsyncIterable<Activity>`
      - ⚙️ `stream(): AsyncIterable<Activity>`
      - ⚙️ `select(options?: SelectOptions): Promise<Activity[]>`
      - ⚙️ `list(options?: ListOptions): Promise<{ activities: Activity[]; nextPageToken?: string }>`
      - ⚙️ `get(activityId: string): Promise<Activity>`
      - ⚙️ `hydrate(): Promise<number>`
  - 📄 **ActivityPlanApproved**
      - 📦 `type: 'planApproved'`
      - 📦 `planId: string`
  - 📄 **ActivityPlanGenerated**
      - 📦 `type: 'planGenerated'`
      - 📦 `plan: Plan`
  - 📄 **ActivityProgressUpdated**
      - 📦 `type: 'progressUpdated'`
      - 📦 `title: string`
      - 📦 `description: string`
  - 📄 **ActivitySessionCompleted**
      - 📦 `type: 'sessionCompleted'`
  - 📄 **ActivitySessionFailed**
      - 📦 `type: 'sessionFailed'`
      - 📦 `reason: string`
  - 📄 **ActivityStorage**
      - ⚙️ `init(): Promise<void>`
      - ⚙️ `close(): Promise<void>`
      - ⚙️ `append(activity: Activity): Promise<void>`
      - ⚙️ `get(activityId: string): Promise<Activity | undefined>`
      - ⚙️ `latest(): Promise<Activity | undefined>`
      - ⚙️ `scan(): AsyncIterable<Activity>`
  - 📄 **ActivitySummary**
      - 📦 `id: string`
      - 📦 `type: string`
      - 📦 `createTime: string`
      - 📦 `summary: string`
  - 📄 **ActivityUserMessaged**
      - 📦 `type: 'userMessaged'`
      - 📦 `message: string`
  - 📄 **AutomatedSession**
      - 📦 `id: string`
      - ⚙️ `stream(): AsyncIterable<Activity>`
      - ⚙️ `result(): Promise<SessionOutcome>`
  - 📄 **ChangeSet**
      - 📦 `source: string`
      - 📦 `gitPatch: GitPatch`
  - 📄 **DomainSchema**
      - 📦 `domain: 'sessions' | 'activities'`
      - 📦 `description: string`
      - 📦 `fields: FieldMeta[]`
      - 📦 `examples: QueryExample[]`
  - 📄 **FieldMeta**
      - 📦 `name: string`
      - 📦 `type: string`
      - 📦 `description: string`
      - 📦 `optional?: boolean`
      - 📦 `computed?: boolean`
      - 📦 `filterable?: boolean`
      - 📦 `selectable?: boolean`
      - 📦 `fields?: FieldMeta[]`
  - 📄 **FirstRequestRetryOptions**
      - 📦 `maxRetries?: number`
      - 📦 `initialDelayMs?: number`
  - 📄 **GeneratedFile**
      - 📦 `path: string`
      - 📦 `changeType: 'created' | 'modified' | 'deleted'`
      - 📦 `content: string`
      - 📦 `additions: number`
      - 📦 `deletions: number`
  - 📄 **GeneratedFiles**
      - ⚙️ `all(): GeneratedFile[]`
      - ⚙️ `get(path: string): GeneratedFile | undefined`
      - ⚙️ `filter(changeType: 'created' | 'modified' | 'deleted'): GeneratedFile[]`
  - 📄 **GitHubRepo**
      - 📦 `owner: string`
      - 📦 `repo: string`
      - 📦 `isPrivate: boolean`
      - 📦 `defaultBranch?: string`
      - 📦 `branches?: string[]`
  - 📄 **GitPatch**
      - 📦 `unidiffPatch: string`
      - 📦 `baseCommitId: string`
      - 📦 `suggestedCommitMessage: string`
  - 📄 **GlobalCacheMetadata**
      - 📦 `lastSyncedAt: number`
      - 📦 `sessionCount: number`
  - 📄 **JulesClient**
      - 📦 `sources: SourceManager`
      - 📦 `storage: SessionStorage`
      - ⚙️ `run(config: SessionConfig): Promise<AutomatedSession>`
      - ⚙️ `session(config: SessionConfig): Promise<SessionClient>`
      - ⚙️ `session(sessionId: string): SessionClient`
      - ⚙️ `with(options: JulesOptions): JulesClient`
      - ⚙️ `connect(options: JulesOptions): JulesClient`
      - ⚙️ `sessions(options?: ListSessionsOptions): SessionCursor`
      - ⚙️ `all(items: T[], mapper: (item: T) => SessionConfig | Promise<SessionConfig>, options?: { concurrency?: number; stopOnError?: boolean; delayMs?: number }): Promise<AutomatedSession[]>`
      - ⚙️ `select(query: JulesQuery<T>): Promise<QueryResult<T>[]>`
      - ⚙️ `sync(options?: SyncOptions): Promise<SyncStats>`
  - 📄 **JulesOptions**
      - 📦 `apiKey?: string`
      - 📦 `apiKey_TEST_ONLY_DO_NOT_USE_IN_PRODUCTION?: string`
      - 📦 `baseUrl?: string`
      - 📦 `storageFactory?: StorageFactory`
      - 📦 `platform?: any`
      - 📦 `config?: { pollingIntervalMs?: number; requestTimeoutMs?: number; rateLimitRetry?: { maxRetryTimeMs?: number; baseDelayMs?: number; maxDelayMs?: number } }`
  - 📄 **JulesQuery**
      - 📦 `from: T`
      - 📦 `select?: conditional`
      - 📦 `where?: WhereClause<T>`
      - 📦 `include?: IncludeClause<T>`
      - 📦 `limit?: number`
      - 📦 `offset?: number`
      - 📦 `order?: 'asc' | 'desc'`
      - 📦 `startAt?: string`
      - 📦 `startAfter?: string`
  - 📄 **LightweightActivity**
      - 📦 `message?: string`
      - 📦 `artifacts: LightweightArtifact[] | null`
      - 📦 `artifactCount: number`
  - 📄 **ListOptions**
      - 📦 `pageSize?: number`
      - 📦 `pageToken?: string`
      - 📦 `filter?: string`
  - 📄 **ListSourcesOptions**
      - 📦 `filter?: string`
      - 📦 `pageSize?: number`
  - 📄 **NetworkClient**
      - ⚙️ `rawStream(): AsyncIterable<Activity>`
      - ⚙️ `listActivities(options?: ListOptions): Promise<{ activities: Activity[]; nextPageToken?: string }>`
      - ⚙️ `fetchActivity(activityId: string): Promise<Activity>`
  - 📄 **ParsedChangeSet**
      - 📦 `files: ParsedFile[]`
      - 📦 `summary: { totalFiles: number; created: number; modified: number; deleted: number }`
  - 📄 **ParsedFile**
      - 📦 `path: string`
      - 📦 `changeType: 'created' | 'modified' | 'deleted'`
      - 📦 `additions: number`
      - 📦 `deletions: number`
  - 📄 **Plan**
      - 📦 `id: string`
      - 📦 `steps: PlanStep[]`
      - 📦 `createTime: string`
  - 📄 **PlanStep**
      - 📦 `id: string`
      - 📦 `title: string`
      - 📦 `description?: string`
      - 📦 `index: number`
  - 📄 **Platform**
      - 📦 `crypto: { randomUUID(): string; sign(text: string, secret: string): Promise<string>; verify(text: string, signature: string, secret: string): Promise<boolean> }`
      - 📦 `encoding: { base64Encode(text: string): string; base64Decode(text: string): string }`
      - ⚙️ `saveFile(filepath: string, data: string, encoding: 'base64', activityId?: string): Promise<void>`
      - ⚙️ `sleep(ms: number): Promise<void>`
      - ⚙️ `createDataUrl(data: string, mimeType: string): string`
      - ⚙️ `fetch(input: string, init?: any): Promise<PlatformResponse>`
      - ⚙️ `getEnv(key: string): string | undefined`
      - ⚙️ `readFile(path: string): Promise<string>`
      - ⚙️ `writeFile(path: string, content: string): Promise<void>`
      - ⚙️ `deleteFile(path: string): Promise<void>`
  - 📄 **PlatformResponse**
      - 📦 `ok: boolean`
      - 📦 `status: number`
      - ⚙️ `json(): Promise<T>`
      - ⚙️ `text(): Promise<string>`
  - 📄 **PullRequest**
      - 📦 `url: string`
      - 📦 `title: string`
      - 📦 `description: string`
      - 📦 `baseRef?: string`
      - 📦 `headRef?: string`
  - 📄 **QueryExample**
      - 📦 `description: string`
      - 📦 `query: Record<string, unknown>`
  - 📄 **RestBashOutputArtifact**
      - 📦 `bashOutput: { command: string; output: string; exitCode: number | null }`
  - 📄 **RestChangeSetArtifact**
      - 📦 `changeSet: ChangeSet`
  - 📄 **RestGitHubRepo**
      - 📦 `owner: string`
      - 📦 `repo: string`
      - 📦 `isPrivate: boolean`
      - 📦 `defaultBranch?: { displayName: string }`
      - 📦 `branches?: { displayName: string }[]`
  - 📄 **RestMediaArtifact**
      - 📦 `media: { data: string; mimeType: string }`
  - 📄 **RestPullRequest**
      - 📦 `url: string`
      - 📦 `title: string`
      - 📦 `description: string`
      - 📦 `baseRef?: string`
      - 📦 `headRef?: string`
  - 📄 **RestSessionOutput**
      - 📦 `pullRequest?: RestPullRequest`
      - 📦 `changeSet?: ChangeSet`
  - 📄 **RestSessionResource**
      - 📦 `name: string`
      - 📦 `id: string`
      - 📦 `prompt: string`
      - 📦 `sourceContext: SourceContext`
      - 📦 `source?: RestSource`
      - 📦 `title: string`
      - 📦 `createTime: string`
      - 📦 `updateTime: string`
      - 📦 `state: string`
      - 📦 `requirePlanApproval?: boolean`
      - 📦 `automationMode?: string`
      - 📦 `url: string`
      - 📦 `outputs?: RestSessionOutput[]`
      - 📦 `activities?: any[]`
      - 📦 `generatedFiles?: GeneratedFile[]`
      - 📦 `archived?: boolean`
  - 📄 **RestSource**
      - 📦 `name: string`
      - 📦 `id: string`
      - 📦 `githubRepo?: RestGitHubRepo`
  - 📄 **SelectExpression**
      - 📦 `path: string[]`
      - 📦 `exclude: boolean`
      - 📦 `wildcard: boolean`
  - 📄 **SelectOptions**
      - 📦 `after?: string`
      - 📦 `before?: string`
      - 📦 `type?: string`
      - 📦 `limit?: number`
      - 📦 `order?: 'asc' | 'desc'`
  - 📄 **SerializedSnapshot**
      - 📦 `id: string`
      - 📦 `state: string`
      - 📦 `url: string`
      - 📦 `createdAt: string`
      - 📦 `updatedAt: string`
      - 📦 `durationMs: number`
      - 📦 `prompt: string`
      - 📦 `title: string`
      - 📦 `activities: Activity[]`
      - 📦 `activityCounts: Record<string, number>`
      - 📦 `timeline: TimelineEntry[]`
      - 📦 `generatedFiles: GeneratedFile[]`
      - 📦 `insights: { completionAttempts: number; planRegenerations: number; userInterventions: number; failedCommandCount: number }`
      - 📦 `pr?: { url: string; title: string; description: string }`
  - 📄 **SessionClient**
      - 📦 `id: string`
      - 📦 `activities: ActivityClient`
      - ⚙️ `history(): AsyncIterable<Activity>`
      - ⚙️ `updates(): AsyncIterable<Activity>`
      - ⚙️ `select(options?: SelectOptions): Promise<Activity[]>`
      - ⚙️ `stream(options?: StreamActivitiesOptions): AsyncIterable<Activity>`
      - ⚙️ `approve(): Promise<void>`
      - ⚙️ `send(prompt: string): Promise<void>`
      - ⚙️ `ask(prompt: string): Promise<ActivityAgentMessaged>`
      - ⚙️ `result(): Promise<SessionOutcome>`
      - ⚙️ `waitFor(state: SessionState): Promise<void>`
      - ⚙️ `info(): Promise<SessionResource>`
      - ⚙️ `archive(): Promise<void>`
      - ⚙️ `unarchive(): Promise<void>`
      - ⚙️ `snapshot(options?: { activities?: boolean }): Promise<SessionSnapshot>`
  - 📄 **SessionConfig**
      - 📦 `prompt: string`
      - 📦 `source?: SourceInput`
      - 📦 `title?: string`
      - 📦 `requireApproval?: boolean`
      - 📦 `autoPr?: boolean`
  - 📄 **SessionInsights**
      - 📦 `completionAttempts: number`
      - 📦 `planRegenerations: number`
      - 📦 `userInterventions: number`
      - 📦 `failedCommands: undefined any`
  - 📄 **SessionOutcome**
      - 📦 `sessionId: string`
      - 📦 `title: string`
      - 📦 `state: 'completed' | 'failed'`
      - 📦 `pullRequest?: PullRequest`
      - 📦 `outputs: SessionOutput[]`
      - ⚙️ `generatedFiles(): GeneratedFiles`
      - ⚙️ `changeSet(): ChangeSetArtifact | undefined`
  - 📄 **SessionResource**
      - 📦 `name: string`
      - 📦 `id: string`
      - 📦 `prompt: string`
      - 📦 `sourceContext: SourceContext`
      - 📦 `source?: Source`
      - 📦 `title: string`
      - 📦 `requirePlanApproval?: boolean`
      - 📦 `automationMode?: AutomationMode`
      - 📦 `createTime: string`
      - 📦 `updateTime: string`
      - 📦 `state: SessionState`
      - 📦 `url: string`
      - 📦 `outputs: SessionOutput[]`
      - 📦 `activities?: Activity[]`
      - 📦 `outcome: SessionOutcome`
      - 📦 `generatedFiles?: GeneratedFile[]`
      - 📦 `archived: boolean`
  - 📄 **SessionSnapshot**
      - 📦 `id: string`
      - 📦 `state: SessionState`
      - 📦 `url: string`
      - 📦 `createdAt: Date`
      - 📦 `updatedAt: Date`
      - 📦 `durationMs: number`
      - 📦 `prompt: string`
      - 📦 `title: string`
      - 📦 `pr?: PullRequest`
      - 📦 `activities: undefined any`
      - 📦 `activityCounts: Readonly<Record<string, number>>`
      - 📦 `timeline: undefined any`
      - 📦 `insights: SessionInsights`
      - 📦 `generatedFiles: GeneratedFiles`
      - 📦 `changeSet: () => ChangeSetArtifact | undefined`
      - ⚙️ `toJSON(options?: ToJSONOptions): Partial<SerializedSnapshot>`
      - ⚙️ `toMarkdown(): string`
  - 📄 **SessionSnapshotOptions**
      - 📦 `data: { session: SessionResource; activities?: Activity[] }`
  - 📄 **SessionStorage**
      - ⚙️ `init(): Promise<void>`
      - ⚙️ `upsert(session: SessionResource): Promise<void>`
      - ⚙️ `upsertMany(sessions: SessionResource[]): Promise<void>`
      - ⚙️ `get(sessionId: string): Promise<CachedSession | undefined>`
      - ⚙️ `delete(sessionId: string): Promise<void>`
      - ⚙️ `scanIndex(): AsyncIterable<SessionIndexEntry>`
  - 📄 **SourceContext**
      - 📦 `source: string`
      - 📦 `githubRepoContext?: { startingBranch: string }`
      - 📦 `workingBranch?: string`
      - 📦 `environmentVariablesEnabled?: boolean`
  - 📄 **SourceInput**
      - 📦 `github: string`
      - 📦 `baseBranch: string`
  - 📄 **SourceManager**
      - ⚙️ `get(filter: { github: string }): Promise<Source | undefined>`
  - 📄 **SyncCheckpoint**
      - 📦 `lastProcessedSessionId: string`
      - 📦 `sessionsProcessed: number`
      - 📦 `startedAt: string`
  - 📄 **SyncOptions**
      - 📦 `sessionId?: string`
      - 📦 `limit?: number`
      - 📦 `depth?: SyncDepth`
      - 📦 `incremental?: boolean`
      - 📦 `concurrency?: number`
      - 📦 `onProgress?: (progress: SyncProgress) => void`
      - 📦 `checkpoint?: boolean`
      - 📦 `signal?: AbortSignal`
  - 📄 **SyncProgress**
      - 📦 `phase: 'fetching_list' | 'hydrating_records' | 'hydrating_activities' | 'checkpoint'`
      - 📦 `current: number`
      - 📦 `total?: number`
      - 📦 `lastIngestedId?: string`
      - 📦 `activityCount?: number`
  - 📄 **SyncStats**
      - 📦 `sessionsIngested: number`
      - 📦 `activitiesIngested: number`
      - 📦 `isComplete: boolean`
      - 📦 `durationMs: number`
  - 📄 **TimelineEntry**
      - 📦 `time: string`
      - 📦 `type: string`
      - 📦 `summary: string`
  - 📄 **ToJSONOptions**
      - 📦 `include?: SnapshotField[]`
      - 📦 `exclude?: SnapshotField[]`
  - 📄 **ValidationError**
      - 📦 `code: ValidationErrorCode`
      - 📦 `path: string`
      - 📦 `message: string`
      - 📦 `suggestion?: string`
  - 📄 **ValidationResult**
      - 📦 `valid: boolean`
      - 📦 `errors: ValidationError[]`
      - 📦 `warnings: ValidationWarning[]`
      - 📦 `correctedQuery?: Record<string, unknown>`
  - 📄 **ValidationWarning**
      - 📦 `code: string`
      - 📦 `path: string`
      - 📦 `message: string`
- ⚙️ **Functions**
  - 📄 `function computeArtifactCount(activity: Activity): number`
  - 📄 `function computeDurationMs(session: { createTime?: string; updateTime?: string }): number`
  - 📄 `function computeSummary(activity: Activity): string`
  - 📄 `function connect(options?: JulesOptions): JulesClient`
  - 📄 `function createGeneratedFiles(files: GeneratedFile[]): GeneratedFiles`
  - 📄 `function createSourceManager(apiClient: ApiClient): SourceManager`
  - 📄 `function deepClone(obj: T): T`
  - 📄 `function deletePath(obj: unknown, path: string[]): void`
  - 📄 `function determineCacheTier(cached: CachedSession, now?: number): CacheTier`
  - 📄 `function formatValidationResult(result: ValidationResult): string`
  - 📄 `function generateMarkdownDocs(): string`
  - 📄 `function generateTypeDefinition(domain: 'sessions' | 'activities'): string`
  - 📄 `function getActivityCount(sessionId: string, rootDirOverride?: string): Promise<number>`
  - 📄 `function getAllSchemas(): { sessions: DomainSchema; activities: DomainSchema; filterOps: FILTER_OP_SCHEMA; projection: PROJECTION_SCHEMA }`
  - 📄 `function getCacheInfo(rootDirOverride?: string): Promise<GlobalCacheInfo>`
  - 📄 `function getLatestActivities(sessionId: string, n: number, rootDirOverride?: string): Promise<Activity[]>`
  - 📄 `function getPath(obj: unknown, path: string[]): unknown`
  - 📄 `function getRootDir(): string`
  - 📄 `function getSchema(domain: 'sessions' | 'activities'): DomainSchema`
  - 📄 `function getSessionCacheInfo(sessionId: string, rootDirOverride?: string): Promise<SessionCacheInfo | null>`
  - 📄 `function getSessionCount(rootDirOverride?: string): Promise<number>`
  - 📄 `function injectActivityComputedFields(activity: Activity, selectFields?: string[]): Activity & { artifactCount?: number; summary?: string }`
  - 📄 `function injectSessionComputedFields(session: T, selectFields?: string[]): T & { durationMs?: number }`
  - 📄 `function isActivityComputedField(field: string): boolean`
  - 📄 `function isCacheValid(cached: CachedSession | undefined, now?: number): cached is CachedSession`
  - 📄 `function isPathPrefix(prefix: string[], path: string[]): boolean`
  - 📄 `function isSessionComputedField(field: string): boolean`
  - 📄 `function isSessionFrozen(lastActivityCreateTime: string, thresholdDays?: number): boolean`
  - 📄 `function isWritable(dir: string): boolean`
  - 📄 `function mapRestActivityToSdkActivity(restActivity: any, platform: any): Activity`
  - 📄 `function mapRestArtifactToSdkArtifact(restArtifact: RestArtifact, platform: any, activityId?: string): Artifact`
  - 📄 `function mapRestOutputToSdkOutput(rest: RestSessionOutput): SessionOutput`
  - 📄 `function mapRestSessionToSdkSession(rest: RestSessionResource, platform?: any): SessionResource`
  - 📄 `function mapRestSourceToSdkSource(rest: RestSource): Source`
  - 📄 `function mapRestStateToSdkState(state: string): SessionState`
  - 📄 `function mapSessionResourceToOutcome(session: SessionResource): SessionOutcome`
  - 📄 `function pageTokenToDate(token: string): Date`
  - 📄 `function parseSelectExpression(expr: string): SelectExpression`
  - 📄 `function parseUnidiff(patch?: string | null): ParsedFile[]`
  - 📄 `function parseUnidiffWithContent(patch?: string | null): GeneratedFile[]`
  - 📄 `function pMap(items: T[], mapper: (item: T, index: number) => Promise<R>, options?: { concurrency?: number; stopOnError?: boolean; delayMs?: number }): Promise<R[]>`
  - 📄 `function pollSession(sessionId: string, apiClient: ApiClient, predicateFn: (session: SessionResource) => boolean, pollingInterval: number, platform: any, timeoutMs?: number): Promise<SessionResource>`
  - 📄 `function pollUntilCompletion(sessionId: string, apiClient: ApiClient, pollingInterval: number, platform: any, timeoutMs?: number): Promise<SessionResource>`
  - 📄 `function projectDocument(doc: Record<string, unknown>, selects: string[]): Record<string, unknown>`
  - 📄 `function select(client: JulesClient, query: JulesQuery<T>): Promise<QueryResult<T>[]>`
  - 📄 `function setPath(obj: Record<string, unknown>, path: string[], value: unknown): void`
  - 📄 `function streamActivities(sessionId: string, apiClient: ApiClient, pollingInterval: number, platform: Platform, options?: StreamActivitiesOptions): AsyncGenerator<Activity>`
  - 📄 `function toSummary(activity: Activity): ActivitySummary`
  - 📄 `function updateGlobalCacheMetadata(rootDirOverride?: string): Promise<void>`
  - 📄 `function validateQuery(query: unknown): ValidationResult`
  - 📄 `function withFirstRequestRetry(fn: () => Promise<T>, options?: FirstRequestRetryOptions): Promise<T>`
- 🧩 **Type Aliases**
  - 📄 `type Activity = ActivityAgentMessaged | ActivityUserMessaged | ActivityPlanGenerated | ActivityPlanApproved | ActivityProgressUpdated | ActivitySessionCompleted | ActivitySessionFailed`
  - 📄 `type ApiClientOptions = { apiKey: string | undefined; baseUrl: string; requestTimeoutMs: number; rateLimitRetry?: Partial<RateLimitRetryConfig>; maxConcurrentRequests?: number }`
  - 📄 `type ApiRequestOptions = { method?: 'GET' | 'POST'; body?: Record<string, unknown>; query?: Record<string, any>; headers?: Record<string, string>; _isRetry?: boolean }`
  - 📄 `type Artifact = ChangeSetArtifact | MediaArtifact | BashArtifact`
  - 📄 `type AutomationMode = 'AUTOMATION_MODE_UNSPECIFIED' | 'AUTO_CREATE_PR'`
  - 📄 `type CachedSession = { resource: SessionResource; _lastSyncedAt: number }`
  - 📄 `type CacheTier = 'hot' | 'warm' | 'frozen'`
  - 📄 `type FilterOp = V | { eq?: V; neq?: V; contains?: string; gt?: V; lt?: V; gte?: V; lte?: V; in?: V[]; exists?: boolean }`
  - 📄 `type GlobalCacheInfo = { lastSyncedAt: Date; sessionCount: number }`
  - 📄 `type IncludeClause = conditional`
  - 📄 `type InternalConfig = { pollingIntervalMs: number; requestTimeoutMs: number }`
  - 📄 `type JulesDomain = 'sessions' | 'activities'`
  - 📄 `type LightweightArtifact = Exclude<Artifact, MediaArtifact> | StrippedMediaArtifact`
  - 📄 `type ListSessionsOptions = { pageSize?: number; pageToken?: string; limit?: number; persist?: boolean; filter?: string }`
  - 📄 `type ListSessionsResponse = { sessions: SessionResource[]; nextPageToken?: string }`
  - 📄 `type Origin = 'user' | 'agent' | 'system'`
  - 📄 `type QueryResult = conditional`
  - 📄 `type RateLimitRetryConfig = { maxRetryTimeMs: number; baseDelayMs: number; maxDelayMs: number }`
  - 📄 `type RestArtifact = RestChangeSetArtifact | RestMediaArtifact | RestBashOutputArtifact`
  - 📄 `type SessionCacheInfo = { sessionId: string; activityCount: number; lastSyncedAt: Date }`
  - 📄 `type SessionIndexEntry = { id: string; title: string; state: string; createTime: string; source: string; _updatedAt: number }`
  - 📄 `type SessionMetadata = { activityCount: number }`
  - 📄 `type SessionOutput = { type: 'pullRequest'; pullRequest: PullRequest } | { type: 'changeSet'; changeSet: ChangeSet }`
  - 📄 `type SessionState = 'unspecified' | 'queued' | 'planning' | 'awaitingPlanApproval' | 'awaitingUserFeedback' | 'inProgress' | 'paused' | 'failed' | 'completed'`
  - 📄 `type SnapshotField = undefined any`
  - 📄 `type Source = { name: string; id: string } & { type: 'githubRepo'; githubRepo: GitHubRepo }`
  - 📄 `type StorageFactory = { activity: (sessionId: string) => ActivityStorage; session: () => SessionStorage }`
  - 📄 `type StreamActivitiesOptions = { exclude?: { originator: Origin }; initialRetries?: number }`
  - 📄 `type StrippedMediaArtifact = Omit<MediaArtifact, 'data'> & { dataStripped: true; hasData: true }`
  - 📄 `type SyncDepth = 'metadata' | 'activities'`
  - 📄 `type ValidationErrorCode = 'INVALID_STRUCTURE' | 'MISSING_REQUIRED_FIELD' | 'INVALID_DOMAIN' | 'INVALID_FIELD_PATH' | 'INVALID_OPERATOR' | 'INVALID_OPERATOR_VALUE' | 'COMPUTED_FIELD_FILTER' | 'INVALID_ORDER' | 'INVALID_LIMIT' | 'INVALID_SELECT_EXPRESSION'`
  - 📄 `type WhereClause = conditional`
- 📊 **Variables**
  - 📄 `const ACTIVITY_COMPUTED_FIELDS: undefined any`
  - 📄 `const ACTIVITY_SCHEMA: DomainSchema`
  - 📄 `const DEFAULT_ACTIVITY_PROJECTION: string[]`
  - 📄 `const DEFAULT_SESSION_PROJECTION: string[]`
  - 📄 `const FILTER_OP_SCHEMA: { description: string; operators: { name: string; description: string; example: string }[]; dotNotation: { description: string; examples: string[] } }`
  - 📄 `const jules: JulesClient`
  - 📄 `const PROJECTION_SCHEMA: { description: string; syntax: { name: string; description: string; example: string }[]; defaults: { sessions: string[]; activities: string[] } }`
  - 📄 `const SESSION_COMPUTED_FIELDS: undefined any`
  - 📄 `const SESSION_SCHEMA: DomainSchema`
