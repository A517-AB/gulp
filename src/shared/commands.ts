export const TRIGGERS = ['/', '?', '!', '@', '#'] as const
export type Trigger = typeof TRIGGERS[number]

export type CommandType = 'jules' | 'local' | 'script'

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
