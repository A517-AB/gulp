# Jules SDK Entrypoints: `browser.mjs` vs `index.mjs`

This document outlines the differences between the two compiled entry points of the Jules SDK and details where you can
and cannot use `index.mjs`.

---

## 1. Can you use `index.mjs` in the browser renderer?

**No.**

If you try to import `index.mjs` inside the React renderer code (e.g., in `src/renderer/`), Vite will fail at build
time, or the browser will crash at runtime with a `ReferenceError` (e.g., `process is not defined` or
`Module "node:fs" has been externalized`).

This is because `index.mjs` compiles with direct dependencies on:

* **Node.js Built-ins:** `node:fs`, `node:path`, `node:crypto`, `node:os`.
* **Server-only Libraries:** `firebase-admin`, `@modelcontextprotocol/sdk`.

---

## 2. Where can you still use `index.mjs`?

You can (and should) use `index.mjs` inside **Node-based contexts**:

1. **Electron Main Process (`electron/`):**
    * Code running in the main thread (like `electron/main.mts`, IPC handlers, and background services) runs in Node.js.
    * It can safely import `index.mjs` (mapped via `tsconfig.node.json` or straight Node imports) to perform secure
      filesystem access, sync background tasks, or run server-side logic.
2. **Terminal Sidecar / Node Servers:**
    * Any local development scripting, migrations, or local CLI processes.

---

## 3. Comparison of Features

| Feature / API           | `browser.mjs` (Vite / React)                  | `index.mjs` (Node / Electron Main)         |
|:------------------------|:----------------------------------------------|:-------------------------------------------|
| **Storage Engine**      | `IndexedDB` (activities), `Memory` (sessions) | Local filesystem disk storage (`.jules/`)  |
| **Sync Checkpoints**    | Skipped (does not write to disk)              | Writes `.jules/cache/sync-checkpoint.json` |
| **Crypto Sign/Verify**  | Browser Subtle Crypto (`window.crypto`)       | Node `node:crypto` module                  |
| **Platform APIs**       | Web `window.fetch` / Browser APIs             | Node filesystem / HTTP clients             |
| **Vite / Bundler Safe** | Yes                                           | No (crashes frontend bundler)              |
| **Security**            | Safe for public environment variables         | Can read private API keys from `~/.jules`  |
