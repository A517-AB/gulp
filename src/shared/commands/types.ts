export type Trigger = '@' | '/'

// ── @: fire-forget message to Jules ──────────────────────────────────────────

export interface AtCommand {
  id:         string
  trigger:    '@'
  alias:      string
  enabled:    boolean
  createdAt:  number
  updatedAt?: number
  sessionId:  string
}

export interface AtResult {
  trigger:   '@'
  commandId: string
  alias:     string
  sessionId: string
  prompt:    string
  sentAt:    number
  status:    'sent' | 'error'
  error?:    string
}

// ── /: pull last MD artifact from Jules ──────────────────────────────────────

export interface DisplayCommand {
  id:         string
  trigger:    '/'
  alias:      string
  enabled:    boolean
  createdAt:  number
  updatedAt?: number
  sessionId:  string
}

export interface DisplayResult {
  trigger:    '/'
  commandId:  string
  alias:      string
  sessionId:  string
  activityId: string
  markdown:   string
  pulledAt:   number
  status:     'ok' | 'empty' | 'error'
  error?:     string
}

// ── unions ────────────────────────────────────────────────────────────────────

export type Command       = AtCommand | DisplayCommand
export type CommandResult = AtResult  | DisplayResult
