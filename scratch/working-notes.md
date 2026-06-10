# Working Notes

## Core principle
Hooks and components don't own data. They read from store and call actions. One place decides what data looks like — the store. Nothing else.

## Store pattern
- Store holds the data (`sessionList`, `sessions` keyed by ID)
- Store holds the polling logic (`startPolling`, `watch`)
- Hook reads from store with `useStore(s => s.thing)`, calls store actions, handles local UI state only (sending, flash, etc.)
- Switching sessions is instant because data stays cached — `watch` stops the timer on unmount but keeps the slice

## What we did
- Removed `sdkIpc`/`JulesLocalAPI` from `ElectronAPI` — Jules is not an Electron tool, it's its own service
- `store/app.ts`: stripped the IPC branch from `fetchSessions`, left one path via `client.listSessions()`
- `watch`: removed early-return on `'connected'` so it always polls fresh, removed slice deletion on unmount so cached data persists across navigation
- `use-activity-feed-api`: reads `activities` and `error` from `useStore(s => s.sessions[id])`, calls `watch` on mount — no local fetch state, no IPC

## IPC direction
`electron/ipc/bridge.ts` + `handlers.ts` are the new source. Types come from `@google/jules-sdk` directly, not hand-rolled mirrors. `src/jules/index.ts` is a reference file, leave it.

## What to delete when ready
- `electron/juleslocal.ts` — old handler, being replaced by `handlers.ts`
- `src/renderer/lib/archive.ts` — localStorage fake archive, SDK has real `session.archive()`
- `preload.mts` `julesLocal` section — old IPC wiring
