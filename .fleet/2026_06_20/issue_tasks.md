# Issue Analysis: A517-AB/gulp

> Analyzed 5 issues on 2026-06-20T01:11:43.511Z

## Executive Summary

I analyzed 5 issues and identified 4 addressable root causes related to UI wiring, scroll behaviors, snippet persistence, and IPC coverage.

## Root Cause Analysis

### RC-1: Croner UI wiring gap
**Related issues:** #21
**Severity:** Medium
**Files involved:** `src/renderer/pages/electron/TardisPage.tsx`, `src/renderer/components/shared/ScheduleForm.tsx`

#### Diagnosis
The issue mentions `scheduler.toggle` and `scheduler.snooze` are not wired up, and windowed/weekly/monthly schedules aren't reachable. In `ScheduleForm.tsx`, only `'once'`, `'interval'`, `'daily'`, and `'windowed'` are present in the UI types, missing `'weekly'` and `'monthly'`. Also `TardisPage.tsx` does not wire up snooze.

#### Proposed Solution
1. In `ScheduleForm.tsx`: add 'weekly' and 'monthly' to the `Kind` type and the UI buttons. Add their input fields (day of week selector, day of month selector). Build the schedule accordingly.

```tsx
// src/renderer/components/shared/ScheduleForm.tsx
  function buildSchedule(): ScheduleInput | null {
    if (kind === 'once')     return { kind: 'once',     at: new Date(Date.now() + minutes * 60_000).toISOString() }
    if (kind === 'interval') return { kind: 'interval', everyMinutes: minutes }
    if (kind === 'daily')    return { kind: 'daily',    time }
    if (kind === 'weekly')   return { kind: 'weekly',   time, dayOfWeek }
    if (kind === 'monthly')  return { kind: 'monthly',  time, dayOfMonth }
    return { kind: 'windowed', everyMinutes: minutes, fromHour, toHour, days: [1, 2, 3, 4, 5] }
  }
```

2. In `TardisPage.tsx`: implement a snooze button in the item list row, calling `scheduler.snooze`.

```tsx
// src/renderer/pages/electron/TardisPage.tsx
  async function snooze(id: string) {
    if (!scheduler) return
    await scheduler.snooze(id, 15) // Snooze for 15 minutes
  }

  // Next to the toggle button:
  <button
    onClick={() => { void snooze(item.id) }}
    className="text-xs font-mono px-3 py-1 rounded-md border transition-colors cursor-pointer bg-raised text-fg-ghost border-hair"
  >
    snooze
  </button>
```

#### Test Plan
N/A - frontend UI changes. Verify manually by adding weekly/monthly items and snoozing them.

---

### RC-2: Activity feed scroll anchor missing
**Related issues:** #20
**Severity:** Low
**Files involved:** `src/renderer/components/workspace/activity/activity-feed.tsx`

#### Diagnosis
The feed uses `ScrollArea` but doesn't have an auto-scroll mechanism to scroll down to the bottom when new items appear.

#### Proposed Solution
Add a ref to the end of the list and `useEffect` that calls `scrollIntoView` when `grouped` changes.

```tsx
// src/renderer/components/workspace/activity/activity-feed.tsx
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [grouped])

// Inside the scroll area:
                <ScrollArea className="h-full">
                    <div className="p-3 flex flex-col space-y-2.5">
                        {grouped.map((item, i) => (
                            <ActivityItem ... />
                        ))}
                        <div ref={bottomRef} />
                    </div>
                </ScrollArea>
```

#### Test Plan
N/A - frontend UI changes. Verify feed scrolls to bottom on new messages.

---

### RC-3: Snippet save bug
**Related issues:** #18
**Severity:** High
**Files involved:** `electron/snippets.ts`

#### Diagnosis
In `electron/snippets.ts`:
```typescript
const MANIFEST_PATH = 'D:/fuse/snippets.json'
```
A hardcoded `D:/` drive path in electron code will fail on any machine that doesn't have a D drive or doesn't have that folder.

#### Proposed Solution
Fix the hardcoded path. `MANIFEST_PATH` should use `app.getPath('userData')` or be relative to `getFuseRoot()`.

```typescript
// electron/snippets.ts
import { ipcMain, app } from 'electron'
import type { WebContents } from 'electron'
import fs from 'fs-extra'
import * as path from 'path'
import chokidar from 'chokidar'
import { FuseManifest, FUSE_ROOT } from '../src/shared/fuse'
import type { FuseManifest as FuseManifestType } from '../src/shared/fuse'
import { store } from './store'

const MANIFEST_PATH = path.join(app.getPath('userData'), 'snippets.json')
```

#### Test Plan
Verify snippets save to the correct cross-platform location.

---

### RC-4: Missing SDK methods in IPC
**Related issues:** #17
**Severity:** Medium
**Files involved:** `electron/ipc/handlers.ts`, `src/jules/sdk-ipc.ts`

#### Diagnosis
Methods like `getCacheInfo` are missing in the IPC bridge.

#### Proposed Solution
Expose `getCacheInfo`, `updateGlobalCacheMetadata`, and `getSessionCount` via IPC.

```typescript
// electron/ipc/handlers.ts
    ipcMain.handle('sdk:client.getCacheInfo', async (_, rootDirOverride?: string) => {
        return serialize(await jules.getCacheInfo(rootDirOverride))
    })

    ipcMain.handle('sdk:client.updateGlobalCacheMetadata', async (_, rootDirOverride?: string) => {
        await jules.updateGlobalCacheMetadata(rootDirOverride)
    })

    ipcMain.handle('sdk:client.getSessionCount', async (_, rootDirOverride?: string) => {
        return await jules.getSessionCount(rootDirOverride)
    })
```

#### Test Plan
Verify the new methods can be called via IPC.

## Task Plan

| # | Task | Root Cause | Issues | Files | Risk |
|---|------|-----------|--------|-------|------|
| 1 | Fix Activity Feed Scroll Behavior | RC-2 | #20 | `src/renderer/components/workspace/activity/activity-feed.tsx` | Low |
| 2 | Implement Croner UI wiring | RC-1 | #21 | `src/renderer/pages/electron/TardisPage.tsx`, `src/renderer/components/shared/ScheduleForm.tsx` | Low |
| 3 | Fix Snippet Hardcoded Save Path | RC-3 | #18 | `electron/snippets.ts` | Medium |
| 4 | Expose Missing SDK Methods via IPC | RC-4 | #17 | `electron/ipc/handlers.ts`, `src/jules/sdk-ipc.ts` | Medium |

## File Ownership Matrix

| File | Task | Change Type |
|------|------|-------------|
| `src/renderer/components/workspace/activity/activity-feed.tsx` | task-feed-scroll | Modify |
| `src/renderer/pages/electron/TardisPage.tsx` | task-croner-ui | Modify |
| `src/renderer/components/shared/ScheduleForm.tsx` | task-croner-ui | Modify |
| `electron/snippets.ts` | task-snippet-save-path | Modify |
| `electron/ipc/handlers.ts` | task-ipc-missing-methods | Modify |
| `src/jules/sdk-ipc.ts` | task-ipc-missing-methods | Modify |

## Unaddressable Issues

Issues that require changes outside this repository (backend API, infrastructure, product decisions):

| Issue | Reason | Suggested Owner |
|-------|--------|-----------------|
| #19 | MediaArtifact is already fully implemented to handle video (video/*), audio (audio/*), and images. The issue description is outdated compared to the current codebase state. | None (Close issue) |
