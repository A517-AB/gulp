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

export function normalizeCommand(raw: Record<string, unknown>): Command {
  const r = raw
  const out: Command = {
    id:      String(r['id'] ?? crypto.randomUUID()),
    trigger: (r['trigger'] as Trigger) ?? '/',
    command: String(r['command'] ?? ''),
    type:    (r['type'] as CommandType) ?? 'jules',
  }
  if (r['label'])        out.label        = String(r['label'])
  if (r['sessionId'])    out.sessionId    = String(r['sessionId'])
  if (r['instructions']) out.instructions = String(r['instructions'])
  if (r['expects'])      out.expects      = r['expects'] as 'md' | 'zip'
  if (r['action'])       out.action       = String(r['action'])
  if (r['script'])       out.script       = String(r['script'])
  return out
}
