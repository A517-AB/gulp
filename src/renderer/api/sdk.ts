import type { JulesClient } from '@/lib/jules/client'
import type { Session, CreateSessionRequest } from '@/types/jules'

export async function getSessions(client: JulesClient): Promise<Session[]> {
  return client.listSessions()
}

export async function createSession(client: JulesClient, config: CreateSessionRequest): Promise<Session> {
  return client.createSession(config)
}

export async function sendMessage(client: JulesClient, sessionId: string, prompt: string): Promise<void> {
  await client.createActivity({ sessionId, content: prompt })
}

export async function approveSession(client: JulesClient, sessionId: string): Promise<void> {
  await client.approvePlan(sessionId)
}

export async function batchRun(
  client: JulesClient,
  tasks: CreateSessionRequest[],
  options: { concurrency?: number; stopOnError?: boolean } = {},
): Promise<Session[]> {
  const concurrency = options.concurrency ?? 1
  const results: Session[] = []
  for (let i = 0; i < tasks.length; i += concurrency) {
    const chunk = tasks.slice(i, i + concurrency)
    try {
      results.push(...await Promise.all(chunk.map(t => client.createSession(t))))
    } catch (err) {
      if (options.stopOnError) throw err
      console.error('[sdk] batchRun error:', err)
    }
  }
  return results
}
