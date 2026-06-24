const JULES_API_BASE = 'https://jules.googleapis.com/v1alpha';

export interface GitHubBranch {
  displayName: string;
}

export interface GitHubRepo {
  owner: string;
  repo: string;
  isPrivate?: boolean;
  defaultBranch?: GitHubBranch;
  branches?: GitHubBranch[];
}

export interface JulesSource {
  name: string;
  id?: string;
  githubRepo?: GitHubRepo;
  
  // Geriye dönük uyumluluk (flat fallback fields)
  displayName?: string;
  uri?: string;
  createTime?: string;
}

export interface SourceContext {
  source: string;
  githubRepoContext?: {
    startingBranch?: string;
  };
}

export interface PullRequest {
  url: string;
  title: string;
  description?: string;
}

export interface SessionOutput {
  pullRequest?: PullRequest;
}

export interface JulesSession {
  name: string;
  id?: string;
  prompt?: string;
  sourceContext?: SourceContext;
  source?: string; // Fallback for mock backend
  state?: string;
  createTime?: string;
  updateTime?: string;
  title?: string;
  requirePlanApproval?: boolean;
  automationMode?: 'AUTOMATION_MODE_UNSPECIFIED' | 'AUTO_CREATE_PR';
  url?: string;
  outputs?: SessionOutput[];
}

export interface AgentMessaged {
  agentMessage: string;
}

export interface UserMessaged {
  userMessage: string;
}

export interface PlanStep {
  id: string;
  title: string;
  description: string;
  index: number;
}

export interface Plan {
  id: string;
  steps: PlanStep[];
  createTime: string;
}

export interface PlanGenerated {
  plan: Plan;
}

export interface PlanApproved {
  planId: string;
}

export interface ProgressUpdated {
  title: string;
  description: string;
}

export interface SessionFailed {
  reason: string;
}

export interface GitPatch {
  unidiffPatch: string;
  baseCommitId?: string;
  suggestedCommitMessage?: string;
}

export interface ChangeSet {
  source: string;
  gitPatch?: GitPatch;
}

export interface Media {
  data: string;
  mimeType: string;
}

export interface BashOutput {
  command: string;
  output: string;
  exitCode: number;
}

export interface Artifact {
  changeSet?: ChangeSet;
  media?: Media;
  bashOutput?: BashOutput;
}

export interface JulesActivity {
  name: string;
  id?: string;
  description?: string;
  createTime: string;
  originator?: string;
  artifacts?: Artifact[];

  // Union fields (only biri doludur)
  agentMessaged?: AgentMessaged;
  userMessaged?: UserMessaged;
  planGenerated?: PlanGenerated;
  planApproved?: PlanApproved;
  progressUpdated?: ProgressUpdated;
  sessionCompleted?: {};
  sessionFailed?: SessionFailed;

  // Geriye dönük uyumluluk (flat fallback fields)
  type?: string;
  content?: string;
  author?: string;
}

export interface ListSourcesResponse {
  sources: JulesSource[];
  nextPageToken?: string;
}

export interface ListSessionsResponse {
  sessions: JulesSession[];
  nextPageToken?: string;
}

export interface ListActivitiesResponse {
  activities: JulesActivity[];
  nextPageToken?: string;
}

export interface CreateSessionRequest {
  prompt: string;
  sourceContext?: SourceContext;
  source?: string; // Fallback for mock backend
  title?: string;
  requirePlanApproval?: boolean;
  automationMode?: 'AUTOMATION_MODE_UNSPECIFIED' | 'AUTO_CREATE_PR';
}

export type AuthType = 'bearer' | 'apikey';

function buildHeaders(token: string, authType: AuthType = 'bearer'): Record<string, string> {
  const authHeader: Record<string, string> =
    authType === 'bearer'
      ? { Authorization: `Bearer ${token}` }
      : { 'X-Goog-Api-Key': token };
  return {
    ...authHeader,
    'Content-Type': 'application/json',
  };
}

export async function listSources(apiKey: string, authType: AuthType = 'bearer'): Promise<ListSourcesResponse> {
  const res = await fetch(`${JULES_API_BASE}/sources`, {
    headers: buildHeaders(apiKey, authType),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Jules API error ${res.status}: ${err}`);
  }
  const data = await res.json();
  return { sources: data.sources ?? [], nextPageToken: data.nextPageToken };
}

export async function listSessions(apiKey: string, pageToken?: string, authType: AuthType = 'bearer'): Promise<ListSessionsResponse> {
  const url = new URL(`${JULES_API_BASE}/sessions`);
  if (pageToken) url.searchParams.set('pageToken', pageToken);

  const res = await fetch(url.toString(), {
    headers: buildHeaders(apiKey, authType),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Jules API error ${res.status}: ${err}`);
  }
  const data = await res.json();
  return { sessions: data.sessions ?? [], nextPageToken: data.nextPageToken };
}

export async function getSession(apiKey: string, sessionId: string, authType: AuthType = 'bearer'): Promise<JulesSession> {
  const res = await fetch(`${JULES_API_BASE}/sessions/${sessionId}`, {
    headers: buildHeaders(apiKey, authType),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Jules API error ${res.status}: ${err}`);
  }
  return res.json();
}

export async function listActivities(apiKey: string, sessionId: string, pageToken?: string, authType: AuthType = 'bearer'): Promise<ListActivitiesResponse> {
  const url = new URL(`${JULES_API_BASE}/sessions/${sessionId}/activities`);
  if (pageToken) {
    url.searchParams.set('pageToken', pageToken);
  }
  const res = await fetch(url.toString(), {
    headers: buildHeaders(apiKey, authType),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Jules API error ${res.status}: ${err}`);
  }
  const data = await res.json();
  return { activities: data.activities ?? [], nextPageToken: data.nextPageToken };
}

export async function createSession(apiKey: string, body: CreateSessionRequest, authType: AuthType = 'bearer'): Promise<JulesSession> {
  const res = await fetch(`${JULES_API_BASE}/sessions`, {
    method: 'POST',
    headers: buildHeaders(apiKey, authType),
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Jules API error ${res.status}: ${err}`);
  }
  return res.json();
}

export async function deleteSession(apiKey: string, sessionId: string, authType: AuthType = 'bearer'): Promise<void> {
  const res = await fetch(`${JULES_API_BASE}/sessions/${sessionId}`, {
    method: 'DELETE',
    headers: buildHeaders(apiKey, authType),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Jules API error ${res.status}: ${err}`);
  }
}

export async function approvePlan(apiKey: string, sessionId: string, authType: AuthType = 'bearer'): Promise<void> {
  const res = await fetch(`${JULES_API_BASE}/sessions/${sessionId}:approvePlan`, {
    method: 'POST',
    headers: buildHeaders(apiKey, authType),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Jules API error ${res.status}: ${err}`);
  }
}

export async function sendMessage(apiKey: string, sessionId: string, prompt: string, authType: AuthType = 'bearer'): Promise<void> {
  const res = await fetch(`${JULES_API_BASE}/sessions/${sessionId}:sendMessage`, {
    method: 'POST',
    headers: buildHeaders(apiKey, authType),
    body: JSON.stringify({ prompt }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Jules API error ${res.status}: ${err}`);
  }
}
