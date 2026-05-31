export interface JulesAlias {
  id: string
  command: string
  label?: string
  sessionId: string
  sourceId?: string
  /** Hidden context appended to the message body in send mode. Nullable. */
  instructions?: string
  /** What this session usually returns. Nullable. */
  expects?: 'md' | 'zip'
}
