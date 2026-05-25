import { sdkIpc } from '@shared/bridge'
import type { SessionResource, SessionConfig } from '@/types/jules-sdk'

export async function getSessions(limit: number = 50): Promise<SessionResource[]> {
  if (!sdkIpc) throw new Error('IPC not available')
  return await sdkIpc!.client.sessions({ limit })
}

export async function createSession(config: SessionConfig): Promise<{ id: string }> {
  if (!sdkIpc) throw new Error('IPC not available')
  return await sdkIpc!.client.run(config)
}

export async function sendMessage(sessionId: string, prompt: string): Promise<void> {
  if (!sdkIpc) throw new Error('IPC not available')
  await sdkIpc!.session.send(sessionId, prompt)
}

export async function approveSession(sessionId: string): Promise<void> {
  if (!sdkIpc) throw new Error('IPC not available')
  await sdkIpc!.session.approve(sessionId)
}

export async function batchRun(tasks: SessionConfig[], options: { concurrency?: number, stopOnError?: boolean } = {}): Promise<{ id: string }[]> {
  if (!sdkIpc) throw new Error('IPC not available')

  const concurrency = options.concurrency ?? 1
  const results: { id: string }[] = []

  const chunks: SessionConfig[][] = []
  for (let i = 0; i < tasks.length; i += concurrency) {
    chunks.push(tasks.slice(i, i + concurrency))
  }

  for (const chunk of chunks) {
    const promises = chunk.map(t => sdkIpc!.client.run(t))
    try {
      const chunkResults = await Promise.all(promises)
      results.push(...chunkResults)
    } catch (err) {
      if (options.stopOnError) throw err
      console.error("Batch error:", err)
    }
  }
  return results
}
