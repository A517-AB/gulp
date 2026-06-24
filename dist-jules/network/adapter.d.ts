import { ApiClient } from '../api.js';
import { NetworkClient } from '../activities/client.js';
import { Activity } from '../types.js';
import { ListOptions } from '../activities/types.js';
import { Platform } from '../platform/types.js';
/**
 * Concrete implementation of NetworkClient that communicates with the Jules API.
 * Handles fetching activities and streaming them via polling.
 *
 * Includes automatic 404 retry logic for the first request to handle eventual
 * consistency issues when a session is newly created.
 */
export declare class NetworkAdapter implements NetworkClient {
    private apiClient;
    private sessionId;
    private pollingIntervalMs;
    private platform;
    private isFirstRequest;
    constructor(apiClient: ApiClient, sessionId: string, pollingIntervalMs: number, platform: Platform);
    /**
     * Fetches a single activity from the API.
     * Includes 404 retry logic on first request for eventual consistency.
     */
    fetchActivity(activityId: string): Promise<Activity>;
    /**
     * Lists activities from the API with pagination.
     * Includes 404 retry logic on first request for eventual consistency.
     */
    listActivities(options?: ListOptions): Promise<{
        activities: Activity[];
        nextPageToken?: string;
    }>;
    /**
     * Polls the API for new activities and yields them.
     * This stream never ends unless the process is terminated.
     */
    rawStream(): AsyncIterable<Activity>;
}
