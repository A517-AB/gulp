# IPC Refactor TODO

## ✅ Done (experimenting branch)

### 1. Shared utilities collected
- `serialize.ts` — `serialize`, `send` (main). No more per-handler `JSON.parse(JSON.stringify())`.
- `transport.ts` — `invoke`, `onStream`, `stream` (renderer). One logged seam to ipcRenderer.
- `handlers/util.ts` — `handle` (error-enveloping registrar) + `pump` (stream drainer, always emits `done`).

### Single SDK runtime seam
- `sdk.ts` — the only file importing `@google/jules-sdk` runtime. The 21 value
  exports vs the one `export * from './errors'` wild card; everything else is a
  type the renderer pulls straight from `@google/jules-sdk/types`.

### The error card
- `wire.ts` (pure) + `errors.ts` (main) — SDK error classes encode to a sentinel
  JSON envelope so the renderer recovers `name`/`status`/`url` as `IpcSdkError`
  instead of a flattened `Error: ...`.

### Channels deduped
- `channels.ts` — single source of truth (`CH`, `EV`, per-id stream builders).
  Main and renderer can no longer drift.

### Session list no longer drains
- `client.sessions` awaits the thenable cursor (first page only). The full-drain
  path is now opt-in via `client.sessions.stream.start`.

### Routes split per domain
- `handlers/{client,session,activities,sources,artifact,query}.ts`
- `client/{client,session,activities,sources,artifact,query}.ts`

## Next round — `src/jules/`
- Decide which pure fns (`parseUnidiff`, `toSummary`, …) become straight renderer
  imports vs staying IPC (blocked on whether the SDK's `.` entry is browser-safe).
- Wrap IPC + direct imports behind a single renderer entry point.
- Remove dead re-exports, kill the `unknown` casts in the stream signatures.
- Then: separate the store, drop `loadSessions`, lean session-list + bash stream.
