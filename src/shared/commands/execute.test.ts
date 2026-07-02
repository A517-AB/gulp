import { describe, it, expect, vi } from 'vitest'
import { executeAt, executeTerminal, executePreview, executeDisplay } from './execute'
import type { AtCommand, TerminalCommand, PreviewCommand, DisplayCommand } from './types'

describe('executeAt', () => {
  it('returns sent status on success', async () => {
    const send = vi.fn().mockResolvedValue(undefined)
    const command: AtCommand = {
      id: 'cmd-1',
      trigger: '@',
      alias: 'test',
      enabled: true,
      createdAt: 123,
      sessionId: 'session-1',
    }
    const prompt = 'hello'

    const result = await executeAt(send, command, prompt)

    expect(send).toHaveBeenCalledWith('session-1', 'hello')
    expect(result.status).toBe('sent')
    expect(result.trigger).toBe('@')
    expect(result.commandId).toBe('cmd-1')
    expect(result.alias).toBe('test')
    expect(result.sessionId).toBe('session-1')
    expect(result.prompt).toBe('hello')
    expect(result.sentAt).toBeTypeOf('number')
  })

  it('returns error status on failure', async () => {
    const error = new Error('Network error')
    const send = vi.fn().mockRejectedValue(error)
    const command: AtCommand = {
      id: 'cmd-1',
      trigger: '@',
      alias: 'test',
      enabled: true,
      createdAt: 123,
      sessionId: 'session-1',
    }
    const prompt = 'hello'

    const result = await executeAt(send, command, prompt)

    expect(send).toHaveBeenCalledWith('session-1', 'hello')
    expect(result.status).toBe('error')
    expect(result.trigger).toBe('@')
    expect(result.commandId).toBe('cmd-1')
    expect(result.alias).toBe('test')
    expect(result.sessionId).toBe('session-1')
    expect(result.prompt).toBe('hello')
    expect(result.sentAt).toBeTypeOf('number')
    if (result.status === 'error') {
      expect(result.error).toBe('Network error')
    }
  })
})

describe('executeDisplay', () => {
  it('returns ok status with markdown on success', async () => {
    const session = {
      hydrate: vi.fn().mockResolvedValue(undefined),
      select: vi.fn().mockResolvedValue([
        {
          id: 'act-1',
          type: 'agentMessaged',
          message: '# Hello',
        },
      ]),
    }
    const command: DisplayCommand = {
      id: 'cmd-4',
      trigger: '/',
      alias: 'show',
      enabled: true,
      createdAt: 123,
      sessionId: 'session-1',
    }

    const result = await executeDisplay(session as any, command)

    expect(session.hydrate).toHaveBeenCalledWith('session-1')
    expect(session.select).toHaveBeenCalledWith('session-1', {
      type: 'agentMessaged',
      order: 'desc',
      limit: 1,
    })
    expect(result.status).toBe('ok')
    expect(result.trigger).toBe('/')
    expect(result.commandId).toBe('cmd-4')
    expect(result.alias).toBe('show')
    expect(result.sessionId).toBe('session-1')
    if (result.status === 'ok') {
      expect(result.activityId).toBe('act-1')
      expect(result.markdown).toBe('# Hello')
    }
    expect(result.pulledAt).toBeTypeOf('number')
  })

  it('returns empty status when no agentMessaged activity is found', async () => {
    const session = {
      hydrate: vi.fn().mockResolvedValue(undefined),
      select: vi.fn().mockResolvedValue([]),
    }
    const command: DisplayCommand = {
      id: 'cmd-4',
      trigger: '/',
      alias: 'show',
      enabled: true,
      createdAt: 123,
      sessionId: 'session-1',
    }

    const result = await executeDisplay(session as any, command)

    expect(result.status).toBe('empty')
    if (result.status === 'empty') {
      expect(result.activityId).toBe('')
      expect(result.markdown).toBe('')
    }
  })

  it('returns error status on hydrate failure', async () => {
    const error = new Error('Hydrate failed')
    const session = {
      hydrate: vi.fn().mockRejectedValue(error),
      select: vi.fn(),
    }
    const command: DisplayCommand = {
      id: 'cmd-4',
      trigger: '/',
      alias: 'show',
      enabled: true,
      createdAt: 123,
      sessionId: 'session-1',
    }

    const result = await executeDisplay(session as any, command)

    expect(session.hydrate).toHaveBeenCalledWith('session-1')
    expect(session.select).not.toHaveBeenCalled()
    expect(result.status).toBe('error')
    expect(result.trigger).toBe('/')
    expect(result.commandId).toBe('cmd-4')
    expect(result.alias).toBe('show')
    expect(result.sessionId).toBe('session-1')
    expect(result.pulledAt).toBeTypeOf('number')
    if (result.status === 'error') {
      expect(result.error).toBe('Hydrate failed')
    }
  })
})

