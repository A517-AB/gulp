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
    expect(buildPrompt(alias({ instructions: 'Be concise.' }), 'explain this'))
      .toBe('explain this\n\nBe concise.')
  })

  it('appends markdown directive when expects is md', () => {
    expect(buildPrompt(alias({ expects: 'md' }), 'summarize'))
      .toBe('summarize\n\nReport back in markdown.')
  })

  it('appends both instructions and md directive in order', () => {
    expect(buildPrompt(alias({ instructions: 'Be brief.', expects: 'md' }), 'review'))
      .toBe('review\n\nBe brief.\n\nReport back in markdown.')
  })

  it('script mode — empty body still produces prompt from instructions alone', () => {
    expect(buildPrompt(alias({ mode: 'script', instructions: 'Run the suite.' }), ''))
      .toBe('Run the suite.')
  })

  it('script mode — empty body with no instructions returns empty string', () => {
    expect(buildPrompt(alias({ mode: 'script' }), '')).toBe('')
  })

  it('prompt mode — empty body returns empty string (send is blocked upstream)', () => {
    expect(buildPrompt(alias({ mode: 'prompt' }), '')).toBe('')
  })

  it('trims whitespace from body before joining', () => {
    expect(buildPrompt(alias(), '  hello  ')).toBe('hello')
  })

  it('ignores blank/whitespace-only instructions', () => {
    expect(buildPrompt(alias({ instructions: '   ' }), 'go')).toBe('go')
  })
})
