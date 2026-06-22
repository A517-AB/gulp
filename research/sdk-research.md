# Jules SDK Research

> Source: `D:\jules rest\jules-sdk-main`

---

## Examples inventory

The README at `packages/core/README.md` lists 26 examples. The ones with actual code in this repo:

| Example | Path | What it does |
|---|---|---|
| simple/main | `examples/simple/main.ts` | Rehydrate session by ID, call `session.result()`, read `generatedFiles()` and `changeSet()` |
| simple/repoless | `examples/simple/repoless.ts` | Repoless automated run + interactive session + resume by ID. Shows `artifact.parsed()`, `session.info().outputs`, `info.url` |
| basic-session | `packages/core/examples/basic-session/index.ts` | Create session, stream with typed `logStream()` handler, non-blocking `session.result()` |
| advanced-session | `packages/core/examples/advanced-session/index.ts` | Create session, `waitFor('awaitingPlanApproval')`, `approve()`, stream, then `jules.select()` from local cache |
| agent | `packages/core/examples/agent/index.ts` | `jules.all()` with concurrency:2, `Promise.all()` to stream all sessions concurrently |
| gitpatch-local | `packages/core/examples/gitpatch-local/` | CLI: fetch `session.snapshot()`, extract `changeSet().gitPatch.unidiffPatch`, checkout branch, apply patch, commit. Typed result object with error codes. |
| gitpatch-goals | `packages/core/examples/gitpatch-goals/handler.ts` | Two-session pipeline: generate code → snapshot → extract patch → review code |
| gitpatch-review | `packages/core/examples/gitpatch-review/index.ts` | CLI wrapper around the generate+review pipeline |

---

## API surface — complete

### Core client (`jules.*`)
- `jules.session(idOrConfig)` — create new session (pass config) or rehydrate existing (pass string ID)
- `jules.run(config)` — automated session (no plan approval step)
- `jules.all(items, mapFn, options?)` — batch, concurrency-controlled. `options: { concurrency, stopOnError, delayMs }`
- `jules.select(query)` — query local cache. `query: { from: 'sessions'|'activities', where, select, order, limit }`
- `jules.sources()` — async iterator over all connected sources
- `jules.sources.get(filter)` — get specific source by `{ github: 'owner/repo' }`
- `jules.with(options)` — create new client instance with custom config (`apiKey`, `pollingIntervalMs`, `timeout`)
- `jules.sync(options?)` — sync local cache from API

### Session control (`session.*`)
- `session.send(prompt)` — fire-and-forget message
- `session.ask(prompt)` — send message, await agent reply → returns `ActivityAgentMessaged`
- `session.approve()` — approve pending plan
- `session.waitFor(state)` — pause until session reaches given state (e.g. `'awaitingPlanApproval'`, `'completed'`)
- `session.result()` — await final outcome → `SessionOutcome`
- `session.info()` — fetch latest session resource (state, url, outputs[])
- `session.snapshot(options?)` — point-in-time snapshot; `options: { activities?: boolean }`
- `session.archive()` / `session.unarchive()`
- `session.select(options?)` — query local cache for this session's activities

### Observation (`session.stream/history/updates`)
- `session.stream()` — async iterator, all activities (history + live)
- `session.history()` — async iterator, cached activities only
- `session.updates()` — async iterator, live activities only

### Activities (`session.activities.*`)
- `session.activities.hydrate()` — populate local cache
- `session.activities.select(options?)` — query from cache
- `session.activities.list(options?)` — paginated list
- `session.activities.get(activityId)` — single activity
- `session.activities.history()` / `.updates()` / `.stream()` — same as session-level

### Artifacts (on activity artifact objects)
- `artifact.save(filepath)` — save media artifact to filesystem
- `artifact.toUrl()` — get data URI (media artifacts)
- `artifact.toString()` — formatted string output (bash artifacts)
- `artifact.parsed()` — structured diff for changeSet artifacts → `{ files[], summary: { totalFiles, created, modified, deleted } }`

### Snapshot (`snapshot.*`)
- `snapshot.changeSet()` — extract the changeset artifact → `{ gitPatch: { unidiffPatch, suggestedCommitMessage, baseCommitId } }`
- `snapshot.toJSON(options?)` — serialize; supports `include: string[]` or `exclude: string[]` field masking
- `snapshot.toMarkdown()` — human-readable markdown summary (NOT currently wired)

### Session outcome (`outcome.*`)
- `outcome.state` — final state string
- `outcome.pullRequest` — PR info if created
- `outcome.generatedFiles()` — returns object with `.all()` → `GeneratedFile[]` each with `{ path, content, changeType, additions, deletions }`
- `outcome.changeSet()` — the final changeset

