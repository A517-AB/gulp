export interface TestResult {
  status: 'idle' | 'running' | 'ok' | 'fail'
  summary: string
  items?: string[]
}

export interface TestDef {
  key: string
  label: string
  electronOnly?: boolean
  fn: () => Promise<{ summary: string; items?: string[] }>
}
