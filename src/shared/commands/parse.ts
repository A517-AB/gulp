import type { AtCommand, DisplayCommand, Command } from './types'

// ── per-trigger parse results ─────────────────────────────────────────────────

export interface AtParsed      { trigger: '@'; command: AtCommand;      prompt: string }
export interface DisplayParsed { trigger: '/'; command: DisplayCommand               }
export type ParsedInput   = AtParsed | DisplayParsed
export interface ParseErr  { error: string }
export type ParseResult   = { ok: true; value: ParsedInput } | { ok: false; error: string }

export const isParseOk = (r: ParseResult): r is { ok: true; value: ParsedInput } => r.ok

// ── parse functions ───────────────────────────────────────────────────────────

function parseAt(input: string, registry: Command[]): ParseResult {
  const rest  = input.slice(1).trim()
  const space = rest.indexOf(' ')

  if (space === -1)    return { ok: false, error: 'Message required' }

  const alias  = rest.slice(0, space)
  const prompt = rest.slice(space + 1).trim()

  if (!alias)  return { ok: false, error: 'Alias required' }
  if (!prompt) return { ok: false, error: 'Message required' }

  const command = registry.find((c): c is AtCommand => c.trigger === '@' && c.alias === alias && c.enabled)
  if (!command) return { ok: false, error: `Unknown command: @${alias}` }

  return { ok: true, value: { trigger: '@', command, prompt } }
}

function parseDisplay(input: string, registry: Command[]): ParseResult {
  const alias = input.slice(1).trim()

  if (!alias) return { ok: false, error: 'Alias required' }

  const command = registry.find((c): c is DisplayCommand => c.trigger === '/' && c.alias === alias && c.enabled)
  if (!command) return { ok: false, error: `Unknown command: /${alias}` }

  return { ok: true, value: { trigger: '/', command } }
}

// ── main entry ────────────────────────────────────────────────────────────────

export function parseInput(input: string, registry: Command[]): ParseResult {
  const trimmed = input.trim()
  const trigger = trimmed[0]

  if (trigger === '@') return parseAt(trimmed, registry)
  if (trigger === '/') return parseDisplay(trimmed, registry)

  return { ok: false, error: 'Unknown trigger' }
}
