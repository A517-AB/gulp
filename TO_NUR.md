# TO NUR — Jules SDK Tasks

> Tag: task-to-nur
> Intent: give to Jules to work on her own SDK

## 1. Expose more SDK functions via IPC

The app currently exposes a subset of the Jules SDK through the Electron IPC bridge (`electron/ipc/handlers.ts` + `electron/ipc/bridge.ts` + `src/jules/sdk-ipc.ts`).

There are SDK methods that exist but aren't wired up yet. Go through the full SDK surface and expose anything useful that's missing. Add the handler in `handlers.ts`, the type in `sdk-ipc.ts`, and the bridge call in `bridge.ts`.

Reference the SDK overview at `src/jules/jules-sdk-api with overvewi.md` for the full method list.

## 2. Media — gifs, videos, all formats

`MediaArtifact` has `.data` (base64), `.format` (mimeType). Currently only renders as `<img>`. 

- Find out what mimeTypes Jules actually sends for media artifacts (image/png, image/gif, video/mp4, etc.)
- Handle each format correctly: animated gifs via `<img>`, video via `<video>`, images via `<img>`
- Surface this in both the inline chat feed and a sidebar panel

## 3. SDK notifications styling

Jules sends notifications. Find out where the styling for those notifications comes from — is it the SDK itself, the notification preload (`electron/notification-preload.ts`), or something Jules injects? Document and clean up.

## 4. Browser sound — wtf is it

Something in the app or Electron is producing a browser sound. Find out what triggers it, where it comes from, and whether it should be there or removed.

## 5. Jules settings expansion

- Add overview/commands setup panel in settings — Jules-specific config (API key, default source, etc.)
- New session form is broken without repoless mode — `sourceId` is required but repoless sessions have no source. Fix the form to handle `sourceId = ''` gracefully without erroring.

## 6. Activity feed — first message vs scroll behaviour

Something different between how the first message renders/appears vs how the feed slides down toward the last message. Unclear if it's a scroll anchor issue, an animation conflict, or an initial render jump. Investigate and fix — the feed should land on the latest message cleanly every time.

## 7. Croner expansion + notification improvements

### Fired items debounce
The `SchedulerSection` in `TimePage.tsx` shows a fired-items log (`fired: Test (5s) @ HH:mm:ss`). If multiple jobs fire close together, entries stack. Add debounce so rapid-fire events don't flood the list.

### Croner expansion
`electron/scheduler.ts` — expand what croner can do:
- More schedule kinds exposed in UI (windowed, weekly, monthly are defined but not reachable from any page)
- Per-job enable/disable toggle in the list (handler exists: `scheduler.toggle`)
- Snooze UX wired up properly (handler exists: `scheduler.snooze`)

### Notification improvements
- Review notification styling end-to-end: `electron/notification-preload.ts`, `electron/notification.ts`, `src/renderer/library/notification.ts`
- Sound + action + cancel combinations need a consistent pass
- Consider whether `NotificationSection` / `ActionSection` in `TimePage.tsx` should become real notification settings vs. test bed

## Notes

- SDK types are from an older clone, runtime shape may differ from type definitions — always guard defensively
- IPC bridge pattern: handler in `electron/ipc/handlers.ts` → type in `src/jules/sdk-ipc.ts` → bridge call in `electron/ipc/bridge.ts`
