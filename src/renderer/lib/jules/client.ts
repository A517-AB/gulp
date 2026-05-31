import type {
  Source, Session, SessionStatus, Activity, ActivityType,
  CreateSessionRequest, CreateActivityRequest,
} from "@/types/jules";

// ── internal API shapes ───────────────────────────────────────────────────────

interface ApiSource {
  source?: string;
  name?: string;
}

interface ApiSession {
  id: string;
  title?: string;
  state?: string;
  createTime: string;
  updateTime: string;
  lastActivityAt?: string;
  sourceContext?: {
    source?: string;
    githubRepoContext?: { startingBranch?: string };
  };
}

interface ApiArtifact {
  changeSet?: {
    gitPatch?: { unidiffPatch?: string };
    unidiffPatch?: string;
  };
  bashOutput?: { output?: string };
}

interface ApiActivity {
  name?: string;
  id?: string;
  createTime: string;
  originator?: string;
  planGenerated?: { plan?: { description?: string; summary?: string; title?: string; steps?: unknown[] }; description?: string; summary?: string; title?: string };
  planApproved?: boolean;
  progressUpdated?: { progressDescription?: string; description?: string; message?: string; artifacts?: ApiArtifact[] };
  sessionCompleted?: { summary?: string; message?: string; artifacts?: ApiArtifact[] };
  sessionFailed?: { reason?: string };
  agentMessaged?: { agentMessage?: string; message?: string };
  userMessaged?: { message?: string; content?: string };
  artifacts?: ApiArtifact[];
}

// ── state mapping ─────────────────────────────────────────────────────────────

const STATE_MAP: Record<string, SessionStatus> = {
  QUEUED:                  "queued",
  PLANNING:                "planning",
  AWAITING_PLAN_APPROVAL:  "awaitingApproval",
  AWAITING_USER_FEEDBACK:  "awaitingFeedback",
  IN_PROGRESS:             "active",
  ACTIVE:                  "active",
  PAUSED:                  "paused",
  COMPLETED:               "completed",
  FAILED:                  "failed",
}

// ── error ─────────────────────────────────────────────────────────────────────

export class JulesAPIError extends Error {
  status?: number
  response?: unknown
  constructor(message: string, status?: number, response?: unknown) {
    super(message)
    this.name = "JulesAPIError"
    if (status !== undefined) this.status = status
    if (response !== undefined) this.response = response
  }
}

// ── helpers ───────────────────────────────────────────────────────────────────

function extractDiff(artifacts?: ApiArtifact[]): string | undefined {
  for (const a of artifacts ?? []) {
    const patch = a.changeSet?.gitPatch?.unidiffPatch ?? a.changeSet?.unidiffPatch
    if (patch) return patch
  }
  return undefined
}

function extractBashOutput(artifacts?: ApiArtifact[]): string | undefined {
  for (const a of artifacts ?? []) {
    if (a.bashOutput?.output) return a.bashOutput.output
  }
  return undefined
}

function parseActivity(raw: ApiActivity, sessionId: string): Activity {
  const id = raw.name?.split("/").pop() ?? raw.id ?? ""
  const role = raw.originator === "agent" ? "agent" : "user"
  let type: ActivityType = "message"
  let content = ""
  let diff: string | undefined
  let bashOutput: string | undefined

  if (raw.planGenerated) {
    type = "plan"
    const p = raw.planGenerated.plan ?? raw.planGenerated
    content = p.description ?? p.summary ?? p.title ?? JSON.stringify(p)
  } else if (raw.planApproved) {
    type = "plan"
    content = "Plan approved"
  } else if (raw.progressUpdated) {
    type = "progress"
    content = raw.progressUpdated.progressDescription ?? raw.progressUpdated.description ?? raw.progressUpdated.message ?? ""
    diff = extractDiff(raw.progressUpdated.artifacts)
    bashOutput = extractBashOutput(raw.progressUpdated.artifacts)
  } else if (raw.sessionCompleted) {
    type = "result"
    content = raw.sessionCompleted.summary ?? raw.sessionCompleted.message ?? "Session completed"
    diff = extractDiff(raw.sessionCompleted.artifacts)
    bashOutput = extractBashOutput(raw.sessionCompleted.artifacts)
  } else if (raw.sessionFailed) {
    type = "error"
    content = raw.sessionFailed.reason ?? "Session failed"
  } else if (raw.agentMessaged) {
    type = "message"
    content = raw.agentMessaged.agentMessage ?? raw.agentMessaged.message ?? ""
  } else if (raw.userMessaged) {
    type = "message"
    content = raw.userMessaged.message ?? raw.userMessaged.content ?? ""
  }

  if (!diff) diff = extractDiff(raw.artifacts)
  if (!bashOutput) bashOutput = extractBashOutput(raw.artifacts)

  return {
    id, sessionId, type, role, content, createdAt: raw.createTime,
    ...(diff ? { diff } : {}),
    ...(bashOutput ? { bashOutput } : {}),
    metadata: raw as unknown as Record<string, unknown>,
  }
}

function parseSession(raw: ApiSession): Session {
  return {
    id: raw.id,
    sourceId: raw.sourceContext?.source?.replace("sources/github/", "") ?? "",
    title: raw.title ?? "",
    status: STATE_MAP[raw.state ?? ""] ?? "active",
    createdAt: raw.createTime,
    updatedAt: raw.updateTime,
    ...(raw.lastActivityAt ? { lastActivityAt: raw.lastActivityAt } : {}),
    branch: raw.sourceContext?.githubRepoContext?.startingBranch ?? "main",
  }
}

