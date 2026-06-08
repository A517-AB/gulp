# CLAUDE.md

> Last updated: 2026-06-08

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

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

Dual-deployment app: runs as an **Electron desktop app** or a **web app** in a browser. The same React renderer serves both; a runtime check (`isElectron` in `src/shared/bridge.ts`) switches transport.

### Two layers

**1. Renderer** (`src/renderer/`) — React 19 SPA
- Pages split under `pages/electron/`, `pages/web/`, `pages/shared/`
- Data via React Query hooks (`hooks/use-session*`)
- Global session stream/outcome state in Zustand (`store/app.ts`)
- Jules access: two transports — see `blueprints/jules-architecture.md` for the full picture
  - HTTP client (`lib/jules/client.ts`) — works in both modes, accessed via `useJules().client`
  - SDK via IPC (`sdkIpc` in `src/shared/bridge.ts`) — Electron only, for streaming / patch apply

**2. Electron main** (`electron/` — at the repo **root**, not under `src/`) — Node.js context, never imported by the renderer
- `main.mts`: window lifecycle, tray, global shortcut, power monitoring
- `preload.mts`: context-isolated bridge exposing IPC to the renderer via `contextBridge`
  - Also builds `notification-preload.ts` as a second preload entry
- IPC handlers: `Terminal.ts` (node-pty), `queues.ts`, `filesystem.ts/`, `git.ts`, `github.ts`, `snippets.ts`, `popup.ts`, `aliases.ts`, `history.ts`, `notes.ts`, `notification.ts`, `ipc/handlers.ts` (Jules SDK)
- Built by `vite-plugin-electron` (rolldown) → `dist-electron/main.mjs`

> The standalone **Bun/Hono sidecar server is removed** (there is no `server/` dir). `hono` and `@hono/*` linger in `package.json` but are unused. The web-mode HTTP backend is being rebuilt as a Node server hosted by the Electron main process.

### Data flow

- **Electron mode**: renderer → IPC (`window.electron`) → main process → Jules SDK
- **Web mode**: renderer → HTTP → (backend being rebuilt) → Jules SDK

The switch is `isElectron` in `src/shared/bridge.ts`; hooks/store branch on it.

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
- `GITHUB_TOKEN` — GitHub personal access token, used by the Electron main process (`electron/github.ts`)

## User conventions

- **"push"** always means: merge current work to `master` (the repo's default branch). Never just push to a feature branch and stop.

## Working conventions

**Exports** — always export types through an `index.ts` barrel in the folder they belong to. No `export *`, no ad-hoc re-exports scattered across files. If a type needs to be consumed elsewhere, it goes through the index.

**Folder structure** — this is an active, evolving codebase. Some folders are intentionally flat or mid-refactor. When you're already inside a folder, tidy up what you touch. Don't add new mess on top of existing mess, and don't restructure folders you weren't asked to touch.

**Lint** — if you open a file and spot a lint error you didn't cause, fix it anyway before moving on. Leave things cleaner than you found them.

**Electron global** — `window.electron` is currently used broadly across the renderer. This is being cleaned up incrementally. Don't spread it further, but don't try to fix the whole thing at once either — wait for direction.

**Locked files** — some files are off-limits. If you're unsure whether a file is safe to edit, ask before touching it. Do not silently work around a file you can't access — that's worse than asking.

**Blueprints** — `blueprints/` contains design docs for subsystems. Read the relevant one before touching that subsystem. Currently: `blueprints/jules-architecture.md`.

## TypeScript config

Two tsconfig roots composed by `tsconfig.json` (project references):
- `tsconfig.app.json` — renderer (browser; excludes `electron/`)
- `tsconfig.node.json` — Electron main + Vite config (Node types)

Run `typecheck` against the root. The project is on **TypeScript 6** — `baseUrl` is deprecated; all path mappings are self-prefixed (`./src/...`) with no `baseUrl`.

Strict mode is on in both configs. Notable extra flags in the renderer: `exactOptionalPropertyTypes`, `noUncheckedIndexedAccess`, `noPropertyAccessFromIndexSignature`.
