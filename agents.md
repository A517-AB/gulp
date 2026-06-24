# Agents

> Last updated: 2026-06-12

This file is a working document to track rules, architectural decisions, and specific instructions for AI agents working on this project. Mirrors CLAUDE.md and extends it with agent-specific directives.

## General Directives

- **Architecture**: Electron + Vite + React + whatever deemed to provide usage, ask first
- **Styling**: Tailwind CSS
- **State Management**: Zustand but currently not used much + local via electron

- Basic rules:
  - don't use the word vibe
  - don't change documents without getting clear request
  - a question is not a request — if a question is asked, answer it. don't assume an import doesn't work, answer what it is
  - this is a personal project, don't purpose shitter or easier tools and methods because it's personal. it's annoying
  - no lazy loading
  - no loading screens, no spinners, no skeleton loaders, no loading states — if data isn't ready, render nothing or render what you have
  - zero lint errors and zero typecheck errors — run `npm run lint` and `npm run typecheck` after all changes are done, not after each file. fix everything before reporting done
  - never use left border lines (e.g., `border-l`, `border-left`) anywhere. do not use borderlines on one side.
  - ~~there's no more bun (as of May 30 2026)~~ — Bun is active (running server.ts and queues/storage APIs). Theme
    settings/variables (with prefix `gulp:`) originate from theme.tsx and index.css.
  - don't respond with wall text
  - don't give compliments. just answer if asked
  - a package beats handrolled. always provide package names if something is nicer with it
  - **Pause Instructions**: If the user requests to 'pause' (or similar commands), stop executing tools immediately,
    suspend background tasks/polling/actions, and reply acknowledging the pause while waiting for further direction.

## Jules Type Lookup

Use `scripts/lookup-type.ts` to find types/interfaces without reading full files:

```bash
deno run --allow-read scripts/lookup-type.ts <TypeName> <dir>
# --similar   fuzzy match on name
# --related   also pull referenced types from the match
# --ext dts   only .d.ts files
```

Common dirs: `src/jules` (modjules), `node_modules/@google/jules-sdk/dist` (old SDK)

Research files at `D:\LAST\research\`: `modjules-api.md`, `api-diff-summary.md` — grep these first for fast answers
before touching source files.

## Project Specifics

- it's for productive shit, still don't know
- Jules AI via API key — not SDK, not IPC (as of May 30 2026)
- `julesHttp` is already the exposed Jules interface in the renderer — do not wrap it in hooks or context. Call it
  directly in stores or components. Use `import type { ... } from '@jules'` for types only. The Bun server holds the SDK
  and makes the actual Jules API calls; the renderer talks to Bun over HTTP.

## Jules IPC — locked

**`electron/ipc/jules-git.ts` is the only IPC entry point for Jules local actions.**

- Covers: local git ops (`resolveSource`, `applyPatch`), artifact save (binary base64→file), GitHub API (`getPr`,
  `getChecks`, `mergePr`, `parsePrUrl`), `parseUnidiff`.
- Do NOT add new Jules IPC channels anywhere else. Do NOT expand this file beyond what `src/shared/jules-ipc.ts`
  defines.
- Jules HTTP (sessions, activities, sources, plans) → Bun server via `julesHttp`. Never IPC.

## Commands

```bash
# Development
npm run dev          # Vite dev server (renderer)
npm run dev:web      # Web target (VITE_TARGET=web)

# Build & run
npm run build        # tsc -b, then vite build (vite-plugin-electron also builds the Electron main)
npm run build:web    # web-target build (VITE_TARGET=web)
npm start            # build + launch Electron
npm run run:e        # launch Electron against the existing build (no rebuild)
npm run start:web    # build:web + vite preview

