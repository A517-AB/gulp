# stuff to get

- [ ] `jules.run()` IPC handler — fire and forget, no plan approval, auto-PR. `juleslocal.ts` only has `session.create` (interactive). Need a `jules.run.start` handler.
- [ ] hydrate before snapshot — call `session.hydrate()` before `session.snapshot()` so cache is fresh. Steal pattern from `analyze-session.ts`.
- [ ] ci-report button — session inspector, session is failed/stuck, paste error log, one button sends formatted failure back to same session via `sendMessage`.
- [ ] monitor button — start stream on a session, display live in activity list. no LLM, just the raw stream. already wired, just needs the button.
- [ ] Windows Terminal CLI — bun/node CLI wrapping the same SDK. monitor streaming especially. run outside Electron.
- [ ] mcp-serve entry point — boot `createMcpHandler` from `scripts/mcp-server.ts` on a port. needs a small `scripts/mcp-serve.ts` runner.
