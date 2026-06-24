# API Diff Summary: modjules vs @google/jules-sdk

161 shared · **40 new in modjules** · **32 removed from SDK**

---

## New in modjules

### GitHub client (full built-in)

Not in old SDK at all. modjules ships a complete GitHub API client.

- `GitHubAdapter` / `GitHubConfig` — factory interface, `github(config)` creates one
- `GitHubApiClient` — raw HTTP client (auth, rate-limit, 404 handling)
- `PRClient` / `PRClientImpl` / `PRResource` — PR info, merge state, diff stats
- `GitHubUser` / `RateLimitInfo` / `CachedPR` / `isPRCacheValid`
- `GitHubError` / `GitHubAuthError` / `GitHubNotFoundError` / `GitHubRateLimitError`

### Workflow builder (GitHub Actions YAML)

New subsystem for building CI/CD workflows programmatically.

- `WorkflowBuilder` / `WorkflowBuilderSpec` — fluent builder, outputs YAML
- `WorkflowTrigger` / `WorkflowState` / `JobDefinition` / `StepDefinition`
- All backed by Zod schemas: `WorkflowTriggersSchema`, `WorkflowStateSchema`, `JobSchema`, `StepSchema`
- `BuilderResult` / `BuilderError` / `BuilderErrorCode` — typed result/error pattern

### Browser platform (IndexedDB storage)

- `BrowserPlatform` — browser-native file saving via IndexedDB
- `BrowserStorage` — activity storage in IndexedDB (v2 schema, artifacts store)
- `WebPlatform` — minimal platform, throws on file save (use BrowserPlatform instead)

### Other

- `ProxyConfig` — proxy URL + auth callback for client-side use without exposing API keys
- `Outcome` — renamed from `SessionOutcome`, **no `generatedFiles()` method** (see below)
- `HandshakeContext` — internal session intent type
- `createTimeToPageToken` — pagination utility

---

## Removed from SDK

### `generatedFiles()` — most impactful removal

Old SDK `SessionOutcome` had `.generatedFiles()` returning `GeneratedFiles` with `.all()`, `.get(path)`,
`.filter(changeType)`.
modjules `Outcome` has `outputs: SessionOutput[]` only — no file content helper.

The old SDK also had:

- `parseUnidiffWithContent(patch)` → `GeneratedFile[]` — parsed patch with actual file content
- `createGeneratedFiles(files)` → `GeneratedFiles` — factory for the helper object

**Equivalent in modjules:** `parseUnidiff` (shared, metadata only — no content). File content not exposed.

### REST internal types (removed, good)

Were leaking internal API shape. All gone:
`RestSessionResource`, `RestSessionOutput`, `RestSource`, `RestGitHubRepo`, `RestPullRequest`
Mappers also gone: `mapRestSessionToSdkSession`, `mapRestSourceToSdkSource`, `mapRestOutputToSdkOutput`,
`mapRestStateToSdkState`

### Cache inspection utilities

Old SDK exposed direct cache reads — removed in modjules:
`getCacheInfo`, `getSessionCacheInfo`, `getSessionCount`, `getActivityCount`, `getLatestActivities`,
`updateGlobalCacheMetadata`

### Polling/streaming internals (removed, good)

Were internal, now hidden:
`pollSession`, `pollUntilCompletion`, `streamActivities`

### Other

- `AutomationMode` — `'AUTOMATION_MODE_UNSPECIFIED' | 'AUTO_CREATE_PR'` (now handled by `autoPr: boolean`)
- `ListSourcesOptions` — source filtering
- `SessionOutcome` → renamed to `Outcome`
- `SessionSnapshotOptions`, `ToJSONOptions`, `SnapshotField` — snapshot config types
- `TimeoutError` — error class
- `select(client, query)` — standalone query fn (use `client.select(query)` instead)
- `pMap` — internal parallel map util
- `withFirstRequestRetry` — internal retry wrapper
