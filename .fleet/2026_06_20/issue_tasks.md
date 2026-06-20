# Issue Analysis: A517-AB/gulp

> Analyzed 5 issues on 2026-06-19T23:44:57.065Z

## Executive Summary

I found 4 distinct root causes across the 5 reported issues. All of these are addressable within the repository and require focused frontend/electron updates. The fixes involve exposing missing SDK methods in IPC, updating UI components to handle scheduler enhancements, adding missing scrolling behaviors to the activity feed, and removing hardcoded absolute paths that break snippet storage.

## Root Cause Analysis

### RC-1: Croner Snooze and Schedule UI Gaps

**Related issues:** #21
**Severity:** Medium
**Files involved:** `src/renderer/pages/electron/RemindersPage.tsx`, `src/renderer/components/shared/ScheduleForm.tsx`

#### Diagnosis

The `scheduler` Electron handler implements `snooze` and supports windowed/weekly/monthly schedules, but these are unreachable from the frontend UI. The `ReminderRow` has an `onToggle` property, but lacks an `onSnooze` button. The `ScheduleForm` explicitly only lists `['once', 'interval', 'daily', 'windowed']` as `Kind[]` and defines windowed but not weekly or monthly, leaving parts of the feature set hidden.

#### Proposed Solution

Update `ReminderRow` in `RemindersPage.tsx` to include an `onSnooze` button mapped to `scheduler.snooze(item.id, 15)` and implement the `snooze` function on the page. Update `ScheduleForm.tsx` to expose `weekly` and `monthly` options with appropriate inputs (day of week, day of month).

#### Test Plan

1. Create a reminder and verify the snooze button triggers the `scheduler.snooze` method and adds the snooze entry.
2. Select "weekly" in the schedule form and verify the item is saved correctly with `dayOfWeek`.

---

### RC-2: Missing viewport ref for Auto-scroll

**Related issues:** #20
**Severity:** Low
**Files involved:** `src/renderer/components/workspace/activity/activity-feed.tsx`, `src/renderer/ui/scroll-area.tsx`

#### Diagnosis

In `ActivityFeed.tsx`, the `ScrollArea` component wraps the activity list, but the page doesn't automatically scroll to the bottom when new activities stream in, unlike `ActivityPage.tsx`. To fix this, a `viewportRef` is needed on the `ScrollAreaPrimitive.Viewport` inside `scroll-area.tsx` (using `React.forwardRef`), which can then be used in `ActivityFeed.tsx` with a `useEffect` hook.

#### Proposed Solution

Add `forwardRef` to `ScrollArea` and map it to `ScrollAreaPrimitive.Viewport`. Add a `useRef` and a `useEffect` in `ActivityFeed.tsx` that triggers `el.scrollTo({top: el.scrollHeight})` when `activities` changes.

#### Test Plan

1. Open the ActivityFeed page.
2. Send a message to the agent.
3. Observe the feed smoothly auto-scrolling as the agent responds.

---

### RC-3: Explicit support for broader MIME types in MediaArtifacts

**Related issues:** #19
**Severity:** Low
**Files involved:** `src/renderer/components/workspace/activity/activity-artifacts.tsx`

#### Diagnosis

The issue indicates `MediaArtifact` "only renders as <img>". Though the current implementation in `MediaItemDownloader` checks for `video/` and `audio/`, it defaults everything else to `<img>`. This can be problematic if Jules sends non-image binary files or PDFs (like `application/pdf`).

#### Proposed Solution

Explicitly check `media.format.startsWith("image/")` for `<img>`. Add a fallback view for unsupported MIME types (e.g., showing a placeholder with the file type and the download button). Note that the ticket primarily requested gifs, videos and images, which are supported, but adding an explicit `image/` check makes it robust.

#### Test Plan

1. Feed a `video/mp4` artifact and ensure it renders `<video>`.
2. Feed an `image/gif` artifact and ensure it renders `<img>`.
3. Feed an `application/pdf` artifact and ensure it renders a fallback unsupported UI rather than a broken image.

---

### RC-4: Hardcoded Windows file paths for Snippets

**Related issues:** #18
**Severity:** High
**Files involved:** `electron/snippets.ts`, `src/shared/fuse.ts`

