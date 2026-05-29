import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { JulesClient, JulesAPIError } from "./client";

const mockFetch = vi.fn<typeof fetch>();

function createJsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
    },
  });
}

function getFirstItem<T>(items: readonly T[], label: string): T {
  const firstItem = items[0];
  if (firstItem === undefined) {
    throw new Error(`Expected ${label} to contain at least one item`);
  }

  return firstItem;
}

function getFetchCall(): Parameters<typeof fetch> {
  const firstCall = mockFetch.mock.calls[0];
  if (firstCall === undefined) {
    throw new Error("Expected fetch to be called");
  }

  return firstCall;
}

function getRequestUrl(input: RequestInfo | URL): string {
  if (typeof input === 'string') {
    return input;
  }

  if (input instanceof URL) {
    return input.toString();
  }

  return input.url;
}

describe("JulesClient", () => {
  const apiKey = "test-api-key";
  let client: JulesClient;

  beforeEach(() => {
    vi.stubGlobal('fetch', mockFetch);
    client = new JulesClient(apiKey);
    mockFetch.mockReset();
  });

  afterAll(() => {
    vi.unstubAllGlobals();
  });

  describe("constructor", () => {
    it("should be instantiated with an API key", () => {
      expect(client).toBeInstanceOf(JulesClient);
    });
  });

  describe("listSessions", () => {
    it("should fetch sessions and map states correctly", async () => {
      const mockResponse = {
        sessions: [
          {
            id: "sess-1",
            state: "ACTIVE",
            createTime: "2023-01-01T00:00:00Z",
            sourceContext: { source: "sources/github/owner/repo" },
          },
          {
            id: "sess-2",
            state: "COMPLETED",
            createTime: "2023-01-02T00:00:00Z",
          },
        ],
      };

      mockFetch.mockResolvedValueOnce(createJsonResponse(mockResponse));

      const sessions = await client.listSessions();
      const [requestUrl, requestInit] = getFetchCall();
      const headers = requestInit?.headers;

      expect(getRequestUrl(requestUrl)).toContain("https://jules.googleapis.com/v1alpha/sessions");
      expect(headers).toBeInstanceOf(Headers);
      if (!(headers instanceof Headers)) {
        throw new Error("Expected fetch headers to be a Headers instance");
      }
      expect(headers.get("x-goog-api-key")).toBe(apiKey);

      expect(sessions).toHaveLength(2);
      const firstSession = getFirstItem(sessions, "sessions");
      const secondSession = getFirstItem(sessions.slice(1), "sessions");
      expect(firstSession.status).toBe("active");
      expect(secondSession.status).toBe("completed");
      expect(firstSession.sourceId).toBe("owner/repo");
    });
  });

  describe("listActivities", () => {
    const sessionId = "session-123";

    it("should correctly map a planGenerated activity", async () => {
      const mockResponse = {
        activities: [
          {
            name: "sessions/123/activities/act-1",
            createTime: "2023-01-01T00:00:00Z",
            originator: "agent",
            planGenerated: {
              plan: {
                title: "Test Plan",
                steps: [{ text: "step 1" }],
              },
            },
          },
        ],
      };

      mockFetch.mockResolvedValueOnce(createJsonResponse(mockResponse));

      const activities = await client.listActivities(sessionId);
      const firstActivity = getFirstItem(activities, "activities");

      expect(firstActivity.type).toBe("plan");
      expect(firstActivity.content).toContain("Test Plan");
      expect(firstActivity.role).toBe("agent");
    });

    it("should correctly map a progressUpdated activity", async () => {
      const mockResponse = {
        activities: [
          {
            name: "sessions/123/activities/act-2",
            createTime: "2023-01-01T00:00:00Z",
            originator: "agent",
            progressUpdated: {
              description: "Working on it...",
            },
          },
        ],
      };

      mockFetch.mockResolvedValueOnce(createJsonResponse(mockResponse));

      const activities = await client.listActivities(sessionId);
      const firstActivity = getFirstItem(activities, "activities");

      expect(firstActivity.type).toBe("progress");
      expect(firstActivity.content).toBe("Working on it...");
    });

    it("should extract git patch from artifacts", async () => {
      const mockResponse = {
        activities: [
          {
            name: "sessions/123/activities/act-3",
            createTime: "2023-01-01T00:00:00Z",
            originator: "agent",
            agentMessaged: { message: "Here is the code" },
            artifacts: [
              {
                changeSet: {
                  gitPatch: {
                    unidiffPatch: "diff --git a/file.ts b/file.ts",
                  },
                },
              },
            ],
          },
        ],
      };

      mockFetch.mockResolvedValueOnce(createJsonResponse(mockResponse));

      const activities = await client.listActivities(sessionId);
      const firstActivity = getFirstItem(activities, "activities");

      expect(firstActivity.diff).toBe("diff --git a/file.ts b/file.ts");
    });

    it("should extract bash output from artifacts", async () => {
      const mockResponse = {
        activities: [
          {
            name: "sessions/123/activities/act-4",
            createTime: "2023-01-01T00:00:00Z",
            originator: "agent",
            progressUpdated: { message: "Running command" },
            artifacts: [
              {
                bashOutput: {
                  output: "Success\n",
                },
              },
            ],
          },
        ],
      };

      mockFetch.mockResolvedValueOnce(createJsonResponse(mockResponse));

      const activities = await client.listActivities(sessionId);
      const firstActivity = getFirstItem(activities, "activities");

      expect(firstActivity.bashOutput).toBe("Success\n");
    });
  });

  describe("Error Handling", () => {
    it("should throw JulesAPIError on 401", async () => {
      mockFetch.mockResolvedValue(createJsonResponse({ error: { message: "Unauthorized" } }, 401));

      await expect(client.listSessions()).rejects.toThrow(JulesAPIError);
      await expect(client.listSessions()).rejects.toThrow("Invalid API key");
    });

    it("should throw JulesAPIError on network failure", async () => {
      mockFetch.mockRejectedValue(new TypeError("Failed to fetch"));

      await expect(client.listSessions()).rejects.toThrow(JulesAPIError);
      await expect(client.listSessions()).rejects.toThrow("Unable to connect");
    });
  });
});
