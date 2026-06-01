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
}