#### Diagnosis

The file `src/shared/fuse.ts` has `export const FUSE_ROOT = 'D:/fuse'`. In `electron/snippets.ts`, `const MANIFEST_PATH = 'D:/fuse/snippets.json'`. If `D:/fuse` doesn't exist or isn't accessible, reading/writing snippets silently fails or logs an error. This breaks saving on Mac/Linux or machines without a D drive.

#### Proposed Solution

Instead of hardcoding, use `app.getPath('userData')` for `MANIFEST_PATH` and `FUSE_ROOT` when running in Electron. Wait, `fuse.ts` is shared with the browser. We can let `electron/snippets.ts` default to `path.join(app.getPath('userData'), 'fuse')` if `FUSE_ROOT` is undefined or we can override it in Electron. Update `electron/snippets.ts` to dynamically resolve `MANIFEST_PATH = path.join(getFuseRoot(), 'snippets.json')`. Update `FUSE_ROOT` initialization to default appropriately instead of throwing if `D:/fuse` doesn't exist.

#### Test Plan

1. Verify saving a snippet creates `snippets.json` in the user data directory.
2. Verify modifying a snippet's title renames the underlying file correctly.

---

### RC-5: Missing SDK IPC Exposure

**Related issues:** #17
**Severity:** Low
**Files involved:** `electron/ipc/handlers.ts`, `electron/ipc/bridge.ts`, `src/jules/sdk-ipc.ts`

#### Diagnosis

Reviewing `jules-sdk-api with overvewi.md`, the `sdk.cache` functions like `getCacheInfo`, `getSessionCacheInfo`, `getActivityCount`, `getLatestActivities`, and `getSessionCount` are not exposed to the renderer via IPC.

#### Proposed Solution

Add `sdk:cache.getCacheInfo`, `sdk:cache.getSessionCacheInfo`, `sdk:cache.getActivityCount`, `sdk:cache.getLatestActivities`, and `sdk:cache.getSessionCount` in `electron/ipc/handlers.ts`, `electron/ipc/bridge.ts` and `src/jules/sdk-ipc.ts`.

#### Test Plan

1. Call `bridge.sdk.cache.getCacheInfo()` from the renderer and ensure it returns successfully.

## Task Plan

| # | Task | Root Cause | Issues | Files | Risk |
|---|------|-----------|--------|-------|------|
| 1 | Add missing SDK cache methods to IPC | RC-5 | #17 | `electron/ipc/handlers.ts`, `electron/ipc/bridge.ts`, `src/jules/sdk-ipc.ts` | Low |
| 2 | Robust MIME-type handling in MediaArtifact | RC-3 | #19 | `src/renderer/components/workspace/activity/activity-artifacts.tsx` | Low |
| 3 | Auto-scroll Activity Feed | RC-2 | #20 | `src/renderer/components/workspace/activity/activity-feed.tsx`, `src/renderer/ui/scroll-area.tsx` | Low |
| 4 | Add Snooze to Reminders UI | RC-1 | #21 | `src/renderer/pages/electron/RemindersPage.tsx`, `src/renderer/components/shared/ScheduleForm.tsx` | Medium |
| 5 | Fix hardcoded snippet paths | RC-4 | #18 | `electron/snippets.ts`, `src/shared/fuse.ts` | Medium |

## File Ownership Matrix

| File | Task | Change Type |
|------|------|-------------|
| `electron/ipc/handlers.ts` | 1 | Modify |
| `electron/ipc/bridge.ts` | 1 | Modify |
| `src/jules/sdk-ipc.ts` | 1 | Modify |
| `src/renderer/components/workspace/activity/activity-artifacts.tsx` | 2 | Modify |
| `src/renderer/components/workspace/activity/activity-feed.tsx` | 3 | Modify |
| `src/renderer/ui/scroll-area.tsx` | 3 | Modify |
| `src/renderer/pages/electron/RemindersPage.tsx` | 4 | Modify |
| `src/renderer/components/shared/ScheduleForm.tsx` | 4 | Modify |
| `electron/snippets.ts` | 5 | Modify |
| `src/shared/fuse.ts` | 5 | Modify |

## Unaddressable Issues

None
