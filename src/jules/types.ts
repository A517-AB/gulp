// ── Fleet ─────────────────────────────────────────────────────────────────────

export type TaskAction =
  | { type: 'jules'; prompt: string; folder?: string }
  | { type: 'issue'; body?: string; labels?: string[] }
  | { type: 'pr';    head: string;  body?: string; base?: string }

export interface FleetTask {
  topic: string
  action: TaskAction
  usedCount?: number
  followUps?: { topic: string; action: TaskAction }[]
}

export interface FleetTaskGroup {
  group: string
  repo: string
  baseBranch?: string
  concurrency?: number
  tasks: FleetTask[]
}
