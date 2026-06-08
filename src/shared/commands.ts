export const TRIGGERS = ['/', '!', '#', '@', '>'] as const
export type Trigger = typeof TRIGGERS[number]
export type JulesTrigger = '/' | '!' | '#'

export const TRIGGER_META: Record<Trigger, { label: string; description: string }> = {
  '/': { label: 'display',  description: 'Show last MD artifact from Jules session'          },
  '!': { label: 'message',  description: 'Send message to Jules session, fire and forget'    },
  '#': { label: 'stream',   description: 'Live stream from latest Jules session message'     },
  '@': { label: 'terminal', description: 'Switch to terminal'                                },
  '>': { label: 'palette',  description: 'Command palette — settings, alarms, in-tool items' },
}

export function isJulesTrigger(t: Trigger): t is JulesTrigger {
  return t === '/' || t === '!' || t === '#'
}

// ── types ─────────────────────────────────────────────────────────────────────

export interface JulesDisplayCommand {
  id: string
  trigger: '/'
  command: string
  type: 'jules-display'
  sessionId?: string
  label?: string
}

export interface JulesMessageCommand {
  id: string
  trigger: '!'
  command: string
  type: 'jules-message'
  sessionId?: string
  label?: string
  instructions?: string
}

export interface JulesStreamCommand {
  id: string
  trigger: '#'
  command: string
  type: 'jules-stream'
  sessionId?: string
  label?: string
}

export interface TerminalCommand {
  id: string
  trigger: '@'
  command: string
  type: 'terminal'
  label?: string
}

export interface PaletteCommand {
  id: string
  trigger: '>'
  command: string
  type: 'palette'
  label?: string
  action?: string
}

export type JulesCommand = JulesDisplayCommand | JulesMessageCommand | JulesStreamCommand
export type Command      = JulesCommand | TerminalCommand | PaletteCommand
export type CommandType  = Command['type']

// ── normalize ─────────────────────────────────────────────────────────────────

function str(val: unknown, fallback = ''): string {
  return typeof val === 'string' ? val : fallback
}

export function normalizeCommand(raw: Record<string, unknown>): Command {
  const trigger = (raw['trigger'] as Trigger | undefined) ?? '>'
  const id      = str(raw['id']) || crypto.randomUUID()
  const command = str(raw['command'])
  const label   = raw['label'] ? str(raw['label']) : undefined
  const sid     = raw['sessionId'] ? str(raw['sessionId']) : undefined

  switch (trigger) {
    case '/': { const c: JulesDisplayCommand = { id, trigger, command, type: 'jules-display' }; if (label) c.label = label; if (sid) c.sessionId = sid; return c }
    case '!': { const c: JulesMessageCommand = { id, trigger, command, type: 'jules-message' }; if (label) c.label = label; if (sid) c.sessionId = sid; if (raw['instructions']) c.instructions = str(raw['instructions']); return c }
    case '#': { const c: JulesStreamCommand  = { id, trigger, command, type: 'jules-stream'  }; if (label) c.label = label; if (sid) c.sessionId = sid; return c }
    case '@': { const c: TerminalCommand     = { id, trigger, command, type: 'terminal'      }; if (label) c.label = label; return c }
    case '>': { const c: PaletteCommand      = { id, trigger, command, type: 'palette'       }; if (label) c.label = label; if (raw['action']) c.action = str(raw['action']); return c }
    default: { const c: PaletteCommand       = { id, trigger: '>', command, type: 'palette'  }; if (label) c.label = label; return c }
  }
}
