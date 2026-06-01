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
  /**
   * Execution mode:
   * - 'script'  — fires immediately on selection, sends alias.instructions to Jules (no user body)
   * - 'prompt'  — waits for user to type body, then sends body + instructions to Jules (default)
   */
  mode?: 'script' | 'prompt'
  /** Built-in panel action — skips Jules entirely and opens a local panel. */
  action?: 'settings'
}
