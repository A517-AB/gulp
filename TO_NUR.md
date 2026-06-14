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

## Notes

- Don't trust `src/types/activity-feed.ts` — old stale types, work around it
- SDK types are from an older clone, runtime shape may differ from type definitions — always guard defensively
- IPC bridge pattern: handler in `electron/ipc/handlers.ts` → type in `src/jules/sdk-ipc.ts` → bridge call in `electron/ipc/bridge.ts`