// ── client ────────────────────────────────────────────────────────────────────

export class JulesClient {
  private baseURL = "https://jules.googleapis.com/v1alpha"
  private apiKey: string

  constructor(apiKey: string) {
    this.apiKey = apiKey
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const response = await fetch(`${this.baseURL}${endpoint}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": this.apiKey,
        ...options.headers,
      },
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({})) as { message?: string }
      if (response.status === 404 && endpoint.includes("/activities")) {
        return { activities: [] } as T
      }
      throw new JulesAPIError(
        error.message ?? `Request failed with status ${response.status}`,
        response.status,
        error,
      )
    }

    return response.json() as Promise<T>
  }

  // ── sources ──────────────────────────────────────────────────────────────────

  async listSources(): Promise<Source[]> {
    let all: ApiSource[] = []
    let pageToken: string | undefined

    do {
      const params = new URLSearchParams({ pageSize: "100" })
      if (pageToken) params.set("pageToken", pageToken)
      const res = await this.request<{ sources?: ApiSource[]; nextPageToken?: string }>(`/sources?${params}`)
      if (res.sources) all = all.concat(res.sources)
      pageToken = res.nextPageToken
    } while (pageToken)

    const sources = all.map((s): Source => {
      const path = s.source ?? s.name ?? ""
      const match = /sources\/github\/(.+)/.exec(path)
      return { id: path, name: match?.[1] ?? path, type: "github", metadata: s as Record<string, unknown> }
    })

    try {
      const sessions = await this.listSessions()
      const latest = new Map<string, string>()
      for (const s of sessions) {
        const sid = `sources/github/${s.sourceId}`
        const t = s.lastActivityAt ?? s.updatedAt ?? s.createdAt
        if (!latest.has(sid) || t > latest.get(sid)!) latest.set(sid, t)
      }
      sources.sort((a, b) => {
        const ta = latest.get(a.id) ?? ""
        const tb = latest.get(b.id) ?? ""
        if (ta && !tb) return -1
        if (!ta && tb) return 1
        return tb.localeCompare(ta)
      })
    } catch {}

    return sources
  }

  async getSource(id: string): Promise<Source> {
    return this.request<Source>(`/sources/${id}`)
  }

  // ── sessions ─────────────────────────────────────────────────────────────────

  async listSessions(sourceId?: string): Promise<Session[]> {
    let all: ApiSession[] = []
    let pageToken: string | undefined

    do {
      const params = new URLSearchParams({ pageSize: "100" })
      if (sourceId) params.set("sourceId", sourceId)
      if (pageToken) params.set("pageToken", pageToken)
      const res = await this.request<{ sessions?: ApiSession[]; nextPageToken?: string }>(`/sessions?${params}`)
      if (res.sessions) all = all.concat(res.sessions)
      pageToken = res.nextPageToken
    } while (pageToken)

    return all.map(parseSession)
  }

  async getSession(id: string): Promise<Session> {
    return this.request<ApiSession>(`/sessions/${id}`).then(parseSession)
  }

  async createSession(data: CreateSessionRequest): Promise<Session> {
    let prompt = data.prompt
    if (data.autoCreatePr) {
      prompt += "\n\nIMPORTANT: Automatically create a pull request when code changes are ready."
    }
    return this.request<ApiSession>("/sessions", {
      method: "POST",
      body: JSON.stringify({
        prompt,
        title: data.title ?? "Untitled Session",
        requirePlanApproval: data.requireApproval ?? false,
        sourceContext: {
          source: data.sourceId,
          githubRepoContext: { startingBranch: data.startingBranch ?? "main" },
        },
      }),
    }).then(parseSession)
  }

  async deleteSession(id: string): Promise<void> {
    await this.request<void>(`/sessions/${id}`, { method: "DELETE" })
  }

  async approvePlan(sessionId: string): Promise<void> {
    await this.request<void>(`/sessions/${sessionId}:approvePlan`, {
      method: "POST",
      body: JSON.stringify({}),
    })
  }

  // ── activities ────────────────────────────────────────────────────────────────

  async listActivities(sessionId: string): Promise<Activity[]> {
    const res = await this.request<{ activities?: ApiActivity[] }>(`/sessions/${sessionId}/activities`)
    return (res.activities ?? []).map(a => parseActivity(a, sessionId))
  }

  async getActivity(sessionId: string, activityId: string): Promise<Activity> {
    const raw = await this.request<ApiActivity>(`/sessions/${sessionId}/activities/${activityId}`)
    return parseActivity(raw, sessionId)
  }

  async createActivity(data: CreateActivityRequest): Promise<Activity> {
    await this.request(`/sessions/${data.sessionId}:sendMessage`, {
      method: "POST",
      body: JSON.stringify({ prompt: data.content }),
    })
    return {
      id: "pending",
      sessionId: data.sessionId,
      type: "message",
      role: "user",
      content: data.content,
      createdAt: new Date().toISOString(),
    }
  }
}

export function createJulesClient(apiKey: string): JulesClient {
  return new JulesClient(apiKey)
}
