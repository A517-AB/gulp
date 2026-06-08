import { sdkIpc } from '@shared/bridge'
import type { Source, Session, Activity, CreateSessionRequest, CreateActivityRequest } from '@/types/jules'
import type { SessionResource, Activity as SdkActivity } from '@jules'

export class JulesAPIError extends Error {
  status?: number
  constructor(message: string, status?: number) {
    super(message)
    this.name = 'JulesAPIError'
    if (status !== undefined) this.status = status
  }
}

function mapState(state: string): Session['status'] {
  const m: Record<string, Session['status']> = {
    queued: 'queued',
    planning: 'planning',
    awaitingPlanApproval: 'awaitingApproval',
    awaitingUserFeedback: 'awaitingFeedback',
    inProgress: 'active',
    paused: 'paused',
    failed: 'failed',
    completed: 'completed',
  }
  return m[state] ?? 'active'
}

function mapResource(r: SessionResource): Session {
  const sourceContext = r.sourceContext || ({} as any);
  const sourceRaw = sourceContext.source || (r as any).source?.name || (r as any).source?.id || '';
  const sourceId = sourceRaw.replace('sources/github/', '');
  const branch = sourceContext.githubRepoContext?.startingBranch || (r as any).source?.githubRepo?.defaultBranch || 'main';

  return {
    id: r.id || 'unknown',
    sourceId: sourceId || 'unknown',
    title: r.title || 'Untitled',
    status: mapState(r.state || 'unspecified'),
    createdAt: r.createTime || (r as any).createdAt || '',
    updatedAt: r.updateTime || (r as any).updatedAt || '',
    branch,
    archived: Boolean(r.archived),
  }
}

function mapActivity(a: SdkActivity, sessionId: string): Activity {
  let content = ''
  let role: Activity['role'] = 'agent'
  let type: Activity['type'] = 'message'
  let diff: string | undefined = undefined;
  let bashOutput: string | undefined = undefined;

  switch (a.type) {
    case 'agentMessaged':   content = a.message || ''; break
    case 'userMessaged':    content = a.message || ''; role = 'user'; break
    case 'planGenerated':   content = (a.plan?.steps || []).map((s: any, i: number) => `${i + 1}. ${s.title}`).join('\n'); type = 'plan'; break
    case 'planApproved':    content = 'Plan approved'; type = 'plan'; break
    case 'progressUpdated': content = (a.title || '') + (a.description ? `\n${a.description}` : ''); type = 'progress'; break
    case 'sessionCompleted': content = 'Session completed'; type = 'result'; break
    case 'sessionFailed':   content = a.reason || 'Failed'; type = 'error'; break
  }

  // Extract artifacts (diffs and bash logs)
  const artifacts = (a as any).artifacts || [];
  for (const artifact of artifacts) {
    if (artifact.type === 'changeSet' || artifact.changeSet) {
      diff = artifact.changeSet?.gitPatch?.unidiffPatch || artifact.gitPatch?.unidiffPatch;
    } else if (artifact.type === 'bashOutput' || artifact.bashOutput) {
      const output = artifact.bashOutput?.output || artifact.stdout || '';
      const command = artifact.bashOutput?.command || artifact.command || '';
      bashOutput = `$ ${command}\n${output}`.trim();
    }
  }

  const createdAt = (a as any).createTime || (a as any).createdAt || '';

  const mapped: Activity = { id: a.id || 'unknown', sessionId, type, role, content, createdAt };
  if (diff) mapped.diff = diff;
  if (bashOutput) mapped.bashOutput = bashOutput;
  
  return mapped;
}

function mapSource(s: import('@google/jules-sdk').Source): Source {
  return {
    id: s.id,
    name: s.name,
    type: 'github',
    metadata: s.type === 'githubRepo' ? (s as any).githubRepo : undefined,
  };
}

export class JulesClient {
  constructor(_apiKey: string) {}

  async listSessions(): Promise<Session[]> {
    if (!sdkIpc) return []
    const resources = await sdkIpc.client.sessions({ limit: 20 })
    console.log('[JulesClient] sessions:', resources.length)
    return resources.map(mapResource)
  }

  async listSources(): Promise<Source[]> {
    if (!sdkIpc) return []
    const sources = await sdkIpc.sources.list()
    return sources.map(mapSource)
  }

  async createSession(data: CreateSessionRequest): Promise<Session> {
    if (!sdkIpc) throw new JulesAPIError('SDK not available')
    const ownerRepo = data.sourceId.replace(/^(?:sources\/)?github\//, '')
    const result = await sdkIpc.client.run({
      prompt: data.prompt,
      ...(data.title ? { title: data.title } : {}),
      ...(ownerRepo ? { source: { github: ownerRepo, baseBranch: data.startingBranch || 'main' } } : {}),
    })
    const resource = await sdkIpc.session.info(result.id)
    return mapResource(resource)
  }

  async approvePlan(sessionId: string): Promise<void> {
    if (!sdkIpc) return
    await sdkIpc.session.approve(sessionId)
  }

  async createActivity(data: CreateActivityRequest): Promise<Activity> {
    if (sdkIpc) await sdkIpc.session.send(data.sessionId, data.content)
    return {
      id: 'pending',
      sessionId: data.sessionId,
      type: 'message',
      role: 'user',
      content: data.content,
      createdAt: new Date().toISOString(),
    }
  }

  async listActivities(sessionId: string): Promise<Activity[]> {
    if (!sdkIpc) return []
    const { activities } = await sdkIpc.activities.list(sessionId)
    return activities.map((a: SdkActivity) => mapActivity(a, sessionId))
  }
}

export function createJulesClient(apiKey: string): JulesClient {
  return new JulesClient(apiKey)
}
