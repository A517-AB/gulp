# electron/hub

Handlers for the notification/alarm/reminder system.

- `notifications.ts` — dispatch to renderer + OS
- `alarms.ts`        — IPC handlers + 10s interval checker
- `reminders.ts`     — IPC handlers + 10s interval checker

New hub-related electron handlers go here, not in the root `electron/` folder.
Registered in `electron/main.mts`.
