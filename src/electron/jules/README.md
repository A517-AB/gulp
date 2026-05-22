# Jules IPC Layer

Electron-side integration with the `@google/jules-sdk`. The main process owns all SDK calls; the renderer communicates via IPC through the bridge.

---

## Core

### `handlers.ts`
Registers all `ipcMain.handle` channels for Jules operations (sessions, activities, sources, artifacts). Takes the renderer's `webContents` reference to push streamed activities via `webContents.send`.

### `sdk.ts`
Renderer-side IPC bridge. Exposes a typed `sdk` object that mirrors the Jules SDK surface — each method calls through `ipcRenderer.invoke` to the corresponding handler registered in `handlers.ts`.

---

## Shared Utilities (`_shared/`)

### `check-env.ts`
Guards that `JULES_API_KEY` is set in the environment. Exits the process if not. Import at startup before any SDK call.

### `log-stream.ts`
`logStream(session, handlers, onError?)` — streams a session with a typed handler map keyed by activity type. Only handle what you need; everything else is silently ignored. Cleaner than switch/if chains. Accepts an optional `onError` callback for stream error handling.

### `resolve-source.ts`
`resolveSource(fallback?)` — resolves the GitHub repo and base branch to use for a session. Priority: `GITHUB_REPO` env var → auto-detected from `git remote get-url origin` → provided fallback.

### `run-session.ts`
`runRepolessSession(prompt, signal?)` — full batteries-included repoless session runner. Streams progress, captures the agent's last message, and returns all generated files as `Record<string, string>`. Supports an optional `AbortSignal` for cancellation.

---

## Examples

### `basic-session.ts`
Minimal end-to-end session. Creates a repoless session, streams activities through typed handlers, and logs the final result. Use this as a starting point for new integrations.

### `file-system-events.ts`
Watches a directory for file changes using `chokidar`. On `add` or `change`, creates a Jules session with the file content and streams the agent's response. Demonstrates the `logStream` + `resolveSource` pattern together with debounced event handling.

### `agent.ts`
Batch/parallel session runner using `jules.all()`. Fires multiple tasks concurrently (concurrency limit of 2), streams all sessions in parallel, and logs agent messages + final results per session. Use this when you want to dispatch several independent tasks at once and observe them all live.

### `advanced-session.ts`
Interactive session with plan approval. Creates a session, waits for the agent to generate a plan, approves it, then streams all activities with typed handlers via `logStream`. After streaming, demonstrates `jules.select()` to query the local activity cache — e.g. fetching the last 3 agent messages without a network call. Use this as the reference for any flow that requires human-in-the-loop plan approval.

