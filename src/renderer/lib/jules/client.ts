import {sdkIpc} from '@shared/bridge'
import type {Activity, ActivityUserMessaged, SessionResource, Source} from '@google/jules-sdk'
import type {CreateActivityRequest, CreateSessionRequest} from '@jules'

export class JulesAPIError extends Error {
  status?: number
  constructor(message: string, status?: number) {
    super(message)
    this.name = 'JulesAPIError'
    if (status !== undefined) this.status = status
  }
}

export class JulesClient {
  constructor(_apiKey: string) {}

    async listSessions(): Promise<SessionResource[]> {
    if (!sdkIpc) return []
    const resources = await sdkIpc.client.sessions({ limit: 20 })
    console.log('[JulesClient] sessions:', resources.length)
        return resources
  }

  async listSources(): Promise<Source[]> {
    if (!sdkIpc) return []
      return sdkIpc.sources.list()
  }

    async createSession(data: CreateSessionRequest): Promise<SessionResource> {
    if (!sdkIpc) throw new JulesAPIError('SDK not available')
    const ownerRepo = data.sourceId.replace(/^(?:sources\/)?github\//, '')
    const result = await sdkIpc.client.run({
      prompt: data.prompt,
      ...(data.title ? { title: data.title } : {}),
        ...(data.autoCreatePr ? {autoPr: true} : {}),
      ...(ownerRepo ? { source: { github: ownerRepo, baseBranch: data.startingBranch || 'main' } } : {}),
    })
        return sdkIpc.session.info(result.id)
  }

  async approvePlan(sessionId: string): Promise<void> {
    if (!sdkIpc) return
    await sdkIpc.session.approve(sessionId)
  }

    async createActivity(data: CreateActivityRequest): Promise<ActivityUserMessaged> {
    if (sdkIpc) await sdkIpc.session.send(data.sessionId, data.content)
    return {
        type: 'userMessaged',
        name: 'pending',
      id: 'pending',
        createTime: new Date().toISOString(),
        originator: 'user',
        artifacts: [],
        message: data.content,
    }
  }

  async listActivities(sessionId: string): Promise<Activity[]> {
    if (!sdkIpc) return []
    const { activities } = await sdkIpc.activities.list(sessionId)
      return activities
  }
}

export function createJulesClient(apiKey: string): JulesClient {
  return new JulesClient(apiKey)
}
