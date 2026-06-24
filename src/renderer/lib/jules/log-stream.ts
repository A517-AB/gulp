import type {Activity, SessionClient} from '@jules';

type ActivityType = Activity['type'];

export type StreamHandlers = {
    [K in ActivityType]?: (activity: Extract<Activity, { type: K }>) => void;
};

export async function logStream(session: SessionClient, handlers: StreamHandlers, signal?: AbortSignal): Promise<void> {
    for await (const activity of session.activities.stream()) {
        if (signal?.aborted) return;
        const handler = handlers[activity.type] as ((a: Activity) => void) | undefined;
        handler?.(activity);
    }
}
