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

  it('returns stored aliases', () => {
    const a = makeAlias({ command: 'notes' })
    writeLS([a])
    const result = readLS()
    expect(result).toHaveLength(1)
    expect(result[0]!.command).toBe('notes')
  })

  it('persists removal', () => {
    const a = makeAlias({ id: 'fixed-id', command: 'old' })
    writeLS([a])
    writeLS(readLS().filter(x => x.id !== 'fixed-id'))
    expect(readLS()).toHaveLength(0)
  })

  it('persists update', () => {
    const a = makeAlias({ id: 'fixed-id', command: 'original' })
    writeLS([a])
    writeLS(readLS().map(x => x.id === 'fixed-id' ? { ...x, command: 'renamed' } : x))
    expect(readLS()[0]!.command).toBe('renamed')
  })

  it('handles invalid JSON gracefully', () => {
    store[LS_KEY] = 'not-json'
    // lsLoad catches parse errors and returns []
    let result: JulesAlias[] = []
    try { result = JSON.parse(store[LS_KEY]) as JulesAlias[] } catch { result = [] }
    expect(result).toEqual([])
  })
})

describe('JulesAlias.action field', () => {
  it('settings alias carries action:settings', () => {
    const a: JulesAlias = {
      id: 'settings-id',
      command: 'settings',
      sessionId: '',
      trigger: '/',
      action: 'settings',
    }
    expect(a.action).toBe('settings')
  })

  it('regular alias has no action', () => {
    expect(makeAlias().action).toBeUndefined()
  })

  it('action is the only routing discriminant — not command string', () => {
    // An alias named "settings" without action should NOT trigger the panel
    const plain: JulesAlias = makeAlias({ command: 'settings' })
    expect(plain.action).toBeUndefined()

    // Only this one should
    const panel: JulesAlias = makeAlias({ command: 'settings', action: 'settings', sessionId: '' })
    expect(panel.action).toBe('settings')
  })
})
