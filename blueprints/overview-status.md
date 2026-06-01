# Overview Page — Status & Handoff

Last worked: 2026-06-01. Branch `master`, all pushed (commit `5a97501`).

## What it is
`src/renderer/pages/web/overview/` — a Jules **markdown-artifact viewer**. Shared route (`/overview`, shows in web + Electron). Centered on previewing the MD files a Jules session produces.

## Trigger system

Each alias has a `trigger` prefix that determines behavior when invoked. Defined in `src/shared/aliases.ts`.

| Trigger | Name | Behavior |
|---------|------|----------|
| `/cmd` | display | Shows last MD from session. **No Jules call.** Press Enter = surface last artifact. |
| `?cmd` | query | Send typed text to Jules, get MD back. Needs body text. |
| `!cmd` | action | Fires `instructions` immediately on Enter. No body needed (but can override). |
| `@cmd` | context | Reserved |
| `#cmd` | tag | Reserved |

**Rule**: `/` never touches Jules. `!` fires without waiting for user input. `?` / `@` / `#` require a body.

## Alias storage
- **Electron**: `D:\LAST\aliases.json` — written immediately on every mutation, watched by chokidar. External edits push to UI automatically.
- **Web**: localStorage fallback (`jules-aliases`). Read-only (no add/edit/delete in web mode).
- **File not found**: UI shows amber warning, file created on first save.

## How it works now
`/alias` (or `?alias`, `!alias`, etc.) maps to a Jules session. Behavior decided by trigger + send time:
- `/alias` + Enter → **display mode**: surfaces session's last MD. Nothing sent.
- `!alias` + Enter → **action mode**: fires `instructions` immediately.
- `?alias <text>` + Enter → **send mode**: sends `text` + alias `instructions` + hardcoded "Report back in markdown."

Affordances:
- **MdNotification** — subtle "markdown received" toast, fires only on genuinely new MD.
- **zip** button (panel hover row) — bundles the session's generated files via `jszip`.

## Files
- `OverviewPage.tsx` — composes everything, trigger dispatch
- `use-aliases.ts` — IPC (Electron) / localStorage (web) CRUD
- `use-artifact-stream.ts` — polls `sdkIpc.getMarkdownFiles` every 3s, tracks `freshCount`, `refresh()`
- `GhostInput.tsx` / `AliasMenu.tsx` / `SavedCommands.tsx` — input + trigger-aware picker + chips
- `ArtifactPanel.tsx` — readOnly `MarkdownEditor`, tabs for multi-file, save/zip/dismiss
- `MdNotification.tsx` — the toast
- `lib.ts` — `buildPrompt`, `downloadZip`
- `types.ts` — re-exports `JulesAlias` from `@shared/aliases`

## Settings → Aliases panel
`src/renderer/pages/shared/settings/panels/AliasesPanel.tsx`
- Create/edit/delete aliases
- Trigger chip selector
- Session datalist (pulls from Jules API, pick or paste ID)
- Saves to `aliases.json` instantly in Electron

## Deferred (designed, not built)
- `@ / #` trigger semantics (reserved, no behavior yet)
- Ctrl+Space dropup (autocomplete / history / sub-options)
- BlockNote custom param blocks + template-slot mode
- Web sync: popup to re-import `aliases.json` into localStorage when file changes

## To run
Windows, Electron. `npm start` (build + launch) or `npm run build` then `npm run run:e`.

## State
typecheck ✓  lint ✓ — as of last session.
