/**
 * @file jules-client.ts
 * @description Renderer-side entry point for Jules data. Every call here goes
 * through `window.jules.cache`, which is the IPC bridge (`electron/preload.mts`)
 * into `registerJulesCacheHandlers` (`electron/ipc/jules-cache.ts`). That handler
 * runs the real Node SDK (`electron/ipc/Jules/index.ts`, `connect()`), so all of
 * this reads/writes the on-disk cache at `.jules/cache` — not the renderer's
 * browser SDK bundle.
 */
import type {Activity, SessionResource} from '@jules'
import type {JulesSessionSnapshot} from '@shared/jules-ipc'

/** Network call, write-through to disk cache. See `jules.cache.sessions` in jules-cache.ts. */
export async function listSessions(): Promise<SessionResource[]> {
    return ((await window.jules?.cache.sessions()) ?? []) as SessionResource[]
}

/** Local cache read (history-first, falls back to network if empty). No cache = no cost. */
export async function getActivities(sessionId: string): Promise<Activity[]> {
    return ((await window.jules?.cache.activities(sessionId)) ?? []) as Activity[]
}

/** Network call — sends a prompt to the agent for the given session. */
export async function sendMessage(sessionId: string, msg: string): Promise<void> {
    await window.jules?.cache.send(sessionId, msg)
}

/** Network call — approves the currently pending plan for the given session. */
export async function approvePlan(sessionId: string): Promise<void> {
    await window.jules?.cache.approve(sessionId)
}

/** Network call — reconciles the on-disk cache with the Jules API. */
export async function triggerSync(): Promise<void> {
    await window.jules?.cache.sync()
}

/** Network call — computed insights (failed commands, plan regenerations, etc.) for a session. */
export async function getSnapshot(sessionId: string): Promise<JulesSessionSnapshot | null> {
    return (await window.jules?.cache.snapshot(sessionId)) ?? null
}
