export const TRIGGERS = ['/', '?', '!', '@', '#'] as const
export type AliasTrigger = typeof TRIGGERS[number]

export interface JulesAlias {
  id: string
  trigger?: AliasTrigger
  command: string
  label?: string
  sessionId: string
  instructions?: string
  expects?: 'md' | 'zip'
  /** Built-in panel action — when set, selectAlias opens the panel instead of sending to Jules. */
  action?: 'settings'
}
