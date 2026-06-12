// NOTE: not sure if this is used anywhere — may be dead code, revisit before deleting
import type {Activity} from '@google/jules-sdk/types'

type ActivityType = Activity['type']

export type StreamHandlers = {
    [K in ActivityType]?: (activity: Extract<Activity, { type: K }>) => void
}

export function dispatchActivity(activity: Activity, handlers: StreamHandlers): void {
    const handler = handlers[activity.type] as ((a: Activity) => void) | undefined
    handler?.(activity)
}