describe('executePreview', () => {
  it('returns ok status with patch on success', async () => {
    const session = {
      hydrate: vi.fn().mockResolvedValue(undefined),
      select: vi.fn().mockResolvedValue([
        {
          type: 'sessionCompleted',
          artifacts: [
            {
              type: 'changeSet',
              gitPatch: {
                unidiffPatch: 'diff --git a/file b/file...',
              },
            },
          ],
        },
      ]),
    }
    const command: PreviewCommand = {
      id: 'cmd-3',
      trigger: ':',
      alias: 'diff',
      enabled: true,
      createdAt: 123,
      sessionId: 'session-1',
    }

    const result = await executePreview(session as any, command)

    expect(session.hydrate).toHaveBeenCalledWith('session-1')
    expect(session.select).toHaveBeenCalledWith('session-1', {
      type: 'sessionCompleted',
      order: 'desc',
      limit: 1,
    })
    expect(result.status).toBe('ok')
    expect(result.trigger).toBe(':')
    expect(result.commandId).toBe('cmd-3')
    expect(result.alias).toBe('diff')
    expect(result.sessionId).toBe('session-1')
    if (result.status === 'ok') {
      expect(result.patch).toBe('diff --git a/file b/file...')
    }
    expect(result.pulledAt).toBeTypeOf('number')
  })

  it('returns empty status when no sessionCompleted activity is found', async () => {
    const session = {
      hydrate: vi.fn().mockResolvedValue(undefined),
      select: vi.fn().mockResolvedValue([]),
    }
    const command: PreviewCommand = {
      id: 'cmd-3',
      trigger: ':',
      alias: 'diff',
      enabled: true,
      createdAt: 123,
      sessionId: 'session-1',
    }

    const result = await executePreview(session as any, command)

    expect(result.status).toBe('empty')
    if (result.status === 'empty') {
      expect(result.patch).toBe('')
    }
  })

  it('returns empty status when no changeSet patch is found', async () => {
    const session = {
      hydrate: vi.fn().mockResolvedValue(undefined),
      select: vi.fn().mockResolvedValue([
        {
          type: 'sessionCompleted',
          artifacts: [],
        },
      ]),
    }
    const command: PreviewCommand = {
      id: 'cmd-3',
      trigger: ':',
      alias: 'diff',
      enabled: true,
      createdAt: 123,
      sessionId: 'session-1',
    }

    const result = await executePreview(session as any, command)

    expect(result.status).toBe('empty')
    if (result.status === 'empty') {
      expect(result.patch).toBe('')
    }
  })

  it('returns error status on hydrate failure', async () => {
    const error = new Error('Hydrate failed')
    const session = {
      hydrate: vi.fn().mockRejectedValue(error),
      select: vi.fn(),
    }
    const command: PreviewCommand = {
      id: 'cmd-3',
      trigger: ':',
      alias: 'diff',
      enabled: true,
      createdAt: 123,
      sessionId: 'session-1',
    }

    const result = await executePreview(session as any, command)

    expect(session.hydrate).toHaveBeenCalledWith('session-1')
    expect(session.select).not.toHaveBeenCalled()
    expect(result.status).toBe('error')
    expect(result.trigger).toBe(':')
    expect(result.commandId).toBe('cmd-3')
    expect(result.alias).toBe('diff')
    expect(result.sessionId).toBe('session-1')
    expect(result.pulledAt).toBeTypeOf('number')
    if (result.status === 'error') {
      expect(result.error).toBe('Hydrate failed')
    }
  })
})

describe('executeTerminal', () => {
  it('returns ok status on success', () => {
    const start = vi.fn()
    const input = vi.fn()
    const command: TerminalCommand = {
      id: 'cmd-2',
      trigger: '>',
      alias: 'run',
      enabled: true,
      createdAt: 123,
      script: 'test.py',
      cwd: '/path',
    }

    const result = executeTerminal({ start, input }, command)

    expect(start).toHaveBeenCalledWith('/path')
    expect(input).toHaveBeenCalledWith('python "test.py"\r')
    expect(result.status).toBe('ok')
    expect(result.trigger).toBe('>')
    expect(result.commandId).toBe('cmd-2')
    expect(result.alias).toBe('run')
    expect(result.script).toBe('test.py')
    expect(result.ranAt).toBeTypeOf('number')
  })

  it('uses empty string for cwd if undefined', () => {
    const start = vi.fn()
    const input = vi.fn()
    const command: TerminalCommand = {
      id: 'cmd-2',
      trigger: '>',
      alias: 'run',
      enabled: true,
      createdAt: 123,
      script: 'test.py',
    }

    const result = executeTerminal({ start, input }, command)

    expect(start).toHaveBeenCalledWith('')
    expect(input).toHaveBeenCalledWith('python "test.py"\r')
    expect(result.status).toBe('ok')
  })

  it('returns error status on failure', () => {
    const start = vi.fn().mockImplementation(() => {
      throw new Error('Start failed')
    })
    const input = vi.fn()
    const command: TerminalCommand = {
      id: 'cmd-2',
      trigger: '>',
      alias: 'run',
      enabled: true,
      createdAt: 123,
      script: 'test.py',
      cwd: '/path',
    }

    const result = executeTerminal({ start, input }, command)

    expect(start).toHaveBeenCalledWith('/path')
    expect(input).not.toHaveBeenCalled()
    expect(result.status).toBe('error')
    expect(result.trigger).toBe('>')
    expect(result.commandId).toBe('cmd-2')
    expect(result.alias).toBe('run')
    expect(result.script).toBe('test.py')
    expect(result.ranAt).toBeTypeOf('number')
    if (result.status === 'error') {
      expect(result.error).toBe('Start failed')
    }
  })
})
