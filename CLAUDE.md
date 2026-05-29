# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Development
npm run dev          # Vite dev server
npm run dev:web      # Web-only (VITE_TARGET=web, no Electron)

# Build & run
npm run build        # tsc check + Vite build
npm start            # build + launch Electron
npm run run:e        # launch Electron without rebuilding

# Quality
npm run lint         # ESLint (TypeScript strict + React hooks)
npm run typecheck    # tsc -b --pretty false
npm test             # Vitest

# Code generation
npm run gen:types    # Regenerate OpenAPI types (requires bunx)
```

## Architecture

Electron desktop app with an optional web mode. Same React renderer serves both; `isElectron` in `src/shared/bridge.ts` switches transport.

### Two layers

**1. Renderer** (`src/renderer/`) — React 19 SPA in the browser/webview
- Pages split under `pages/electron/`, `pages/web/`, `pages/shared/` — imported via barrel indexes
- Jules API calls go through `src/renderer/lib/jules/client.ts` (direct HTTP to `jules.googleapis.com`)
- Jules client exposed via React context (`lib/jules/context.ts` + `lib/jules/provider.tsx`)

**2. Electron main process** (`src/electron/`) — Node.js, never imported by renderer
- `main.mts`: window lifecycle, tray, global shortcut (`Ctrl+Shift+Space`), power monitoring
- `preload.mts`: context-isolated bridge; exposes IPC to renderer via `contextBridge`
- IPC handlers: `Terminal.ts` (node-pty), `queues.ts`, `filesystem.ts`, `ipc/`

### Data flow

- **Electron mode**: renderer → IPC → main process
- **Web mode**: renderer → direct HTTP/WS

### Path aliases

| Alias | Resolves to |
|---|---|
| `@/` | `src/` |
| `@renderer/` | `src/renderer/` |
| `@shared/` | `src/shared/` |
| `@electron/` | `src/electron/` |

Aliases declared in `tsconfig.app.json` and `vite.config.ts`.

## Environment

Copy `.env.example` to `.env`. Required vars:
- `JULES_API_KEY` — Google Jules API key
- `GITHUB_TOKEN` — GitHub personal access token

## TypeScript config

- `tsconfig.app.json` — renderer (browser, excludes `src/electron`)
- `tsconfig.node.json` — Electron main + Vite config (Node types)
- `tsconfig.json` — project-references root composing both
