import { ApiClient } from './api.js';
import { Activity, Origin } from './types.js';
/**
 * Options for controlling the activity stream.
 * @internal
 */
export type StreamActivitiesOptions = {
    /**
     * Filters to exclude certain activities.
     */
    exclude?: {
        originator: Origin;
    };
};
/**
 * An async generator that implements a hybrid pagination/polling strategy
 * to stream activities for a given session.
 *
 * Includes automatic 404 retry logic for the first request to handle eventual
 * consistency issues when a session is newly created.
 *
 * @param sessionId The ID of the session to stream activities for.
 * @param apiClient The API client to use for requests.
 * @param pollingInterval The time in milliseconds to wait before polling for new activities.
 * @param platform The platform adapter.
 * @param options Streaming options, including filters.
 * @internal
 */
import { Platform } from './platform/types.js';
export declare function streamActivities(sessionId: string, apiClient: ApiClient, pollingInterval: number, platform: Platform, options?: StreamActivitiesOptions): AsyncGenerator<Activity>;
