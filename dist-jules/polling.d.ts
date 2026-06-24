import { ApiClient } from './api.js';
import { SessionResource } from './types.js';
/**
 * A generalized utility for polling the session resource until a specific
 * condition is met.
 *
 * @param sessionId The ID of the session to poll.
 * @param apiClient The API client for making requests.
 * @param predicateFn A function that returns `true` if polling should stop.
 * @param pollingInterval The interval in milliseconds between poll attempts.
 * @returns The session resource that satisfied the predicate.
 * @internal
 */
export declare function pollSession(sessionId: string, apiClient: ApiClient, predicateFn: (session: SessionResource) => boolean, pollingInterval: number): Promise<SessionResource>;
/**
 * Polls the `GET /sessions/{id}` endpoint until the session reaches a terminal state.
 *
 * @param sessionId The ID of the session to poll.
 * @param apiClient The API client for making requests.
 * @param pollingInterval The interval in milliseconds between poll attempts.
 * @returns The final SessionResource.
 * @internal
 */
export declare function pollUntilCompletion(sessionId: string, apiClient: ApiClient, pollingInterval: number): Promise<SessionResource>;
