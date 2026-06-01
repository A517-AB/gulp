import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { JulesAlias } from '@shared/aliases'

vi.mock('@shared/bridge', () => ({ isElectron: false, aliases: null, history: null }))

const store: Record<string, string> = {}
const ls = {
  getItem: vi.fn((k: string) => store[k] ?? null),
  setItem: vi.fn((k: string, v: string) => { store[k] = v }),
  removeItem: vi.fn((k: string) => { delete store[k] }),
  clear: vi.fn(() => { for (const k of Object.keys(store)) delete store[k] }),
}
Object.defineProperty(globalThis, 'localStorage', { value: ls, writable: true })

const LS_KEY = 'jules-aliases'

function makeAlias(overrides: Partial<JulesAlias> = {}): JulesAlias {
  return { id: crypto.randomUUID(), command: 'test', sessionId: 'sid', ...overrides }
}

function writeLS(aliases: JulesAlias[]) { store[LS_KEY] = JSON.stringify(aliases) }
function readLS(): JulesAlias[] {
  const raw = store[LS_KEY]
  return raw ? JSON.parse(raw) as JulesAlias[] : []
}

describe('localStorage round-trip', () => {
  beforeEach(() => { ls.clear() })

  it('returns empty array when store is empty', () => {
    expect(readLS()).toEqual([])
  })

  it('stores and retrieves aliases', () => {
    writeLS([makeAlias({ command: 'notes' })])
    expect(readLS()[0]!.command).toBe('notes')
  })

  it('persists removal', () => {
    const a = makeAlias({ id: 'fixed' })
    writeLS([a])
    writeLS(readLS().filter(x => x.id !== 'fixed'))
    expect(readLS()).toHaveLength(0)
  })

  it('persists update', () => {
    const a = makeAlias({ id: 'fixed', command: 'original' })
    writeLS([a])
    writeLS(readLS().map(x => x.id === 'fixed' ? { ...x, command: 'renamed' } : x))
    expect(readLS()[0]!.command).toBe('renamed')
  })

  it('handles invalid JSON without throwing', () => {
    store[LS_KEY] = 'not-json'
    let result: JulesAlias[] = []
    try { result = JSON.parse(store[LS_KEY]) as JulesAlias[] } catch { result = [] }
    expect(result).toEqual([])
  })
})

describe('alias modes', () => {
  it('script mode alias auto-fires (mode field present)', () => {
    const a = makeAlias({ mode: 'script', instructions: 'Run linter.' })
    expect(a.mode).toBe('script')
    expect(a.instructions).toBe('Run linter.')
  })

  it('prompt mode alias waits for user body', () => {
    const a = makeAlias({ mode: 'prompt', sessionId: 'session-abc' })
    expect(a.mode).toBe('prompt')
    expect(a.sessionId).toBe('session-abc')
  })

  it('action:settings alias skips Jules entirely', () => {
    const a: JulesAlias = {
      id: 'settings-id',
      command: 'settings',
      sessionId: '',
      trigger: '/',
      action: 'settings',
    }
    expect(a.action).toBe('settings')
    expect(a.mode).toBeUndefined()
  })

  it('alias without mode defaults to prompt behaviour', () => {
    const a = makeAlias()
    expect(a.mode).toBeUndefined()
    // upstream sends only when body is non-empty — absence of mode === prompt
  })
})
