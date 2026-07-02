# Agents

> Last updated: 2026-07-01

Working document for AI agents on this project — rules, architecture, directives.

## What this is

A personal productivity desktop app combining different tools in one place. Not an AI app. It does have integration with
Jules, which is an API to a remote VM that executes coding tasks — nothing runs locally, there is no local AI.

## General Directives

- **Architecture**: Electron + Vite + React + whatever deemed to provide usage, ask first
- **Styling**: Tailwind CSS
- **State Management**: Zustand but currently not used much + local via Electron

- Basic rules:
    - NO GLASSMORPHISM. ever. not subtle, not "just a hint", not backdrop-blur on a card. no.
    - don't use the word vibe
    - don't change documents without getting clear request
    - if the user greets you, respond normally. Do not start analyzing the workspace or editing files/tools without an
      explicit request
    - a question is not a request — if a question is asked, answer it
    - i'm still learning, occasional explaining is nice
    - this is a personal project, don't suggest simpler or easier tools because it's personal
    - no lazy loading to main pages
    - no loading screens, no spinners, no skeleton loaders, no loading states — if data isn't ready, render nothing or
      render what you have
    - zero lint errors and zero typecheck errors — run `npm run lint` and `npm run typecheck` after all changes are
      done. fix everything before reporting done
    - `eslint-disable` comments and `@ts-ignore` / `@ts-expect-error` are banned. fix the actual problem. existing ones
      in the codebase are known and will be handled — do not add new ones. in extremely rare cases explicit agreement
      from the user is required before using one — never assume permission.
    - don't respond with wall text
    - don't give compliments
    - a package beats handrolled. always provide package names if something is nicer with it
    - ask for screenshots when diagnosing UI issues — it's easy to get them
  - unused isn't the same as dead. don't delete unused exports/code just because nothing currently imports it — it may
    be placed there on purpose (in-progress work, planned API surface). flag what's unused and let the user decide;
    removing it preemptively creates future conflicts

## Commands

```bash
# Development
npm run dev          # Vite dev server (renderer)

# Build & run
npm run build        # tsc -b, then vite build
npm start            # build + launch Electron
npm run run:e        # launch Electron against existing build (no rebuild)

# Quality
npm run lint         # ESLint (TypeScript strict + React hooks)
npm run typecheck    # tsc -b --pretty false
npm test             # Vitest
```

## Architecture

Electron desktop app. `isWeb` / `VITE_TARGET=web` was an unfinished attempt — do not extend or gate things behind it.
`pages/web/` exists but is vestigial and will be cleaned up.

### Two layers

**1. Renderer** (`src/renderer/`) — React 19 SPA

- Pages split under `pages/electron/` (main), `pages/shared/` (cross-context), `pages/web/` (vestigial — ignore)
- Global session state in Zustand (`store/app.ts`)

**2. Electron main** (`electron/` — repo root, not under `src/`) — Node.js, never imported by renderer

- `main.mts`: window lifecycle, tray, global shortcut, power monitoring
- `preload.mts`: context-isolated bridge via `contextBridge`
- IPC handlers: `Terminal.ts` (node-pty), `queues.ts`, `filesystem/handlers.ts`, `git.ts`, `github.ts`, `snippets.ts`,
  `popup.ts`, `notes.ts`, `notifications/`, `store.ts`, `event-bus.ts`, `notif-rules.ts`
- Built by `vite-plugin-electron` → `dist-electron/main.mjs`

### Data flow

- **Jules**: renderer → `@jules` SDK → Jules API directly. No IPC, no main process involvement.
- **Electron IPC**: renderer → `window.electron` → main process. Filesystem, git, terminal, native OS only.

## Path aliases

### Renderer (`tsconfig.app.json`)

| Alias                  | Resolves to                                                                                |
|------------------------|--------------------------------------------------------------------------------------------|
| `@/*`                  | `src/renderer/*`                                                                           |
| `@/components/*`       | `src/renderer/components/*`                                                                |
| `@/ui/*`               | `src/renderer/ui/*`                                                                        |
| `@/store/*`            | `src/renderer/store/*`                                                                     |
| `@/hooks/*`            | `src/renderer/hooks/*`                                                                     |
| `@/utils`, `@/utils/*` | `src/renderer/utils/*`                                                                     |
| `@shared`, `@shared/*` | `src/shared/*`                                                                             |
| `@jules`               | `./dist-jules` (TS types + Vite runtime, as of 2026-07-01 — `src/jules/` no longer exists) |

### Node (`tsconfig.node.json`)

| Alias | Resolves to |
|---|---|
| `@/*` | `src/*` |
| `@shared`, `@shared/*` | `src/shared/*` |
| `@electron/*` | `electron/*` |

## Environment

- `JULES_API_KEY` — read from `~/.jules` or `.env`
- `GITHUB_TOKEN` — used by `electron/github.ts`, read from user path or `.env`

## TypeScript config

Two tsconfig roots via project references:

- `tsconfig.app.json` — renderer, excludes `electron/` and `src/jules/`
- `tsconfig.node.json` — Electron main + Vite config

