# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Development
npm run dev          # Full dev: Vite + Bun server concurrently
npm run dev:web      # Web-only (VITE_TARGET=web, no Electron)
npm run dev:server   # Bun sidecar server only (watch mode)

# Build & run
npm run build        # tsc check + concurrent Vite & server build
npm start            # build + launch Electron with sidecar

# Quality
npm run lint         # ESLint (TypeScript strict + React hooks)
npm run typecheck    # tsc -b --pretty false
npm test             # Vitest

# Code generation
npm run gen:types    # Regenerate OpenAPI types from Jules Swagger endpoint
```

## Architecture

This is a dual-deployment app: it runs as an **Electron desktop app** or as a **web app** in a browser. The same React renderer serves both modes; a runtime check (`isElectron` in `src/shared/bridge.ts`) switches between IPC and HTTP transport.

### Three layers

**1. Renderer** (`src/renderer/`) — React 19 SPA running in the browser/webview
- Pages are split under `pages/electron/`, `pages/web/`, and `pages/shared/`
- Data flows through React Query hooks (`hooks/use-session*`, `hooks/use-sessions*`)
- Global session stream/outcome state lives in Zustand (`store/app.ts`)
- API calls go through the OpenAPI fetch client in `api/client.ts` (generated types: `api/jules-api.ts`)

**2. Electron main process** (`src/electron/`) — Node.js context, never imported by renderer
- `main.mts`: window lifecycle, tray, global shortcut (`Ctrl+Shift+Space`), power monitoring
- `preload.mts`: context-isolated bridge; exposes IPC methods to renderer via `contextBridge`
- IPC handlers: `Terminal.ts` (node-pty), `queues.ts`, `filesystem.ts`, `ipc/` (SDK bridge)

**3. Bun sidecar server** (`server/`) — HTTP + WebSocket server on port **3939**
- Hono + OpenAPI; Swagger UI at `http://localhost:3939/docs`
- Routes: sessions, artifacts, runs, sources, connections, queries, syncs, streams
- WebSocket endpoints: `/ws/sessions/:id/stream`, `/ws/sessions/:id/updates`, `/ws/run`, `/ws/sync`
- Concurrency queue caps parallel Jules SDK calls at `MAX_CONCURRENT=4`
- CORS allows `localhost`, `electron://`, and `file://` origins

### Data flow

- **Electron mode**: renderer → IPC → main process → Jules SDK directly
- **Web mode**: renderer → HTTP/WS → Bun server → Jules SDK

The switch happens in `src/shared/bridge.ts`; hooks and store check `isElectron` and call either `window.electronAPI.*` or the HTTP client accordingly.

### Path aliases

| Alias | Resolves to |
|---|---|
| `@/` | `src/` |
| `@renderer/` | `src/renderer/` |
| `@shared/` | `src/shared/` |
| `@electron/` | `src/electron/` |
| `@api` | `src/renderer/api/` |

Aliases are declared in both `tsconfig.app.json` and `vite.config.ts`.

## Environment

Copy `.env.example` to `.env`. Required vars:
- `JULES_API_KEY` — Google Jules API key
- `GITHUB_TOKEN` — GitHub personal access token used by the server

## TypeScript config

Two tsconfig roots:
- `tsconfig.app.json` — renderer (browser, excludes `src/electron`)
- `tsconfig.node.json` — Electron main + Vite config (Node types)

`tsconfig.json` is a project-references root that composes both. Run `typecheck` against the root.
