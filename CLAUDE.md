# CLAUDE.md

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
- Jules access goes through `JulesClient` (`lib/jules/client.ts`), provided to the tree by `useJules()` / `JulesProvider` (`lib/jules/provider.tsx`). The API key is read from `localStorage`, `VITE_JULES_API_KEY`, or the Electron env.

**2. Electron main** (`electron/` — at the repo **root**, not under `src/`) — Node.js context, never imported by the renderer
- `main.mts`: window lifecycle, tray, global shortcut, power monitoring
- `preload.mts`: context-isolated bridge exposing IPC to the renderer via `contextBridge`
- IPC handlers: `Terminal.ts` (node-pty), `queues.ts`, `filesystem.ts`, `git.ts`, `github.ts`, `snippets.ts`, `popup.ts`
- Built by `vite-plugin-electron` → `dist-electron/main.mjs`

> The standalone **Bun/Hono sidecar server is removed** (there is no `server/` dir). `hono` and `@hono/*` linger in `package.json` but are unused/orphaned. The web-mode HTTP backend is being rebuilt as a Node server hosted by the Electron main process.

### Data flow

- **Electron mode**: renderer → IPC (`window.electron`) → main process → Jules SDK
- **Web mode**: renderer → HTTP → (backend being rebuilt) → Jules SDK

The switch is `isElectron` in `src/shared/bridge.ts`; hooks/store branch on it.

### Path aliases

Single flat prefix:

| Alias | Resolves to |
|---|---|
| `@/` | `src/renderer/` |

Import as `@/components/...`, `@/ui/...`, `@/hooks/...`, `@/utils`. Declared in `tsconfig.app.json` and `vite.config.ts`. Electron code lives at the root `electron/` and uses relative imports (it's in the Node tsconfig, not the renderer alias space). Older imports may still use legacy prefixes (`@renderer/`, `@shared/`, `@electron/`, `@api`) — migrate those to `@/`.

## Environment

Copy `.env.example` to `.env`:
- `JULES_API_KEY` — Google Jules API key (also read from `~/.jules` by `vite.config.ts`)
- `GITHUB_TOKEN` — GitHub personal access token, used by the Electron main process (`electron/github.ts`)

## TypeScript config

Two tsconfig roots composed by `tsconfig.json` (project references):
- `tsconfig.app.json` — renderer (browser; excludes `electron`)
- `tsconfig.node.json` — Electron main + Vite config (Node types)

Run `typecheck` against the root. The project is on **TypeScript 6** — `baseUrl` is deprecated, so `paths` entries are self-prefixed (`./src/...`) with no `baseUrl`.
