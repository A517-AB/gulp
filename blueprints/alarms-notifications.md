# Alarms & Notifications — Architecture Guide

Last worked: 2026-06-01. Branch `claude/latest-changes-S2RIc`, all pushed.

## Overview

Two cooperating systems:

| System | Where | Purpose |
|--------|-------|---------|
| **Notifications** | `electron/notifications.ts` + `src/renderer/store/notifications.ts` | Deliver in-app toasts + OS alerts globally |
| **Alarms** | `electron/alarms.ts` + `src/renderer/pages/electron/AlarmsPage.tsx` | Schedule time-based events; fire notifications when triggered |

## Notification types

Defined in `src/shared/notifications.ts`.

```ts
type NotificationChannel = 'alarm' | 'session' | 'reminder' | 'system' | 'chat'
type NotificationAction  = 'dismiss' | 'snooze' | 'open'

interface AppNotification {
  id:        string
  channel:   NotificationChannel
  title:     string
  body:      string
  timestamp: string
  sound?:    boolean
  actions?:  NotificationAction[]
  meta?:     Record<string, string>   // e.g. { alarmId, sessionId, noteId }
}
```

## How to fire a notification from any page

### Renderer-only (toast only, no OS alert)
```ts
import { useNotifications } from '@/store/notifications'

const { add } = useNotifications()
add({
  id:        crypto.randomUUID(),
  channel:   'reminder',
  title:     'Jules finished',
  body:      'Session abc123 completed.',
  timestamp: new Date().toISOString(),
  sound:     false,
  actions:   ['dismiss', 'open'],
  meta:      { sessionId: 'abc123' },
})
```

### OS notification + toast (Electron only)
```ts
import { notifications } from '@shared/bridge'

notifications?.send({
  id:        crypto.randomUUID(),
  channel:   'session',
  title:     'PR created',
  body:      'Branch pushed and PR opened.',
  timestamp: new Date().toISOString(),
  sound:     true,
})
```

The `notification.send` IPC call hits `electron/notifications.ts → dispatchNotification()`, which fires `new Notification()` (off-window OS alert) then relays the event back to the renderer as `notification.received` so the toast also appears.

## Toast display

`NotificationToast` is mounted once inside `RootLayout` — it is always present regardless of which page is active. It listens for `notification.received` IPC events, adds them to the Zustand store, and plays a Web Audio beep if `sound: true`.

Toasts auto-dismiss after **8 seconds**. Max 20 items in the store at once (oldest dropped).

## Alarm storage & types

Defined in `src/shared/alarms.ts`. Persisted to `<userData>/alarms.json`.

```ts
type AlarmRepeat = 'none' | 'daily' | 'weekdays' | 'weekly'

interface AlarmEntry {
  id:             string
  label:          string
  hour:           number      // 0–23
  minute:         number      // 0–59
  repeat:         AlarmRepeat
  dayOfWeek:      number      // 0=Sun…6=Sat; used when repeat='weekly'
  enabled:        boolean
  sound:          boolean
  snoozeMinutes:  number
  createdAt:      string
  lastFiredDate?: string      // YYYY-MM-DD; guards against double-fire
}
```

## Alarm IPC API

`ElectronAPI["alarms"]` / bridge export `alarms` from `@shared/bridge`.

| Method | Description |
|--------|-------------|
| `alarms.list()` | Returns all alarms sorted by time |
| `alarms.save(alarm)` | Upsert by `id` |
| `alarms.delete(id)` | Remove by id |
| `alarms.toggle(id, enabled)` | Enable/disable; re-enabling clears `lastFiredDate` |
| `alarms.snooze(id, minutes)` | Creates a one-time copy of the alarm firing in N minutes |
| `alarms.onChanged(cb)` | Fires after any mutation; returns unsubscribe fn |

## Scheduler

`setInterval` every **30 seconds** inside `registerAlarmsHandlers`. On each tick:
1. Load all alarms from disk.
2. For each: check `enabled`, `hour`/`minute` match current time, `lastFiredDate` ≠ today (guards double-fire within same minute check window).
3. Repeat logic: `none` fires once then disables; `daily` every day; `weekdays` Mon–Fri; `weekly` matches `dayOfWeek`.
4. Fires `dispatchNotification()` → OS alert + `notification.received` to renderer.
5. For `none` alarms, sets `enabled = false` after firing.
6. Writes updated alarms back to disk; sends `alarms.changed` to renderer.

## Tying alarms/notifications to other systems

Use `meta` to carry context through to the action handler. Example for a Jules session:

```ts
// When starting a Jules session that should notify on completion
add({
  id: crypto.randomUUID(),
  channel: 'session',
  title: 'Session complete',
  body: session.title,
  timestamp: new Date().toISOString(),
  actions: ['dismiss', 'open'],
  meta: { sessionId: session.id },
})
```

The `open` action can be handled in `NotificationToast` (not yet wired) by reading `meta.sessionId` and navigating to `/activity/<id>`.

Future: handle `NotificationAction` responses in `NotificationToast` per channel — e.g. `snooze` on `alarm` channel calls `alarms.snooze(meta.alarmId, Number(meta.snoozeMinutes))`.

## File map

```
src/shared/
  alarms.ts              AlarmEntry, AlarmRepeat
  notifications.ts       AppNotification, NotificationChannel, NotificationAction

electron/
  alarms.ts              IPC handlers + 30s scheduler
  notifications.ts       dispatchNotification() — OS + IPC relay

src/renderer/
  store/notifications.ts Zustand store: items, add, dismiss, clearAll; playAlarmBeep()
  components/notifications/
    NotificationToast.tsx  Fixed toast stack, auto-dismiss, IPC listener
    index.ts
  pages/electron/
    AlarmsPage.tsx         Alarm management UI (/alarms route)
```
