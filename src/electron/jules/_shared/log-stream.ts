import type { Activity, SessionClient } from '@google/jules-sdk';

type ActivityType = Activity['type'];

/** Typed handler map for stream activities. Unspecified types are silently ignored. */
export type StreamHandlers = {
  [K in ActivityType]?: (activity: Extract<Activity, { type: K }>) => void;
};

/**
 * Streams a session with typed event handlers — no switch/if chains needed.
 *
 * @param session  The session to stream activities from.
 * @param handlers Typed handler map keyed by activity type. Unspecified types are silently ignored.
 * @param onError  Optional callback invoked when the stream encounters an error.
 *                 If omitted, errors are re-thrown to the caller.
 * @returns A promise that resolves when the stream ends.
 *
 * @example
 * ```ts
 * await logStream(session, {
 *   agentMessaged: (a) => console.log(`Agent: ${a.message}`),
 *   progressUpdated: (a) => console.log(`Progress: ${a.title}`),
 * });
 * ```
 */
export async function logStream(
  session: SessionClient,
  handlers: StreamHandlers,
  onError?: (error: unknown) => void,
): Promise<void> {
  try {
    for await (const activity of session.stream()) {
      const handler = handlers[activity.type] as ((a: Activity) => void) | undefined;
      handler?.(activity);
    }
  } catch (error) {
    if (onError) {
      onError(error);
    } else {
      throw error;
    }
  }
}
