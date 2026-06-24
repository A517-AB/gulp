import { Activity } from '../types.js';
import { ActivityStorage } from './types.js';
/**
 * Browser implementation of ActivityStorage using IndexedDB.
 * Allows for persistent storage of activities in the browser.
 */
export declare class BrowserStorage implements ActivityStorage {
    private sessionId;
    private dbPromise;
    constructor(sessionId: string);
    private getDb;
    /**
     * Initializes the storage.
     *
     * **Side Effects:**
     * - Opens an IndexedDB connection.
     * - Upgrades the database schema to v2 if necessary (creating object stores).
     */
    init(): Promise<void>;
    /**
     * Closes the storage connection.
     */
    close(): Promise<void>;
    /**
     * Appends an activity to IndexedDB.
     *
     * **Side Effects:**
     * - Adds a `sessionId` field to the activity for indexing.
     * - Writes the modified activity to the `activities` object store.
     */
    append(activity: Activity): Promise<void>;
    /**
     * Retrieves an activity by ID.
     */
    get(activityId: string): Promise<Activity | undefined>;
    /**
     * Retrieves the latest activity for the current session.
     *
     * **Logic:**
     * - Uses the `sessionTimestamp` index to query efficiently.
     * - Opens a cursor in 'prev' direction to find the last entry first.
     */
    latest(): Promise<Activity | undefined>;
    /**
     * Yields all activities for the current session.
     */
    scan(): AsyncIterable<Activity>;
}
