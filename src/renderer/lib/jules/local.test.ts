import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

type LocalModule = typeof import("./local");

const sessionInfo = {
  id: "sess-1",
  title: "Fix repo issue",
  prompt: "Fix the failing issue",
  state: "completed" as const,
  url: "https://example.com/sessions/sess-1",
  source: "owner/repo",
  branch: "main",
  archived: false,
  outputTypes: ["changeSet"] as const,
  createdAt: "2024-01-01T00:00:00Z",
  updatedAt: "2024-01-01T00:05:00Z",
};

const activity = {
  id: "act-1",
  type: "agentMessage",
  createTime: "2024-01-01T00:01:00Z",
  originator: "agent",
  message: "Done",
  artifacts: [],
};

const source = {
  name: "repo",
  id: "source-1",
  type: "githubRepo" as const,
  fullName: "owner/repo",
  owner: "owner",
  repo: "repo",
  isPrivate: true,
  defaultBranch: "main",
  branches: ["main", "feature/jules"],
};

const markdownFile = {
  path: "notes/summary.md",
  changeType: "created" as const,
  content: "# Summary",
  additions: 3,
  deletions: 0,
};

const generatedFile = {
  path: "notes/todo.txt",
  changeType: "modified" as const,
  content: "todo",
  additions: 1,
  deletions: 1,
};

const snapshot = {
  id: sessionInfo.id,
  state: sessionInfo.state,
  url: sessionInfo.url,
  createdAt: sessionInfo.createdAt,
  updatedAt: sessionInfo.updatedAt,
  durationMs: 300000,
  prompt: sessionInfo.prompt,
  title: sessionInfo.title,
  activities: [activity],
  activityCounts: { agentMessage: 1 },
  timeline: [
    {
      time: activity.createTime,
      type: activity.type,
      summary: activity.message,
    },
  ],
  insights: {
    completionAttempts: 1,
    planRegenerations: 0,
    userInterventions: 0,
    failedCommandCount: 0,
  },
  generatedFiles: [markdownFile],
  markdown: "# Summary",
};

const outcome = {
  sessionId: sessionInfo.id,
  title: sessionInfo.title,
  state: "completed" as const,
  outputTypes: ["changeSet"] as const,
  generatedFiles: [markdownFile],
};

const fleetIssueFixResult = [
  {
    repository: "owner/repo",
    session: sessionInfo,
  },
];

const applyPatchResult = {
  success: true as const,
  branch: "feature/jules",
  commitMessage: "Apply patch",
};

function createMockBridge() {
  const onActivityUnsubscribe = vi.fn();
  const onStreamStateUnsubscribe = vi.fn();

  return {
    setApiKey: vi.fn().mockResolvedValue(true),
    createSession: vi.fn().mockResolvedValue(sessionInfo),
    resumeSession: vi.fn().mockResolvedValue(sessionInfo),
    getSession: vi.fn().mockResolvedValue(sessionInfo),
    hydrateSession: vi.fn().mockResolvedValue(4),
    getHistory: vi.fn().mockResolvedValue([activity]),
    listSources: vi.fn().mockResolvedValue([source]),
    getSource: vi.fn().mockResolvedValue(source),
    getResult: vi.fn().mockResolvedValue(outcome),
    getSnapshot: vi.fn().mockResolvedValue(snapshot),
    dispatchFleetIssueFix: vi.fn().mockResolvedValue(fleetIssueFixResult),
    approve: vi.fn().mockResolvedValue(undefined),
    sendMessage: vi.fn().mockResolvedValue(undefined),
    ask: vi.fn().mockResolvedValue(activity),
    getGeneratedFiles: vi.fn().mockResolvedValue([markdownFile, generatedFile]),
    getMarkdownFiles: vi.fn().mockResolvedValue([markdownFile]),
    startStream: vi.fn().mockResolvedValue(undefined),
    stopStream: vi.fn().mockResolvedValue(undefined),
    onActivity: vi.fn().mockReturnValue(onActivityUnsubscribe),
    onStreamState: vi.fn().mockReturnValue(onStreamStateUnsubscribe),
    applyPatch: vi.fn().mockResolvedValue(applyPatchResult),
    listSessions: vi.fn().mockResolvedValue([sessionInfo]),
  };
}

async function importLocalModule(sdkIpc: unknown): Promise<LocalModule> {
  vi.resetModules();
  vi.doMock("@shared/bridge", () => ({ sdkIpc }));
  return import("./local");
}

