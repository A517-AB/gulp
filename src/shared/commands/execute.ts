import type { AtResult, DisplayResult } from './types'
import type { AtExecutor, DisplayExecutor } from './triggers'

export const executeAt: AtExecutor = async (send, command, prompt) => {
  const sentAt = Date.now()
  try {
    await send(command.sessionId, prompt)
    return {
      trigger:   '@',
      commandId: command.id,
      alias:     command.alias,
      sessionId: command.sessionId,
      prompt,
      sentAt,
      status:    'sent',
    } satisfies AtResult
  } catch (err) {
    return {
      trigger:   '@',
      commandId: command.id,
      alias:     command.alias,
      sessionId: command.sessionId,
      prompt,
      sentAt,
      status:    'error',
      error:     err instanceof Error ? err.message : String(err),
    } satisfies AtResult
  }
}

export const executeDisplay: DisplayExecutor = async (session, command) => {
  const pulledAt = Date.now()
  try {
    await session.hydrate(command.sessionId)
    const activities = await session.select(command.sessionId, {
      type:  'agentMessaged',
      order: 'desc',
      limit: 1,
    })
    const last = activities[0]
    if (last?.type !== 'agentMessaged') {
      return {
        trigger:    '/',
        commandId:  command.id,
        alias:      command.alias,
        sessionId:  command.sessionId,
        activityId: '',
        markdown:   '',
        pulledAt,
        status:     'empty',
      } satisfies DisplayResult
    }
    return {
      trigger:    '/',
      commandId:  command.id,
      alias:      command.alias,
      sessionId:  command.sessionId,
      activityId: last.id,
      markdown:   last.message,
      pulledAt,
      status:     'ok',
    } satisfies DisplayResult
  } catch (err) {
    return {
      trigger:    '/',
      commandId:  command.id,
      alias:      command.alias,
      sessionId:  command.sessionId,
      activityId: '',
      markdown:   '',
      pulledAt,
      status:     'error',
      error:      err instanceof Error ? err.message : String(err),
    } satisfies DisplayResult
  }
}
