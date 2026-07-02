# Jules Research

## Platform Layer

Three platform implementations. The SDK picks one at the entry point.

### Node — `electron/ipc/Jules/platform/node.ts`

Used by `index.mjs` (Electron main). Writes to disk via `node:fs/promises`. The only platform that creates
`.jules/cache/`. Reads env from `process.env`.

### Browser — `electron/ipc/Jules/platform/browser.ts`

Used by `browser.mjs` (renderer). Stores files in IndexedDB (`jules-activities` DB, `artifacts` store). Crypto via
`window.crypto.subtle`. Env from `import.meta.env` → `process.env` → `__MODJULES__` global. Ephemeral — cache clears
with IndexedDB.

### Web — `electron/ipc/Jules/platform/web.ts`

Edge runtimes, Deno, Cloudflare Workers. No file storage (`saveFile` throws). Minimal — fetch, crypto, encoding only.
Server-side gateway use.

---

### Storage backends (follow the platform)

| Platform | Session storage                                                                  | Activity storage                                       |
|----------|----------------------------------------------------------------------------------|--------------------------------------------------------|
| Node     | `storage/node-fs.ts` — `.jules/cache/<id>/session.json` + `sessions.jsonl` index | `storage/node-fs.ts` — `.jules/cache/<id>/activities/` |
| Browser  | `storage/browser.ts` — IndexedDB                                                 | `storage/browser.ts` — IndexedDB                       |
| Web      | `storage/memory.ts` — in-memory, no persistence                                  | `storage/memory.ts` — in-memory                        |