describe("localJules", () => {
  let bridge: ReturnType<typeof createMockBridge>;
  let localModule: LocalModule;

  beforeEach(async () => {
    bridge = createMockBridge();
    localModule = await importLocalModule(bridge);
  });

  afterEach(() => {
    vi.resetModules();
    vi.restoreAllMocks();
    vi.unmock("@shared/bridge");
  });

  it("should throw when sdkIpc is unavailable", async () => {
    const { localJules } = await importLocalModule(null);

    expect(() => localJules.listSources()).toThrow(
      "Jules local tools are only available in the Electron build.",
    );
  });

  it.each([
    { method: "setApiKey", args: ["test-api-key"], expected: true },
    {
      method: "createSession",
      args: [
        {
          prompt: "Fix the issue",
          github: "owner/repo",
          branch: "main",
        },
      ],
      expected: sessionInfo,
    },
    { method: "resumeSession", args: ["sess-1"], expected: sessionInfo },
    { method: "getSession", args: ["sess-1"], expected: sessionInfo },
    { method: "hydrateSession", args: ["sess-1"], expected: 4 },
    { method: "getHistory", args: ["sess-1"], expected: [activity] },
    { method: "listSources", args: [], expected: [source] },
    { method: "getSource", args: ["owner/repo"], expected: source },
    { method: "getResult", args: ["sess-1"], expected: outcome },
    { method: "getSnapshot", args: ["sess-1"], expected: snapshot },
    {
      method: "dispatchFleetIssueFix",
      args: [
        {
          repositories: ["owner/repo"],
          issue: "Fix the issue",
          concurrency: 1,
        },
      ],
      expected: fleetIssueFixResult,
    },
    { method: "approve", args: ["sess-1"], expected: undefined },
    {
      method: "sendMessage",
      args: ["sess-1", "Please continue"],
      expected: undefined,
    },
    {
      method: "ask",
      args: ["sess-1", "What changed?"],
      expected: activity,
    },
    {
      method: "getGeneratedFiles",
      args: ["sess-1", { extensions: [".md"], pathIncludes: "notes" }],
      expected: [markdownFile, generatedFile],
    },
    {
      method: "getMarkdownFiles",
      args: ["sess-1"],
      expected: [markdownFile],
    },
    { method: "startStream", args: ["sess-1"], expected: undefined },
    { method: "stopStream", args: ["sess-1"], expected: undefined },
    {
      method: "applyPatch",
      args: ["sess-1", { cwd: "/repo", branch: "feature/jules", dryRun: true }],
      expected: applyPatchResult,
    },
    {
      method: "listSessions",
      args: [{ limit: 5, filter: "repo" }],
      expected: [sessionInfo],
    },
  ])("should delegate $method to sdkIpc", async ({ method, args, expected }) => {
    const result = await (localModule.localJules as Record<string, (...values: unknown[]) => unknown>)[method]?.(...args);

    expect((bridge as Record<string, ReturnType<typeof vi.fn>>)[method]).toHaveBeenCalledWith(...args);
    expect(result).toBe(expected);
  });

  it("should subscribe to activity events through sdkIpc", () => {
    const callback = vi.fn();

    const unsubscribe = localModule.localJules.onActivity(callback);

    expect(bridge.onActivity).toHaveBeenCalledWith(callback);
    expect(unsubscribe).toBe(bridge.onActivity.mock.results[0]?.value);
  });

  it("should subscribe to stream state events through sdkIpc", () => {
    const callback = vi.fn();

    const unsubscribe = localModule.localJules.onStreamState(callback);

    expect(bridge.onStreamState).toHaveBeenCalledWith(callback);
    expect(unsubscribe).toBe(bridge.onStreamState.mock.results[0]?.value);
  });

  it("should keep only markdown files", () => {
    const files = [markdownFile, generatedFile, { ...markdownFile, path: "notes/readme.MDX" }];

    expect(localModule.toMarkdownFiles(files)).toEqual([
      markdownFile,
      { ...markdownFile, path: "notes/readme.MDX" },
    ]);
  });

  it("should index generated files by path", () => {
    const files = [markdownFile, generatedFile];

    const result = localModule.indexFilesByPath(files);

    expect(result.get(markdownFile.path)).toBe(markdownFile);
    expect(result.get(generatedFile.path)).toBe(generatedFile);
    expect(result.size).toBe(2);
  });
});