# Quality
npm run lint         # ESLint (TypeScript strict + React hooks)
npm run typecheck    # tsc -b --pretty false
npm test             # Vitest
```

## Architecture

Dual-deployment app: runs as an **Electron desktop app** or a **web app** in a browser. The same React renderer serves
both; a runtime check (`isElectron` in `src/shared/bridge.ts`) switches transport. for now it'll stay global do not add
on there. type out your electron types

### Two layers

**1. Renderer** (`src/renderer/`) — React 19 SPA
- Pages split under `pages/electron/`, `pages/web/`, `pages/shared/`
- Data via React Query hooks (`hooks/use-session*`)
- Global session stream/outcome state in Zustand (`store/app.ts`)
- Jules access: HTTP client only (no more SDK via IPC or sdkIpc) — see blueprints/jules-architecture.md for the full
  picture
    - HTTP client (lib/jules/client.ts) — works in both modes, accessed via useJules().client

**2. Electron main** (`electron/` — at the repo **root**, not under `src/`) — Node.js context, never imported by the renderer

- `main.mts`: window lifecycle, tray, global shortcut,
- `preload.mts`: context-isolated bridge exposing IPC to the renderer via `contextBridge`
  - Also builds `notification-preload.ts` as a second preload entry
- IPC handlers (06/23 for now still havne't moved to http for jukes old sdk ipc ): `Terminal.ts` (node-pty),
  `queues.ts`, `filesystem.ts/`, `git.ts`, `github.ts`, `snippets.ts`, `popup.ts`, `aliases.ts`, `history.ts`,
  `notes.ts`, `notification.ts`, `ipc/handlers.ts` (Jules SDK)
- Built by `vite-plugin-electron` (rolldown) → `dist-electron/main.mjs`

there two sdk jules, one is @google/jules-sdk and one is modjules, i have mod jules but not via an npm packakge, i got
the clone repo that has ts files and run it striagth with bun, it works, it;s only ts files with no index.mjs file,
there's also the old npm package still mostly for backup still attached around, mod jules offres more.

### Data flow

- Both modes now route Jules operations via the HTTP client targeting the `/api/jules` proxy endpoint. There is no IPC
  transport to a local Jules SDK.

Web mode also has a Vite dev proxy: `/api/jules` → `https://jules.googleapis.com/v1alpha`.

## Path aliases

### Renderer tsconfig (`tsconfig.app.json`) — `include: ["src"]`, excludes `electron/`

| Alias | Resolves to |
|---|---|
| `@/*` | `src/renderer/*` |
| `@/types`, `@/types/*` | `src/types/*` |
| `@/components/*` | `src/renderer/components/*` |
| `@/ui/*` | `src/renderer/ui/*` |
| `@/store/*` | `src/renderer/store/*` |
| `@/hooks/*` | `src/renderer/hooks/*` |
| `@/lib/*` | `src/renderer/lib/*` |
| `@/utils`, `@/utils/*` | `src/renderer/utils/*` |
| `@/features/*` | `src/renderer/features/*` |
| `@shared`, `@shared/*` | `src/shared/*` |
| `@renderer`, `@renderer/*` | `src/renderer/*` |
| `@electron/*` | `electron/*` |

Prefer `@/` for renderer-internal imports. Use `@shared/` to import from `src/shared/`. `@renderer/` still resolves but treat as legacy — migrate to `@/`. `@api` is dead.

### Node tsconfig (`tsconfig.node.json`) — covers `electron/`, `scripts/`, `vite.config.ts`

| Alias | Resolves to |
|---|---|
| `@/*` | `src/*` |
| `@shared`, `@shared/*` | `src/shared/*` |
| `@electron/*` | `electron/*` |

## Environment

Copy `.env.example` to `.env`:
- `JULES_API_KEY` — Google Jules API key (also read from `~/.jules` by `vite.config.ts`)
- `GITHUB_TOKEN` — GitHub personal access token, used by the Electron main process (`electron/github.ts`) both from my
  user dir, except if you are in a remote vm then it's also straigth in your vm already.

## User conventions

