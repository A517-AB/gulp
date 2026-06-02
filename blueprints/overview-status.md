# Overview Page — Status & Handoff

Last worked: 2026-06-02. Branch `master`, all pushed (commit `5510eda`).

## What it is
`src/renderer/pages/web/overview/` — a Jules **markdown-artifact viewer**. Shared route (`/overview`, shows in web + Electron). Centered on previewing the MD files a Jules session produces.

## Trigger system

Each command has a `trigger` prefix. Defined in `src/shared/commands.ts` (`Command`, `Trigger`, `CommandType`, `TRIGGER_META`).

| Trigger | Name | Kind | Behavior |
|---------|------|------|----------|
| `%cmd` | display | jules | Refresh artifact panel. No message sent. |
| `?cmd` | query | jules | Send typed body to Jules, get MD back. Needs body text. |
| `!cmd` | action | jules | Fire `instructions` immediately on Enter. Body optional. |
| `@cmd` | message | jules | Send message to Jules right away. Body optional. |
| `#cmd` | stream | jules | Live session stream (wired to refresh for now). |
| `/cmd` | local | local | Fire `cmd.action`. Never touches Jules. |

**Rules**: `/` is local-only (no Jules). `%` = read-only refresh. `?` needs a body. `!`/`@` send immediately. `#` is reserved for streaming. `TRIGGER_META` drives both AliasesPanel UI and OverviewPage dispatch.

## Command storage
- **Electron**: `aliases/aliases.json` — written immediately on every mutation, watched by chokidar. External edits push to UI automatically.
- **Web**: localStorage fallback (`jules-aliases`). Read-only (no add/edit/delete in web mode).
- **Schema**: `src/shared/commands.ts` → `Command` interface. `normalizeCommand()` for safe parsing.

## How it works now
`%cmd`, `?cmd`, `!cmd`, `@cmd`, `#cmd` map to Jules sessions. `/cmd` is local only.

- `%cmd` + Enter → **display**: calls `refresh()`, surfaces last MD. Nothing sent.
- `?cmd <text>` + Enter → **query**: sends `text + instructions + md-directive`. Clears input on send.
- `!cmd` + Enter → **action**: fires `instructions` immediately. Body optional (appended if present).
- `@cmd` + Enter → **message**: sends body (can be empty) to Jules immediately.
- `#cmd` + Enter → **stream**: currently wired to `refresh()`, streaming not yet built.
- `/cmd` + Enter → **local**: sets `panelMode` to `cmd.action` (e.g. opens settings panel). Needs `action` field.

Affordances:
- **MdNotification** — subtle "markdown received" toast, fires only on genuinely new MD.
- **zip** button (panel hover row) — bundles the session's generated files via `jszip`.
- **Settings panel** — floats above input as an overlay (`panelMode === 'settings'`).
- **History panel** — arrow-up from empty input, stores past typed prompts.

## Files

**Entry**
- `pages/web/OverviewPage.tsx` — re-export only
- `pages/web/overview/OverviewPage.tsx` — the actual page, owns all state

**Hooks** (`src/renderer/hooks/`)
- `use-commands.ts` — loads `aliases/aliases.json` (IPC) or localStorage, returns `Command[]`
- `use-artifact-stream.ts` — polls `sdkIpc.getMarkdownFiles` every 3s, tracks `freshCount`, `refresh()`
- `use-history.ts` — IPC read/write for typed history entries

**Components** (`src/renderer/components/overview/`)
- `GhostInput.tsx` — the textarea at the bottom
- `CommandMenu.tsx` — dropup list when you type a trigger (was `AliasMenu.tsx`)
- `HistoryPanel.tsx` — arrow-up panel showing past inputs
- `ArtifactPanel.tsx` — left half, MD tabs + zip/dismiss
- `MdNotification.tsx` — the toast

**Settings** (`src/renderer/pages/shared/settings/`)
- `SettingsPage.tsx` — container, rendered as overlay above input
- `panels/AliasesPanel.tsx` — create/edit/delete commands, trigger chip selector, session datalist
- `panels/connection-tests.ts` — sdk/client connectivity tests

## Data flow
```
trigger typed → CommandMenu → selectCommand() → activeCommand set
activeCommand.sessionId → useArtifactStream polls → files[] → ArtifactPanel shown
Enter pressed → handleSend() → sdkIpc.sendMessage() (or refresh() if trigger is /)
@cmd → selectCommand() → setPanelMode(cmd.action)
```

## Known gaps
- `@sessions` alias: trigger `@` is now Jules-message, but it has `type: local` and no `action` → still broken
- `/` local commands without `action` field are dead — `selectCommand` falls through silently
- `#` stream trigger wired to `refresh()` only — actual streaming not built yet

## Deferred (designed, not built)
- `#` trigger semantics (reserved, no behavior yet)
- Ctrl+Space dropup (autocomplete / history / sub-options)
- BlockNote custom param blocks + template-slot mode
- Web sync: popup to re-import `aliases.json` into localStorage when file changes

## To run
Windows, Electron. `npm start` (build + launch) or `npm run build` then `npm run run:e`.

## State
typecheck ✓  lint ✓ — trigger redesign complete as of 2026-06-02.
