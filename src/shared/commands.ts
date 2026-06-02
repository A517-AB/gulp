export const TRIGGERS = ['%', '?', '!', '@', '#', '/'] as const
export type Trigger = typeof TRIGGERS[number]

export type CommandType = 'jules' | 'local' | 'script'

export const TRIGGER_META: Record<Trigger, { label: string; description: string; kind: 'jules' | 'local' }> = {
  '%': { label: 'display',  description: 'Show last MD from Jules session — no message sent',   kind: 'jules'  },
  '?': { label: 'query',    description: 'Send text to Jules session, get MD back',              kind: 'jules'  },
  '!': { label: 'action',   description: 'Fire instructions to Jules immediately, no text needed', kind: 'jules' },
  '@': { label: 'message',  description: 'Send a message to Jules session right away',           kind: 'jules'  },
  '#': { label: 'stream',   description: 'Stream live session activities',                       kind: 'jules'  },
  '/': { label: 'local',    description: 'Local command — no Jules, fires instantly',            kind: 'local'  },
}

export function isJulesTrigger(t: Trigger): boolean {
  return TRIGGER_META[t].kind === 'jules'
}

export interface Command {
  id: string
  trigger: Trigger
  command: string
  type: CommandType
  label?: string
  sessionId?: string
  instructions?: string
  expects?: 'md' | 'zip'
  action?: string
  script?: string
}

function str(val: unknown, fallback = ''): string {
  return typeof val === 'string' ? val : fallback
}

export function normalizeCommand(raw: Record<string, unknown>): Command {
  const out: Command = {
    id:      str(raw['id']) || crypto.randomUUID(),
    trigger: (raw['trigger'] as Trigger | undefined) ?? '/',
    command: str(raw['command']),
    type:    (raw['type'] as CommandType | undefined) ?? 'jules',
  }
  if (raw['label'])        out.label        = str(raw['label'])
  if (raw['sessionId'])    out.sessionId    = str(raw['sessionId'])
  if (raw['instructions']) out.instructions = str(raw['instructions'])
  if (raw['expects'])      out.expects      = raw['expects'] as 'md' | 'zip'
  if (raw['action'])       out.action       = str(raw['action'])
  if (raw['script'])       out.script       = str(raw['script'])
  return out
}
