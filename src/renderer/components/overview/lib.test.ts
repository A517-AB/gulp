import { describe, it, expect } from 'vitest'
import { buildPrompt } from './lib'
import type { JulesAlias } from './types'

function alias(overrides: Partial<JulesAlias> = {}): JulesAlias {
  return { id: 'a', command: 'test', sessionId: 'sid', ...overrides }
}

describe('buildPrompt', () => {
  it('returns body only when alias has no instructions or expects', () => {
    expect(buildPrompt(alias(), 'hello')).toBe('hello')
  })

  it('appends alias instructions after body', () => {
    const result = buildPrompt(alias({ instructions: 'Be concise.' }), 'explain this')
    expect(result).toBe('explain this\n\nBe concise.')
  })

  it('appends markdown directive when expects is md', () => {
    const result = buildPrompt(alias({ expects: 'md' }), 'summarize')
    expect(result).toBe('summarize\n\nReport back in markdown.')
  })

  it('appends both instructions and md directive in order', () => {
    const result = buildPrompt(alias({ instructions: 'Be brief.', expects: 'md' }), 'review')
    expect(result).toBe('review\n\nBe brief.\n\nReport back in markdown.')
  })

  it('handles empty body with instructions', () => {
    const result = buildPrompt(alias({ instructions: 'Run the suite.' }), '')
    expect(result).toBe('Run the suite.')
  })

  it('handles empty body and no instructions', () => {
    expect(buildPrompt(alias(), '')).toBe('')
  })

  it('trims whitespace from body before joining', () => {
    expect(buildPrompt(alias(), '  hello  ')).toBe('hello')
  })

  it('ignores blank/whitespace-only instructions', () => {
    expect(buildPrompt(alias({ instructions: '   ' }), 'go')).toBe('go')
  })
})
