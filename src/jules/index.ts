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

type Unsubscribe = () => void;
interface ListOptions { pageSize?: number; pageToken?: string; filter?: string }

export interface SdkIpc {
  client: {
    sessions:         (options?: ListSessionsOptions) => Promise<SessionResource[]>
    streamSessions:   (onItem: (item: SessionResource) => void, onDone?: () => void, options?: ListSessionsOptions) => Unsubscribe
    sync:             (options?: Omit<SyncOptions, 'onProgress' | 'signal'>) => Promise<SyncStats>
    onSyncProgress:   (cb: (p: SyncProgress) => void) => Unsubscribe
    select:           <T extends JulesDomain>(query: JulesQuery<T>) => Promise<(T extends 'sessions' ? SessionResource : Activity)[]>
    getSessionResource: (id: string) => Promise<SessionResource>
    run:              (config: SessionConfig) => Promise<Pick<Awaited<ReturnType<JulesClient['run']>>, 'id'>>
    with:             (options: JulesOptions) => Promise<void>
    all:              (configs: SessionConfig[], options?: { concurrency?: number; stopOnError?: boolean; delayMs?: number }) => Promise<{ id: string }[]>
  }
  session: {
    create:     (config: SessionConfig) => Promise<{ id: string }>
    send:       (id: string, prompt: string) => Promise<void>
    ask:        (id: string, prompt: string) => Promise<ActivityAgentMessaged>
    approve:    (id: string) => Promise<void>
    info:       (id: string) => Promise<SessionResource>
    result:     (id: string) => Promise<Omit<SessionOutcome, 'generatedFiles' | 'changeSet'>>
    waitFor:    (id: string, state: SessionState) => Promise<void>
    snapshot:   (id: string, options?: { activities?: boolean }) => Promise<SerializedSnapshot>
    archive:    (id: string) => Promise<void>
    unarchive:  (id: string) => Promise<void>
    select:     (id: string, options?: SelectOptions) => Promise<Activity[]>
    hydrate:    (id: string) => Promise<number>
    applyPatch: (id: string, options: { cwd: string }) => Promise<{ success: boolean; branch?: string; error?: string }>
    stream:     (id: string, onItem: (item: Activity) => void, onDone?: () => void, options?: StreamActivitiesOptions) => Unsubscribe
    history:    (id: string, onItem: (item: Activity) => void, onDone?: () => void) => Unsubscribe
    updates:    (id: string, onItem: (item: Activity) => void, onDone?: () => void) => Unsubscribe
  }
  activities: {
    hydrate:  (id: string) => Promise<number>
    select:   (id: string, options?: SelectOptions) => Promise<Activity[]>
    list:     (id: string, options?: ListOptions) => Promise<{ activities: Activity[]; nextPageToken?: string }>
    get:      (id: string, activityId: string) => Promise<Activity>
    history:  (id: string, onItem: (item: Activity) => void, onDone?: () => void) => Unsubscribe
    updates:  (id: string, onItem: (item: Activity) => void, onDone?: () => void) => Unsubscribe
    stream:   (id: string, onItem: (item: Activity) => void, onDone?: () => void) => Unsubscribe
  }
  sources: {
    list:    () => Promise<Source[]>
    get:     (filter: { github: string }) => Promise<Source | undefined>
    resolve: (cwd?: string) => Promise<Source | null>
  }
  artifact: {
    save:         (data: string, filepath: string) => Promise<string>
    parseUnidiff: (patch?: string | null) => Promise<ParsedFile[]>
  }
  util: {
    toSummary:   (activity: Activity) => Promise<ActivitySummary>
    toSummaries: (activities: Activity[]) => Promise<ActivitySummary[]>
  }
  query: {
    validate:     (query: unknown) => Promise<ValidationResult>
    format:       (result: ValidationResult) => Promise<string>
    schema:       (domain: 'sessions' | 'activities') => Promise<DomainSchema>
    schemas:      () => Promise<{ sessions: DomainSchema; activities: DomainSchema }>
    typeDef:      (domain: 'sessions' | 'activities') => Promise<string>
    markdownDocs: () => Promise<string>
  }
}

// ── Activity ──────────────────────────────────────────────────────────────────

export type { ActivityType, ActivityRole, ActivityGroup, StreamHandlers } from './activity'
export { dispatchActivity } from './activity'

// ── Session ───────────────────────────────────────────────────────────────────

export type { SessionStatus, SessionStatusInfo, SessionInitialValues } from './session'

// ── Fleet ─────────────────────────────────────────────────────────────────────

export type { FleetTask, FleetTaskGroup } from './types'

// ── Bridge values ─────────────────────────────────────────────────────────────

export { filesystem, sdkIpc } from "@shared/bridge";
