import type {Activity, Source} from '@google/jules-sdk/types'

// ── HTTP response wrappers (not in SDK) ───────────────────────────────────────

export interface ListActivitiesResponse {
  activities: Activity[]
  nextPageToken?: string
}

export interface ListSourcesResponse {
  sources: Source[]
  nextPageToken?: string
}

// ── HTTP request shapes ───────────────────────────────────────────────────────

export interface CreateSessionRequest {
  sourceId: string
    startingBranch?: string
  prompt: string
  title?: string
  requireApproval?: boolean
  autoCreatePr?: boolean
}

export interface CreateActivityRequest {
  sessionId: string
  content: string
  type?: 'message'
}

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

// ── Session templates ─────────────────────────────────────────────────────────

export interface SessionTemplate {
  id: string
  name: string
  description: string
  prompt: string
  title?: string
  isFavorite?: boolean
  tags?: string[]
  createdAt: string
  updatedAt: string
}
