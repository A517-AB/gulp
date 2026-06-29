export type Trigger = '@' | '/' | '>' | ':'

export interface AtCommand {
  id:         string
  trigger:    '@'
  alias:      string
  enabled:    boolean
  createdAt:  number
  updatedAt?: number
    snippetId: string
}

export interface AtResult {
  trigger:   '@'
  commandId: string
  alias:     string
    snippetId: string
    file: string
    ranAt: number
    status: 'ok' | 'error'
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

// ── >: run a script in terminal ──────────────────────────────────────────────

export interface TerminalCommand {
    id: string
    trigger: '>'
    alias: string
    enabled: boolean
    createdAt: number
    updatedAt?: number
    script: string
    cwd?: string
}

export interface TerminalResult {
    trigger: '>'
    commandId: string
    alias: string
    script: string
    ranAt: number
    status: 'ok' | 'error'
    error?: string
}

// ── :: watch preview diffs from Jules ────────────────────────────────────────

export interface PreviewCommand {
  id:         string
  trigger:    ':'
  alias:      string
  enabled:    boolean
  createdAt:  number
  updatedAt?: number
  sessionId:  string
}

export interface PreviewResult {
  trigger:   ':'
  commandId: string
  alias:     string
  sessionId: string
  patch:     string
  pulledAt:  number
  status:    'ok' | 'empty' | 'error'
  error?:    string
}

// ── unions ────────────────────────────────────────────────────────────────────

export type Command = AtCommand | DisplayCommand | TerminalCommand | PreviewCommand
export type CommandResult = AtResult | DisplayResult | TerminalResult | PreviewResult

