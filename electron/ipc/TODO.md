# IPC Refactor TODO

## 1. Collect handy utilities

Gather debounce, onStream, serialize, send, and other shared helpers into one place.
Don't let them live scattered across bridge/handlers.

## 2. Audit: IPC vs straight renderer import

Go through every method in bridge.ts + handlers.ts and decide:

- **IPC** — needs main process (fs, git, network via SDK)
- **Straight import in renderer** — pure functions, no platform deps
    - Known candidates: `parseUnidiff`, `toSummary`, `toSummaries`
    - Probably more in query/util

## 3. Expand `src/jules/` — the renderer-side SDK layer

Instead of every component calling sdkIpc directly, jules/ becomes the
single entry point in the renderer. Wraps IPC + direct imports. Research
what shape this should take before touching code.

## 4. Switch IPC channels

Once the new shape is agreed:

- Rename/consolidate duplicate channels (session.* vs activities.* overlap)
- Add try/catch + logging to all streaming handlers
- Remove channels that are now straight imports

## 5. Review `src/jules/` folder

Clean up what's there after the new layer is in place.
Remove dead re-exports, fix types, no more `unknown` casts in streams.

## 6. Sleep.
