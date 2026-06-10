import type { SdkIpc } from '@jules'
import type { AtCommand, AtResult, DisplayCommand, DisplayResult } from './types'

// ── @: fire-forget ────────────────────────────────────────────────────────────
// Injects only session.send — reusable across any session via command.sessionId.

type SendFn = SdkIpc['session']['send']

export type AtExecutor = (send: SendFn, command: AtCommand, prompt: string) => Promise<AtResult>

export const AT_META = {
  trigger:     '@' as const,
  label:       'message',
  description: 'Send a message to a Jules session, no response',
}

// ── /: pull latest MD ─────────────────────────────────────────────────────────
// Refresher pattern: hydrate syncs from network, select finds last agentMessaged.
// message field on agentMessaged activity is the markdown content.

type HydrateFn = SdkIpc['session']['hydrate']
type SelectFn  = SdkIpc['session']['select']

export interface DisplaySession {
  hydrate: HydrateFn
  select:  SelectFn
}

export type DisplayExecutor = (session: DisplaySession, command: DisplayCommand) => Promise<DisplayResult>

export const DISPLAY_META = {
  trigger:     '/' as const,
  label:       'display',
  description: 'Pull latest markdown from a Jules session',
}
