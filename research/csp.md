# Content Security Policy — Research

> Researched: 2026-06-13
> Sources: electronjs.org/docs/latest/tutorial/security, content-security-policy.com/examples/electron/

## How to set CSP in Electron

Two options:

**1. Meta tag in index.html** (used here)
Best for `file://` protocol (prod). Simple, works in both dev and prod. No main process wiring needed.
```html
<meta http-equiv="Content-Security-Policy" content="..." />
```

**2. `webRequest.onHeadersReceived` in main process**
Preferred by Electron docs for HTTP-served content. More dynamic (env-aware), but adds main process complexity.

We use option 1 — simpler, and all API calls go through IPC not the renderer.

---

## Directives decided for this app

| Directive | Value | Why |
|---|---|---|
| `default-src` | `'self'` | deny-all baseline |
| `script-src` | `'self'` | Vite bundles to self |
| `style-src` | `'self' 'unsafe-inline'` | Monaco + Framer Motion inject inline styles — cannot avoid |
| `img-src` | `'self' data: blob:` | data URIs used for icons; blob: for potential Monaco assets |
| `font-src` | `'self'` | Roboto + JetBrains Mono are system fonts, no CDN |
| `connect-src` | `'self' ws://localhost:*` | ws:// for Vite HMR in dev (harmless in prod — no server running) |
| `worker-src` | `blob:` | Monaco workers use `?worker&inline` → Vite creates blob URL workers |
| `object-src` | `'none'` | no plugins |
| `base-uri` | `'self'` | prevent base tag injection |

## What does NOT need to be in connect-src

- `https://jules.googleapis.com` — SDK runs in main process via IPC, not renderer
- `https://api.github.com` — electron/github.ts runs in main process only

## Known trade-off

`'unsafe-inline'` in style-src weakens CSP protection for styles. This is unavoidable with Monaco and Framer Motion without major refactoring. Scripts remain fully locked down (`'self'` only), which is the higher-risk surface.

## Confirmed: implemented in index.html as meta tag
