// ── Fleet ─────────────────────────────────────────────────────────────────────

export interface FleetTask {
  folder: string
  topic: string
  task: string
  sent?: boolean
  followUps?: { topic: string; task: string }[]
}

export interface FleetTaskGroup {
  group: string
  repo: string
  baseBranch?: string
  concurrency?: number
  tasks: FleetTask[]
}

