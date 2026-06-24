import { Platform, PlatformResponse } from './types.js';
/**
 * Web Platform implementation using standard Web APIs.
 * Works on Edge runtimes, Deno, Cloudflare Workers, and Node.js 18+.
 *
 * Note: This is a minimal implementation focused on server-side gateway usage.
 * It does not support file storage operations (use NodePlatform for that).
 */
export declare class WebPlatform implements Platform {
    /**
     * File saving is not supported in the Web Platform.
     * Use NodePlatform or BrowserPlatform for file operations.
     */
    saveFile(filepath: string, data: string, encoding: 'base64', activityId?: string): Promise<void>;
    sleep(ms: number): Promise<void>;
    createDataUrl(data: string, mimeType: string): string;
    fetch(input: string, init?: any): Promise<PlatformResponse>;
    crypto: {
        randomUUID: () => string;
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
