import type {AtResult, DisplayResult, PreviewResult, TerminalResult} from './types'
import type {AtExecutor, DisplayExecutor, PreviewExecutor, TerminalExecutor} from './triggers'

function getRunner(languageId: string, absPath: string): string {
    const normalized = absPath.replace(/\\/g, '/')
    switch (languageId) {
        case 'python':
            return `python "${normalized}"`
        case 'javascript':
            return `node "${normalized}"`
        case 'typescript':
            return `npx tsx "${normalized}"`
        case 'bash':
            return `bash "${normalized}"`
        case 'pwsh':
        case 'powershell':
            return `powershell -File "${normalized}"`
        default:
            return `node "${normalized}"`
    }
}

export const executeAt: AtExecutor = (deps, command, snippetFile, languageId) => {
    const ranAt = Date.now()
  try {
      const runner = getRunner(languageId, snippetFile)
      deps.start('D:/fuse')
      deps.input(`${runner}\r`)
    return {
      trigger:   '@',
      commandId: command.id,
      alias:     command.alias,
        snippetId: command.snippetId,
        file: snippetFile,
        ranAt,
        status: 'ok',
    } satisfies AtResult
  } catch (err) {
    return {
      trigger:   '@',
      commandId: command.id,
      alias:     command.alias,
        snippetId: command.snippetId,
        file: snippetFile,
        ranAt,
      status:    'error',
      error:     err instanceof Error ? err.message : String(err),
    } satisfies AtResult
  }
}


export const executeTerminal: TerminalExecutor = (deps, command) => {
    const ranAt = Date.now()
    try {
        deps.start(command.cwd ?? '')
        deps.input(`python "${command.script}"\r`)
        return {
            trigger: '>',
            commandId: command.id,
            alias: command.alias,
            script: command.script,
            ranAt,
            status: 'ok',
        } satisfies TerminalResult
    } catch (err) {
        return {
            trigger: '>',
            commandId: command.id,
            alias: command.alias,
            script: command.script,
            ranAt,
            status: 'error',
            error: err instanceof Error ? err.message : String(err),
        } satisfies TerminalResult
    }
}

export const executePreview: PreviewExecutor = async (session, command) => {
  const pulledAt = Date.now()
  try {
    await session.hydrate(command.sessionId)
    const activities = await session.select(command.sessionId, {
      type:  'sessionCompleted',
      order: 'desc',
      limit: 1,
    })
    const completed = activities[0]
    if (completed?.type !== 'sessionCompleted') {
      return { trigger: ':', commandId: command.id, alias: command.alias, sessionId: command.sessionId, patch: '', pulledAt, status: 'empty' } satisfies PreviewResult
    }
    const artifacts: unknown[] = Array.isArray(completed.artifacts) ? completed.artifacts : []
    const cs = artifacts.find((a): a is { type: 'changeSet'; gitPatch: { unidiffPatch?: string } } =>
      typeof a === 'object' && a !== null && 'type' in a && (a as Record<string, unknown>)['type'] === 'changeSet'
    )
    const patch = cs?.gitPatch.unidiffPatch ?? ''
    if (!patch) {
      return { trigger: ':', commandId: command.id, alias: command.alias, sessionId: command.sessionId, patch: '', pulledAt, status: 'empty' } satisfies PreviewResult
    }
    return { trigger: ':', commandId: command.id, alias: command.alias, sessionId: command.sessionId, patch, pulledAt, status: 'ok' } satisfies PreviewResult
  } catch (err) {
    return { trigger: ':', commandId: command.id, alias: command.alias, sessionId: command.sessionId, patch: '', pulledAt, status: 'error', error: err instanceof Error ? err.message : String(err) } satisfies PreviewResult
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