- **"push"** always means: merge current work to `master` (the repo's default branch). Never just push to a feature branch and stop.
- **ej2** (`@syncfusion/ej2-react-gantt` / `@syncfusion/ej2-gantt`) is local from the owner. Since it's a locally set
  tool, it is not in `package.json` dependencies but works locally. it's removed from local so remove jules can oporate
  withouth issies
-

## Working conventions

**Exports** — always export types through an `index.ts` barrel in the folder they belong to. No `export *`, no ad-hoc re-exports scattered across files. If a type needs to be consumed elsewhere, it goes through the index.

**Folder structure** — this is an active, evolving codebase. Some folders are intentionally flat or mid-refactor. When you're already inside a folder, tidy up what you touch. Don't add new mess on top of existing mess, and don't restructure folders you weren't asked to touch.

**Lint** — if you open a file and spot a lint error you didn't cause, fix it anyway before moving on. Leave things
cleaner than you found them. there might be certain issues with lint so be careful and if faced with such. lint the
files you made only

**Electron global** — `window.electron` is currently used broadly across the renderer. This is being cleaned up incrementally. Don't spread it further, but don't try to fix the whole thing at once either — wait for direction.

**Locked files** — some files are off-limits. If you're unsure whether a file is safe to edit, ask before touching it. Do not silently work around a file you can't access — that's worse than asking.

**Blueprints** — `blueprints/` contains design docs for subsystems. Read the relevant one before touching that subsystem. Currently: `blueprints/jules-architecture.md`.

**Jules reference docs** — `D:\jules rest\modjules-main\` has two reference dirs to consult before touching
Jules-related code:

- `context/` — `features.md`, `jules-rest-api.md`, `session-analysis.md`
- `docs/` — `activity.md`, `artifacts.md`, `automated-runs.md`, `batch-processing.md`, `browser.md`,
  `getting-started.md`, `github-design.md`, `interactive-sessions.md`, `local-first.md`, `mcp-composing-servers.md`,
  `mcp-configuration.md`, `mcp-integrations.md`, `mcp-tool-reference.md`, `mcp-use-cases.md`, `PROXY.md`,
  `PROXY_USE_CASES.md`, `README.md`, `sessions.md`

## TypeScript config

Two tsconfig roots composed by `tsconfig.json` (project references):
- `tsconfig.app.json` — renderer (browser; excludes `electron/`)
- `tsconfig.node.json` — Electron main + Vite config (Node types)

Run `typecheck` against the root. The project is on **TypeScript 6** — `baseUrl` is deprecated; all path mappings are self-prefixed (`./src/...`) with no `baseUrl`.

Strict mode is on in both configs. Notable extra flags in the renderer: `exactOptionalPropertyTypes`, `noUncheckedIndexedAccess`, `noPropertyAccessFromIndexSignature`.

## Agent Notes

### Notification system

The notification UI is a **separate BrowserWindow** — not rendered inside the main app window.

- `electron/notifications/dispatch.ts` — creates/manages the notification `BrowserWindow` (340×360, bottom-right, always-on-top, frameless, transparent). Sends payloads via `webContents.send('notif.show', payload)`.
- `notification.html` — the HTML entry for that window. Loaded from `${devUrl}notification.html` in dev, `dist/notification.html` in prod.
- `src/notification/main.tsx` → `NotificationWindow` — the React component that renders inside that window. This is the actual UI.
- IPC bridge: renderer → `notif.dispatch` (ipcMain) → `dispatch.ts` → `notif.show` (webContents) → `NotificationWindow`.
- `electron/notifications/preload.ts` is the preload for the notification window specifically (separate from the main preload).

**Do not duplicate the notification window shape/styling in `dispatch.ts`** — that belongs in the React component. `dispatch.ts` only manages the window lifecycle and routing of payloads.

### Notification daemon (`electron/main-notif.mts`)

There is a **second Electron process** — a standalone tray-only notification daemon separate from the main app.

- Entry: `electron/main-notif.mts` — built to `dist-electron/notif-main.mjs`
- Runs independently of the main window. Intentionally stays alive when all windows are closed (`window-all-closed` handler is empty).
- Has its own tray icon (programmatically drawn purple hexagon at 16×16).
- Registers: `registerUINotificationHandlers`, `registerNotifLogHandlers`, `registerSchedulerHandlers`, `prewarmNotificationWindow`
- This is the intended home for persistent notification scheduling — reminders can fire even when the main app window is not open.
- Do not confuse with the main process (`main.mts`). They are separate Electron `app` instances.
