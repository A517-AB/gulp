# Transport

Jules-agnostic communication layer. Handles switching between IPC (Electron) and fetch (HTTP) without any Jules-specific knowledge.

## Files

| File | Purpose |
|---|---|
| `types.ts` | `Transport` interface, `TransportMode`, `TransportMonitorEvent` |
| `ipc.ts` | `IpcTransport` — wraps `window.electron`, calls channels by name |
| `fetch.ts` | `FetchTransport` — POSTs to a base URL, handles errors and status |
| `_context.ts` | React context object + `TransportContextValue` type (internal) |
| `context.tsx` | `TransportProvider` — holds active transport in React state, logs switches |
| `use-transport.ts` | `useTransport()` hook — reads from the provider |
| `index.ts` | Barrel. Also holds `getTransport`, `setTransport`, `getMode`, `transportMonitor` |
| `mock/` | MSW mock layer for the fetch transport (see below) |

## How it works

On first import, `index.ts` calls `resolveDefault()`:
- If `window.electron` is present → `IpcTransport`
- Otherwise → `FetchTransport` using `VITE_API_URL` (falls back to `/api`)

The active transport is a module-level singleton. `getTransport()` returns it. `setTransport()` swaps it.

### React

Wrap the app once:

```tsx
<TransportProvider>
  <RouterProvider router={router} />
</TransportProvider>
```

Consume anywhere:

```tsx
const { transport, mode, lastEvent, switchTransport } = useTransport()
```

- `mode` — `'ipc' | 'fetch'`
- `lastEvent` — last `TransportMonitorEvent` (channel, direction, durationMs, ok, error?)
- `switchTransport(t)` — live swap, re-renders all consumers

### Monitor bus

Every `invoke` call on either transport emits to `transportMonitor` (mitt):

```ts
transportMonitor.on('activity', (e) => {
  // e.mode, e.channel, e.direction, e.durationMs, e.ok, e.error
})
```

Subscribe anywhere — no provider needed.

### Router

Use `getMode()` instead of `isElectron` for route guards:

```ts
import { getMode } from '@/transport'
getMode() === 'ipc' ? ipcRoutes : []
```

## Mock layer (`mock/`)

MSW service worker that intercepts fetch calls before they hit the network.

```ts
import { startMock, stopMock } from '@/transport/mock'

await startMock()  // intercepts fetch, logs hits
stopMock()         // back to real network
```

Handlers live in `mock/handlers.ts`. Unhandled routes bypass to the real network by default.

## ESLint guard

`no-restricted-imports` is enforced on this entire folder — `*jules*`, `*sdk*`, and `@google/*` are banned. This folder must stay Jules-agnostic.
