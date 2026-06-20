// ── SDK types — explicitly re-exported from @google/jules-sdk/types ──────────

import type {
  // Session
  SessionState,
  SessionResource,
  SessionOutcome,
  SessionClient,
  SessionConfig,
  SessionOutput,
  SessionSnapshot,
  SessionInsights,
  SerializedSnapshot,
  SnapshotField,
  ToJSONOptions,
  TimelineEntry,
  AutomatedSession,
  // Activity
  Activity,
  ActivityAgentMessaged,
  ActivityUserMessaged,
  ActivityPlanGenerated,
  ActivityPlanApproved,
  ActivityProgressUpdated,
  ActivitySessionCompleted,
  ActivitySessionFailed,
  ActivitySummary,
  LightweightActivity,
  LightweightArtifact,
  SelectOptions,
  StreamActivitiesOptions,
  // Artifacts
  Artifact,
  ChangeSetArtifact,
  BashArtifact,
  MediaArtifact,
  StrippedMediaArtifact,
  ChangeSet,
  GitPatch,
  ParsedChangeSet,
  ParsedFile,
  GeneratedFile,
  GeneratedFiles,
  // Sources
  Source,
  SourceContext,
  SourceInput,
  SourceManager,
  ListSourcesOptions,
  GitHubRepo,
  // Plan
  Plan,
  PlanStep,
  PullRequest,
  // Client
  JulesClient,
  JulesOptions,
  AutomationMode,
  // Query
  JulesQuery,
  JulesDomain,
  QueryResult,
  // Sync
  SyncDepth,
  SyncOptions,
  SyncProgress,
  SyncStats,
} from '@google/jules-sdk/types'







// ── App-level types ───────────────────────────────────────────────────────────

export type {
  SessionState,
  SessionResource,
  SessionOutcome,
  SessionClient,
  SessionConfig,
  SessionOutput,
  SessionSnapshot,
  SessionInsights,
  SerializedSnapshot,
  SnapshotField,
  ToJSONOptions,
  TimelineEntry,
  AutomatedSession,
  Activity,
  ActivityAgentMessaged,
  ActivityUserMessaged,
  ActivityPlanGenerated,
  ActivityPlanApproved,
  ActivityProgressUpdated,
  ActivitySessionCompleted,
  ActivitySessionFailed,
  ActivitySummary,
  LightweightActivity,
  LightweightArtifact,
  SelectOptions,
  StreamActivitiesOptions,
  Artifact,
  ChangeSetArtifact,
  BashArtifact,
  MediaArtifact,
  StrippedMediaArtifact,
  ChangeSet,
  GitPatch,
  ParsedChangeSet,
  ParsedFile,
  GeneratedFile,
  GeneratedFiles,
  Source,
  SourceContext,
  SourceInput,
  SourceManager,
  ListSourcesOptions,
  GitHubRepo,
  Plan,
  PlanStep,
  PullRequest,
  JulesClient,
  JulesOptions,
  AutomationMode,
  JulesQuery,
  JulesDomain,
  QueryResult,
  SyncDepth,
  SyncOptions,
  SyncProgress,
  SyncStats,
};

// These live in the main entry, not /types
import type {ListSessionsOptions, ListSessionsResponse, DomainSchema, ValidationResult} from '@google/jules-sdk'
export type {ListSessionsOptions, ListSessionsResponse, DomainSchema, ValidationResult}

// ── SdkIpc Interface ──────────────────────────────────────────────────────────

import type { SdkIpc } from './sdk-ipc'
export type { SdkIpc }


// ── Activity ──────────────────────────────────────────────────────────────────

export type { ActivityType, ActivityRole, MessageStream } from './activity'

// ── Session ───────────────────────────────────────────────────────────────────

export type { SessionStatus, SessionStatusInfo, SessionInitialValues } from './session'

// ── Fleet ─────────────────────────────────────────────────────────────────────

export type { FleetTask, FleetTaskGroup } from './types'
