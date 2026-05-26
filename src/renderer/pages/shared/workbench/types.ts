import type { components } from '@api'
import type {
  Activity,
  ActivityAgentMessaged,
  ActivityUserMessaged,
  ActivityPlanGenerated,
  ActivityPlanApproved,
  ActivityProgressUpdated,
  ActivitySessionCompleted,
  ActivitySessionFailed,
  BashArtifact,
  ChangeSetArtifact,
  MediaArtifact,
  Artifact,
} from '@google/jules-sdk'

// ── API schema types (REST, generated from OpenAPI) ───────────────────────────

export type ApiSession   = components['schemas']['Session']
export type ApiSource    = components['schemas']['Source']
export type SessionState = ApiSession['state']

// ── SDK activity types (re-exported for use across workbench) ─────────────────
// These come directly from @google/jules-sdk — do not hand-write them.

export type {
  Activity,
  ActivityAgentMessaged,
  ActivityUserMessaged,
  ActivityPlanGenerated,
  ActivityPlanApproved,
  ActivityProgressUpdated,
  ActivitySessionCompleted,
  ActivitySessionFailed,
  BashArtifact,
  ChangeSetArtifact,
  MediaArtifact,
  Artifact,
  
}

// ── WS-only activity types (sent by jules-server.ts, not in SDK union) ────────
// The server emits these as activity events when session state transitions occur.

export interface ActivityAwaitingPlanApproval {
  id: string
  type: 'awaitingPlanApproval'
  createTime: string
  originator?: 'user' | 'agent' | 'system'
}

export interface ActivityAwaitingUserFeedback {
  id: string
  type: 'awaitingUserFeedback'
  createTime: string
  originator?: 'user' | 'agent' | 'system'
}

export type AnyActivity =
  | Activity
  | ActivityAwaitingPlanApproval
  | ActivityAwaitingUserFeedback

// ── WS outcome (jules-server.ts serialises SessionOutcome via JSON.stringify) ──
// Methods like .generatedFiles() and .changeSet() are called before sending.

export interface WsOutcome {
  state: 'completed' | 'failed'
  pullRequest?: { url: string; title?: string }
  changeSet?: unknown
  generatedFiles?: { path: string; changeType: string; additions: number; deletions: number }[]
}

// ── WS message union ──────────────────────────────────────────────────────────

export type WsMsg =
  | { type: 'activity'; activity: AnyActivity }
  | { type: 'update';   activity: AnyActivity }
  | { type: 'done';     outcome: WsOutcome }
  | { type: 'error';    error: string }
  | { type: 'started';  id: string }

// ── form ──────────────────────────────────────────────────────────────────────

export interface SessionFormValues {
  prompt:          string
  github:          string
  branch:          string
  requireApproval: boolean
  autoPr:          boolean
}
