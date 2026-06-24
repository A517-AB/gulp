import { ProxyConfig } from './types.js';
export type RateLimitRetryConfig = {
    maxRetryTimeMs: number;
    baseDelayMs: number;
    maxDelayMs: number;
};
export type ApiClientOptions = {
    apiKey: string | undefined;
    baseUrl: string;
    requestTimeoutMs: number;
    proxy?: ProxyConfig;
    rateLimitRetry?: Partial<RateLimitRetryConfig>;
};
export type HandshakeContext = {
    intent: 'create';
    sessionConfig: any;
} | {
    intent: 'resume';
    sessionId: string;
};
export type ApiRequestOptions = {
    method?: 'GET' | 'POST';
    body?: Record<string, unknown>;
    query?: Record<string, any>;
    headers?: Record<string, string>;
    handshake?: HandshakeContext;
    _isRetry?: boolean;
};
/**
 * A simple internal API client to handle HTTP requests to the Jules API.
 * @internal
 */
export declare class ApiClient {
    private readonly apiKey;
    private readonly baseUrl;
    private readonly requestTimeoutMs;
    private readonly proxy?;
    private readonly rateLimitConfig;
    private capabilityToken;
    private handshakePromise;
    constructor(options: ApiClientOptions);
    request<T>(endpoint: string, options?: ApiRequestOptions): Promise<T>;
    /**
     * Ensures we have a valid Capability Token.
     * If not, performs the Handshake.
     */
    private ensureToken;
    private performHandshake;
    private resolveUrl;
    private fetchWithTimeout;
}
