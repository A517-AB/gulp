import type {Activity, SessionClient, JulesClient as Jules} from '@jules'
import type {AtCommand, AtResult, DisplayCommand, DisplayResult, TerminalCommand, TerminalResult, PreviewCommand, PreviewResult} from './types'

// ── @: fire-forget ────────────────────────────────────────────────────────────

type SendFn = (sessionId: string, prompt: string) => Promise<void>

export type AtExecutor = (send: SendFn, command: AtCommand, prompt: string) => Promise<AtResult>

export const AT_META = {
  trigger:     '@' as const,
  label:       'message',
  description: 'Send a message to a Jules session, no response',
}

// ── /: pull latest MD ─────────────────────────────────────────────────────────

type HydrateFn = (sessionId: string) => Promise<number>
type SelectFn = (sessionId: string, options?: Parameters<SessionClient['select']>[0]) => Promise<Activity[]>

export interface DisplaySession {
  hydrate: HydrateFn
  select:  SelectFn
}

export type DisplayExecutor = (session: DisplaySession, command: DisplayCommand) => Promise<DisplayResult>

export const DISPLAY_META = {
    trigger: '/' as const,
    label: 'display',
    description: 'Pull latest markdown from a Jules session',
}

// ── >: run script in terminal ─────────────────────────────────────────────────

export type StartFn = (cwd: string) => void
export type InputFn = (data: string) => void

export interface TerminalDeps {
    start: StartFn
    input: InputFn
}

export type TerminalExecutor = (deps: TerminalDeps, command: TerminalCommand) => TerminalResult

export const TERMINAL_META = {
    trigger: '>' as const,
    label: 'terminal',
    description: 'Run a script in the terminal',
}

// ── :: watch preview ─────────────────────────────────────────────────────────

export interface PreviewSession {
  hydrate: HydrateFn
  select:  SelectFn
}

export type PreviewExecutor = (session: PreviewSession, command: PreviewCommand) => Promise<PreviewResult>

export const PREVIEW_META = {
  trigger:     ':' as const,
  label:       'preview',
  description: 'Watch previews (diffs) of a Jules session',
}

export type {Jules}
