export declare class GitHubError extends Error {
    readonly status: number;
    readonly response?: any;
    constructor(message: string, status: number, response?: any);
}
export declare class GitHubNotFoundError extends GitHubError {
    constructor(resource: string);
}
export declare class GitHubAuthError extends GitHubError {
    constructor(message: string);
}
export declare class GitHubRateLimitError extends GitHubError {
    readonly resetAt: Date;
    readonly limit: number;
    readonly remaining: number;
    constructor(resetAt: Date, limit: number, remaining: number);
}