### Error types (from `@google/jules-sdk`)
- `JulesError` — base class
- `JulesNetworkError`
- `JulesApiError`
- `JulesRateLimitError`
- `MissingApiKeyError`

---

## What is NOT currently wired in `electron/ipc/handlers.ts`

| Missing | Notes |
|---|---|
| `artifact.toUrl()` | No handler exposed |
| `artifact.toString()` | No handler exposed |
| `artifact.parsed()` | **This kills the hand-rolled `parseUnidiffWithContent`** — call `artifact.parsed()` directly instead |
| `snapshot.toMarkdown()` | Useful for AI/display, not wired |
| `outcome.generatedFiles()` | `session.result()` is wired but the handler strips `generatedFiles` from the returned object |
| `session.info().outputs` | `info()` is wired but `outputs[]` on the resource gives changeSet + PR data without needing `result()` |
| `session.info().url` | Available on `SessionResource`, not surfaced in UI |

---

## `_shared/` utilities

All four files at `packages/core/examples/_shared/`:

**`log-stream.ts`** — `logStream(session, handlers: StreamHandlers)`: wraps `session.stream()` with typed dispatch. Same pattern as `src/jules/activity.ts`'s `StreamHandlers` + `dispatchActivity` — already exists in the app, just not wired to the IPC stream.

**`resolve-source.ts`** — `resolveSource(fallback?)`: reads `GITHUB_REPO` env → git remote → fallback. Same logic as `resolveGitSource()` in `electron/ipc/handlers.ts:124`. Identical, could replace it.

**`run-session.ts`** — `runRepolessSession(prompt)`: creates a repoless session, streams it with `logStream`, collects `outcome.generatedFiles().all()` into a map. Shows the non-blocking result pattern: start `session.result()` promise, then `await logStream(...)`, then `await` the result promise.

**`check-env.ts`** — exits if no `JULES_API_KEY`. Not relevant to Electron (handled differently).

---

## Key patterns to adopt

### 1. Non-blocking result + concurrent stream
```ts
// Start result promise (non-blocking)
const resultPromise = session.result()
// Stream concurrently
await logStream(session, { agentMessaged: (a) => ... })
// Then collect result
const outcome = await resultPromise
```
Source: `examples/simple/repoless.ts:25-46`, `packages/core/examples/_shared/run-session.ts`

### 2. `artifact.parsed()` instead of hand-rolling
```ts
if (artifact.type === 'changeSet') {
  const parsed = artifact.parsed()
  // parsed.files[].path, .additions, .deletions, .changeType
  // parsed.summary.totalFiles, .created, .modified, .deleted
}
```
Source: `examples/simple/repoless.ts:349-353`
Replaces: `parseUnidiffWithContent()` in `electron/ipc/handlers.ts:36-122`

### 3. `session.info().outputs[]` for final changeset
```ts
const info = await session.info()
for (const output of info.outputs) {
  if (output.type === 'changeSet') { /* output.changeSet.gitPatch */ }
  if (output.type === 'pullRequest') { /* output.pullRequest.url */ }
}
```
Source: `examples/simple/repoless.ts:389-447`

### 4. `snapshot.toMarkdown()` — not wired, useful for display
Source: `docs/snapshot.md:163-188`

### 5. Error handling pattern
```ts
import { JulesError } from '@google/jules-sdk'
try { ... } catch (error) {
  if (error instanceof JulesError) {
    console.error(error.constructor.name, error.message, error.cause)
  }
}
```
Source: `examples/simple/repoless.ts:518-527`

---

## `docs/snapshot.md` summary

Full doc on `SessionSnapshot`. Key additions not obvious from types:

- `snapshot({ activities: true })` loads activities into snapshot; `false` is lighter
- `toJSON()` by default **excludes** `activities` and `generatedFiles`
- `toJSON({ include: ['id','state','title'] })` — whitelist
- `toJSON({ exclude: ['activities','generatedFiles'] })` — blacklist
- `toJSON({})` — full snapshot, all fields
- `include` takes precedence over `exclude` if both specified
- Return type is `Partial<SerializedSnapshot>` — all fields optional
- `toMarkdown()` exists but is **not in the installed package types** — may be unreleased

Available snapshot fields: `id`, `state`, `url`, `createdAt`, `updatedAt`, `durationMs`, `prompt`, `title`, `activities`, `activityCounts`, `timeline`, `generatedFiles`, `insights`, `pr`
