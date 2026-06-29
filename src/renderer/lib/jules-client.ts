import type {Activity, SessionResource} from '@jules'

export async function listSessions(): Promise<SessionResource[]> {
    return ((await window.jules?.cache.sessions()) ?? []) as SessionResource[]
}

export async function getActivities(sessionId: string): Promise<Activity[]> {
    return ((await window.jules?.cache.activities(sessionId)) ?? []) as Activity[]
}

export async function sendMessage(sessionId: string, msg: string): Promise<void> {
    await window.jules?.cache.send(sessionId, msg)
}

export async function approvePlan(sessionId: string): Promise<void> {
    await window.jules?.cache.approve(sessionId)
}

export async function triggerSync(): Promise<void> {
    await window.jules?.cache.sync()
}
