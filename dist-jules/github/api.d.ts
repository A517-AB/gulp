export declare class GitHubApiClient {
    private token;
    private baseUrl;
    constructor(token: string, baseUrl?: string);
    request<T>(endpoint: string, options?: RequestInit): Promise<T>;
}
