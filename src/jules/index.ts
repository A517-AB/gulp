// ── SDK types — explicitly re-exported from @google/jules-sdk/types ──────────

export type {
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

// These live in the main entry, not /types
export type {ListSessionsOptions, ListSessionsResponse, DomainSchema, ValidationResult} from '@google/jules-sdk'

// ── IPC bridge type ───────────────────────────────────────────────────────────

export type { SdkIpc } from './sdk-ipc'

// ── Stream helpers ────────────────────────────────────────────────────────────

export type {StreamHandlers} from './stream'
export {dispatchActivity} from './stream'

// ── App-level types ───────────────────────────────────────────────────────────

export type {
  FleetTask,
  FleetTaskGroup,
} from './types'
