import type { Activity } from '@google/jules-sdk/types'

export type ActivityType = Activity['type']
export type ActivityRole = Activity['originator']

// Consecutive progressUpdated activities collapse into an array for grouped rendering
export type ActivityGroup = Activity | Activity[]

export type StreamHandlers = {
    [K in ActivityType]?: (activity: Extract<Activity, { type: K }>) => void
}

export function dispatchActivity(activity: Activity, handlers: StreamHandlers): void {
    const handler = handlers[activity.type] as ((a: Activity) => void) | undefined
    handler?.(activity)
}
