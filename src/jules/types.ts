// ── Fleet ─────────────────────────────────────────────────────────────────────

export interface FleetTask {
  folder: string
  topic: string
  task: string
  followUps?: { topic: string; task: string }[]
}

export interface FleetTaskGroup {
  group: string
  repo: string
  baseBranch?: string
  tasks: FleetTask[]
}

