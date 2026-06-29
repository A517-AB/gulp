import type {AtCommand, Command, DisplayCommand, PreviewCommand, TerminalCommand} from './types'

// ── per-trigger parse results ─────────────────────────────────────────────────

export interface AtParsed {
    trigger: '@';
    command: AtCommand;
}

export interface DisplayParsed {
    trigger: '/';
    command: DisplayCommand
}

export interface TerminalParsed {
    trigger: '>';
    command: TerminalCommand
}

export interface PreviewParsed {
    trigger: ':';
    command: PreviewCommand
}

export type ParsedInput = AtParsed | DisplayParsed | TerminalParsed | PreviewParsed
export interface ParseErr  { error: string }
export type ParseResult   = { ok: true; value: ParsedInput } | { ok: false; error: string }

export const isParseOk = (r: ParseResult): r is { ok: true; value: ParsedInput } => r.ok

// ── parse functions ───────────────────────────────────────────────────────────

function parseAt(input: string, registry: Command[]): ParseResult {
    const alias = input.slice(1).trim()
    if (!alias) return {ok: false, error: 'Alias required'}

  const command = registry.find((c): c is AtCommand => c.trigger === '@' && c.alias === alias && c.enabled)
  if (!command) return { ok: false, error: `Unknown command: @${alias}` }

    return {ok: true, value: {trigger: '@', command}}
}

function parseDisplay(input: string, registry: Command[]): ParseResult {
  const alias = input.slice(1).trim()

  if (!alias) return { ok: false, error: 'Alias required' }

  const command = registry.find((c): c is DisplayCommand => c.trigger === '/' && c.alias === alias && c.enabled)
  if (!command) return { ok: false, error: `Unknown command: /${alias}` }

  return { ok: true, value: { trigger: '/', command } }
}

function parseTerminal(input: string, registry: Command[]): ParseResult {
    const alias = input.slice(1).trim()
    if (!alias) return {ok: false, error: 'Alias required'}
    const command = registry.find((c): c is TerminalCommand => c.trigger === '>' && c.alias === alias && c.enabled)
    if (!command) return {ok: false, error: `Unknown command: >${alias}`}
    return {ok: true, value: {trigger: '>', command}}
}

function parsePreview(input: string, registry: Command[]): ParseResult {
    const alias = input.slice(1).trim()
    if (!alias) return {ok: false, error: 'Alias required'}
    const command = registry.find((c): c is PreviewCommand => c.trigger === ':' && c.alias === alias && c.enabled)
    if (!command) return {ok: false, error: `Unknown command: :${alias}`}
    return {ok: true, value: {trigger: ':', command}}
}

// ── main entry ────────────────────────────────────────────────────────────────

export function parseInput(input: string, registry: Command[]): ParseResult {
    const trimmed = input.trim()
    const trigger = trimmed[0]

    if (trigger === '@') return parseAt(trimmed, registry)
    if (trigger === '/') return parseDisplay(trimmed, registry)
    if (trigger === '>') return parseTerminal(trimmed, registry)
    if (trigger === ':') return parsePreview(trimmed, registry)

    return {ok: false, error: 'Unknown trigger'}
}

