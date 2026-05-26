# AGENTS.md — Codebase guide for AI agents

## What this project is

A dual-deployment Electron + web app for managing Jules AI sessions. Jules is Google's AI coding agent. This app is a front-end client that creates sessions, monitors activity, and manages queues of tasks sent to Jules.

---

## Architecture split

### Three layers

**Renderer** (`src/renderer/`) — React 19 SPA, runs in both Electron webview and browser.
- Pages split under `pages/electron/`, `pages/web/`, `pages/shared/`
- All Jules API calls go through `src/renderer/lib/jules/client.ts` (JulesClient)
- `useJules()` from `src/renderer/lib/jules/provider.tsx` gives `{ client, apiKey, setApiKey, clearApiKey }`

**Electron main** (`src/electron/`) — Node.js context, never imported by renderer.
- `main.mts` — window lifecycle, tray, global shortcut (`Ctrl+Shift+Space`)
- `preload.mts` — exposes IPC methods to renderer via `contextBridge`
- `Terminal.ts`, `queues.ts`, `filesystem.ts` — specific IPC handlers

**Shared bridge** (`src/shared/bridge.ts`) — detects Electron vs web, exports IPC handles.
- `isElectron` is true when `window.electron.window` exists
- `queues`, `terminal`, `filesystem` etc. are `null` in web mode

---

## API keys

**Jules API key** — loaded from the system environment (`JULES_API_KEY`). In Electron it is read via `window.electron.env.getApiKey()` which calls `process.env.JULES_API_KEY` in the main process. Jules itself is also an AI tool running in the environment — it has access to the same key.

**Other API keys** — stored in the user's system path (not in this repo). Do not hardcode or guess them.

**Fallback chain in JulesProvider:**
1. `localStorage.getItem("jules-api-key")` (user-entered in settings)
2. `import.meta.env.VITE_JULES_API_KEY` (build-time env)
3. `window.electron.env.getApiKey()` (system env via IPC, Electron only)

---

## Do not

- **Do not create `package-lock.json`** — the file is massive and not used here (bun.lock is used instead). If npm generates one, delete it before committing.
- **Do not run broad lint passes** unless asked. Lint only the files you actually touch. There are pre-existing lint issues in untouched files that are not your problem.
- **Do not modify `src/types/testing.ts`** — it is a verbatim copy of the Jules API type definitions from the official docs, kept for reference only. It is not used by the app.

---

## You can

- **Use Python as a child process** if needed for creative tooling (e.g. data processing, scripts). Use `child_process.spawn` in the Electron main process or write a standalone script.
- **Write scripts** in `scripts/` using TypeScript (Bun or Node) or Python.

---

## Types

All app types live in `src/types/`:

| File | Purpose |
|---|---|
| `jules.ts` | App-layer types: `Session`, `Activity`, `Source`, `CreateSessionRequest`, `FleetTaskGroup`, etc. These are the renderer's view of data — flat, simplified. |
| `activity-feed.ts` | Component prop types and hook return types for the Jules session UI. Imports from `jules.ts`. |
| `ui-hooks.ts` | Infrastructure hook types: `UseResizableReturn`, `UseActivityGroupsReturn`. |
| `electron.d.ts` | IPC bridge types: `ElectronAPI`, `TerminalAPI`, `WindowAPI`, etc. Also augments `Window`. |
| `app.ts` | App-level state types. |
| `jules-sdk.ts` | Raw SDK types from `@google/jules-sdk`. Used internally by `JulesClient`. |
| `testing.ts` | **Reference only.** Verbatim Jules API types from the official docs site. Not imported anywhere. |

---

## Hooks

All hooks live in `src/renderer/hooks/`:

| Hook | What it does |
|---|---|
| `use-activity-feed-api` | Fetches and polls activities for a session. Handles send message, approve plan, quick review. Returns `{ activities, loading, sending, approvingPlan, newActivityIds, handleSendMessage, handleApprovePlan, handleQuickReview }`. |
| `use-session-list` | Loads all sessions, filters by search query. Returns both `sessions` (filtered) and `allSessions` (raw, for daily count). |
| `use-new-session-form` | Form state and submit logic for creating a new Jules session. Loads sources on open. |
| `use-activity-groups` | Wraps `filterActivities` + `groupActivities` in useMemo. Collapses consecutive progress activities into arrays for grouped rendering. |
| `use-resizable` | Resize handle drag logic for the code diff sidebar. Returns `{ width, isResizing, startResizing }`. |
| `use-queues` | Loads `FleetTaskGroup[]` from Electron queues IPC. Sends individual tasks or full groups as Jules sessions by matching `group.repo` to a source. |

---

## Utils

`src/renderer/utils/`:

| File | What it does |
|---|---|
| `activity.ts` | `filterActivities`, `groupActivities`, `getOutputBranch`, `getActivityTypeColor`, `formatDate` |
| `session.ts` | `STATE_COLOR`, `STATE_DOT` (Tailwind class maps per status), `getStatusInfo`, `getSessionDuration` |

---

## Pages

| Path | Page | Mode |
|---|---|---|
| `/` | `HomePage` | shared |
| `/jules` | `JulesPage` | shared — main sessions UI: session list sidebar + activity feed + code diff sidebar |
| `/queues` | `QueuesPage` | electron — accordion task queue, send to Jules |
| `/repos` | `ReposPage` | electron |
| `/sessions` | `SessionsPage` | electron |
| `/settings` | `SettingsPage` | shared |

---

## Current state

The app runs. There are pre-existing lint and type errors in files not touched by the current refactor (test files without vitest globals, `templates.ts`, `testing.ts`, `ErrorBoundary.tsx`). These are known and do not block the build. Do not chase them unless specifically asked.

The Jules page (`/jules`) is the primary UI. The queues page (`/queues`) reads from `D:\tired\tasks.json` via the Electron queues IPC handler.