TypeScript 6. Strict mode on both. Renderer extras: `exactOptionalPropertyTypes`, `noUncheckedIndexedAccess`,
`noPropertyAccessFromIndexSignature`.

## Working conventions

**Exports** — always through an `index.ts` barrel. No `export *`, no scattered re-exports.

**Folder structure** — active, evolving codebase. Tidy what you touch. Don't restructure folders you weren't asked to
touch.

**Lint** — fix lint errors you didn't cause if you spot them. Leave things cleaner than you found them.

**Electron global** — `window.electron` is being cleaned up incrementally. Don't spread it further.

**Locked files** — if unsure whether a file is safe to edit, ask. Don't silently work around it.

## Agent Notes

### Jules

Use the `/jules` skill for SDK docs and type lookup.

Jules is a remote service — an API to a remote VM that executes coding tasks. Nothing runs locally. Because it's remote:
don't shove it into every component or feature. If the service is down or the key is missing, everything that touches it
fails. Ask before wiring Jules into something new.

The goal is not to build a sessions page. It's a productivity corner. Jules is one tool in it. Wild ideas for how to use
it are welcome — say them.

#### Methods tried

> 2026-06-28 — superseded, see 2026-07-01 update below. Kept for history only.

- Bun sidecar server
- IPC routes through Electron main
- npm package
- Pure fetch

None are the set method. There is no set method yet.

#### Current method

> 2026-06-28 — superseded, see 2026-07-01 update below. Kept for history only.

Browser entry from modjules via Vite alias (`src/jules/browser.ts`). It works — it's an ok fetch. Missing the good stuff
that makes this worth doing. The app is half web half Electron, so both sides are on the table.

`browser.mjs` = web version, almost the same but without features that matter.
`index.mjs` = Node entry, still figuring out how to use it properly from the main process.

`src/jules/` = the actual SDK source files. Don't touch unless asked. If push comes to shove, it can be edited — it's
owned.

`dist-jules/` = safest import option. Just `.d.ts` files. Probable future home of the `@jules` alias. If going via Node,
an IPC route from there is possible — shape not decided yet.

`app.ts` — not critical but has usage. Was being used as a tool without realising there's 100MB of IndexedDB storage
sitting unused. Dated note: 2026-06-28, don't gut it.

#### Update — 2026-07-01

Everything above this point in "Methods tried" / "Current method" can be ignored. `src/jules/` doesn't exist anymore —
that reference is stale.

- **IPC works.** The earlier "IPC routes through Electron main" attempt wasn't a dead end because IPC-as-an-approach is
  wrong — it failed because the wiring was bad (handlers wrote but never registered in `main.mts`, no preload bridge,
  dead code). Don't rule out IPC because of that history.
- **Browser (`@jules` via Vite alias) still works but is fragile.** It can crash from changes elsewhere in the app, not
  just when touched directly — treat it as a secondary/backup path, not the main one.
- **Current direction: half IPC.** Route the fast, cache-backed stuff (session/activity reads, sync) through the real
  Node SDK via Electron main + preload — `electron/ipc/jules-cache.ts` (handlers) registered in `main.mts`, bridged in
  `preload.mts` as `window.jules.cache`, backed by `electron/ipc/Jules/` (Node SDK source, disk cache under
  `.jules/cache`). Renderer calls go through `src/renderer/lib/jules-client.ts`. Keep browser-via-Vite for whatever
  isn't worth wiring through IPC yet — this is a split, not a full migration off browser.

#### Rules when working with Jules

- Don't keep suggesting browser-via-Vite as a new idea. It's already in. Saying it again is pointless.
- Don't rewrap IPC as a fresh idea if it's been discussed. Known.
- If asked for a new idea, give an actual new one. If your idea is "don't do it" or the thing already being ignored,
  don't say it.
- If you find something creative — in sessions, activities, anywhere — say it. Don't wing it silently and build your own
  thing.
- If a genuinely better method exists (different runtime, different access pattern), say it once clearly. If it's
  faster, cleaner, gives better access — worth saying. Say it once.
- All new entries in this section must be dated.

### Notification system

Notification UI is a **separate BrowserWindow**, not inside the main app window.

- `electron/notifications/dispatch.ts` — manages the notification window (340×360, bottom-right, always-on-top,
  frameless). Routes payloads via `webContents.send('notif.show', payload)`.
- `src/notification/main.tsx` — React component inside that window.
- IPC bridge: renderer → `notif.dispatch` → `dispatch.ts` → `notif.show` → component.
- `electron/notifications/preload.ts` — separate preload for the notification window.

Shape and styling belong in the React component, not in `dispatch.ts`.

### Notification daemon (`electron/main-notif.mts`)

Second Electron process — standalone tray-only daemon, separate from the main app.

- Built to `dist-electron/notif-main.mjs`
- Stays alive when all windows are closed
- Has its own tray icon (purple hexagon, 16×16, drawn programmatically)
- Home for persistent notification scheduling — reminders fire even when main window is closed
- Do not confuse with `main.mts` — they are separate `app` instances
