# Jules Architecture Guide

> For any AI assistant working on this codebase. Read this before touching anything Jules-related.

## Two Jules transports — never mix them

### HTTP client (`src/renderer/lib/jules/client.ts`)
- Hand-rolled `fetch` wrapper hitting `https://jules.googleapis.com/v1alpha`
- Works in **both** web and Electron
- Use for: listing sources, listing sessions, creating sessions, activities, deleting sessions
- Accessed via: `useJules().client` from `JulesProvider`

### SDK via IPC (`sdkIpc` in `src/shared/bridge.ts`)
- Official `@google/jules-sdk` running in the **Electron main process** (`electron/julesLocal.ts`)
- Exposed to renderer via IPC bridge (`preload.mts` → `bridge.ts` → `sdkIpc`)
- Electron only — `sdkIpc` is `null` in web mode
- Use for: **real-time streaming**, generated files, applying patches locally, `ask()` with immediate reply
- Accessed via: `import { sdkIpc } from '@shared/bridge'` or `localJules` from `src/renderer/lib/jules/local.ts`

### The switch
```ts
import { sdkIpc, isElectron } from '@shared/bridge'
// sdkIpc is null in web — always null-check before using
if (sdkIpc) { /* SDK path */ } else { /* HTTP fallback */ }
```

## Adding new Jules API capabilities

### New REST endpoint → `client.ts`
1. Add method to `JulesClient` class
2. Add to `CreateSessionRequest` or relevant type in `src/types/jules.ts` if needed

### New SDK feature → `electron/julesLocal.ts` + IPC bridge
1. Add `ipcMain.handle('jules.xxx', ...)` handler in `electron/julesLocal.ts`
2. Add method to `JulesLocalAPI` interface in `src/shared/electron.d.ts`
3. Wire in `electron/preload.mts` under the `julesLocal` const
4. That's it — `sdkIpc` in bridge picks it up automatically

## Session states
Full state union is in `src/types/jules.ts` → `SessionStatus`:
`queued | planning | awaitingApproval | awaitingFeedback | active | paused | completed | failed`

Colors/labels/icons for each state: `src/renderer/components/workspace/session-status.ts`

## What NOT to do
- Do NOT add `// @ts-ignore` or `// @ts-nocheck` — ESLint will error
- Do NOT call `requireLocalBridge()` / `requireSdk()` in every method — use a single null-check at the call site
- Do NOT mix SDK types into `src/renderer/lib/jules/client.ts` — that file is HTTP only
- Do NOT hardcode repo names or workarounds in `listSources` — those belong in config

## File map
```
src/renderer/lib/jules/
  client.ts          ← HTTP client (web + electron)
  local.ts           ← SDK facade for renderer (electron only)
  provider.tsx       ← React context: holds JulesClient + api key

src/renderer/hooks/
  use-jules-local-session.ts  ← hook wrapping local.ts for session streaming

src/shared/
  bridge.ts          ← exports sdkIpc (null in web), isElectron, etc.
  electron.d.ts      ← JulesLocalAPI type (sdkIpc shape)
  index.ts           ← re-exports everything above

electron/
  julesLocal.ts      ← IPC handlers using @google/jules-sdk (main process only)
  preload.mts        ← bridges julesLocal handlers to renderer as sdkIpc
```
