import { Platform, PlatformResponse } from './types.js';
/**
 * Browser implementation of the Platform interface.
 * Uses IndexedDB for file storage.
 */
export declare class BrowserPlatform implements Platform {
    private dbPromise;
    private getDb;
    /**
     * Saves a file to IndexedDB.
     *
     * **Data Transformation:**
     * - Decodes base64 data into a `Blob`.
     *
     * **Side Effects:**
     * - Stores the blob in the `artifacts` object store.
     * - Associates the file with the `activityId` (if provided).
     *
     * @throws {Error} If the encoding is not 'base64'.
     */
    saveFile(filepath: string, data: string, encoding: 'base64', activityId?: string): Promise<void>;
    sleep(ms: number): Promise<void>;
    createDataUrl(data: string, mimeType: string): string;
    private base64ToBlob;
    fetch(input: string, init?: any): Promise<PlatformResponse>;
    crypto: {
        randomUUID: () => `${string}-${string}-${string}-${string}-${string}`;
        sign(text: string, secret: string): Promise<string>;
        verify(text: string, signature: string, secret: string): Promise<boolean>;
        arrayBufferToBase64Url(buffer: ArrayBuffer): string;
    };
    encoding: {
        base64Encode: (text: string) => string;
        base64Decode: (text: string) => string;
    };
    getEnv(key: string): string | undefined;
}
