import type { GitHubApiClient } from './api.js';
import type { PRClient, PRResource } from './types.js';
export declare class PRClientImpl implements PRClient {
    private api;
    readonly owner: string;
    readonly repo: string;
    readonly number: number;
    readonly sessionId?: string;
    private cache?;
    constructor(api: GitHubApiClient, owner: string, repo: string, number: number, sessionId?: string);
    info(): Promise<PRResource>;
}
