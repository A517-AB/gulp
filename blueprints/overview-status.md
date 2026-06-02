# Overview Page — Status & Handoff

Last worked: 2026-06-02. Branch `master`, all pushed (commit `5510eda`).

## What it is
`src/renderer/pages/web/overview/` — a Jules **markdown-artifact viewer**. Shared route (`/overview`, shows in web + Electron). Centered on previewing the MD files a Jules session produces.

## Trigger system

Each command has a `trigger` prefix. Defined in `src/shared/commands.ts` (`Command`, `Trigger`, `CommandType`).

| Trigger | Name | Behavior |
|---------|------|----------|
| `/cmd` | display | Shows last MD from session. **No Jules call.** Press Enter = surface last artifact. |
| `?cmd` | query | Send typed text to Jules, get MD back. Needs body text. |
| `!cmd` | action | Fires `instructions` immediately on Enter. No body needed (but can override). |
| `@cmd` | local | Calls internal app action via `cmd.action` field. |
| `#cmd` | tag | Reserved |

**Rule**: `/` never touches Jules. `!` fires without waiting for user input. `?` / `#` require a body. `@` dispatches to a local `PanelMode` (e.g. `action: 'settings'`).

## Command storage
- **Electron**: `aliases/aliases.json` — written immediately on every mutation, watched by chokidar. External edits push to UI automatically.
- **Web**: localStorage fallback (`jules-aliases`). Read-only (no add/edit/delete in web mode).
- **Schema**: `src/shared/commands.ts` → `Command` interface. `normalizeCommand()` for safe parsing.

## How it works now
`/cmd` (or `?cmd`, `!cmd`, etc.) maps to a Jules session. Behavior decided by trigger + send time:
- `/cmd` + Enter → **display mode**: calls `refresh()`, surfaces session's last MD. Nothing sent.
- `!cmd` + Enter → **action mode**: fires `instructions` immediately (no body needed).
- `?cmd <text>` + Enter → **send mode**: sends `text` + `cmd.instructions` + "Report back in markdown." if `expects: 'md'`.
- `@cmd` + Enter → **local mode**: sets `panelMode` to `cmd.action` (e.g. opens settings panel). Needs `action` field in alias.

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
- `@sessions` alias has no `action` field → `selectCommand` falls through silently, does nothing
- `type: local` commands without `action` are dead — need either `action` wired or a handler added
- Single-letter triggers work (e.g. `!m`) but `Trigger` type is locked to `['/', '?', '!', '@', '#']`

## Deferred (designed, not built)
- `#` trigger semantics (reserved, no behavior yet)
- Ctrl+Space dropup (autocomplete / history / sub-options)
- BlockNote custom param blocks + template-slot mode
- Web sync: popup to re-import `aliases.json` into localStorage when file changes

## To run
Windows, Electron. `npm start` (build + launch) or `npm run build` then `npm run run:e`.

## State
typecheck ✓  lint ✓ — as of 2026-06-02.
