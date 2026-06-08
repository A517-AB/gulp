// Jules SDK types — sourced verbatim from jules-sdk typed.ts

// ---- Primitives ----

export type SessionState =
  | 'unspecified'
  | 'queued'
  | 'planning'
  | 'awaitingPlanApproval
export type SessionState =
  | 'unspecified'
  | 'queued'
  | 'planning'
  | 'awaitingPlanApproval
  | 'awaitingUserFeedback'
  | 'inProgress'
  | 'paused'
  | 'failed'
  | 'completed'

export type AutomationMode =
  | 'AUTOMATION_MODE_UNSPECIFIED'
  | 'AUTO_CREATE_PR'

export type Origin = 'user' | 'agent' | 'system'

export type SyncDepth = 'metadata' | 'activities'

export type CacheTier = 'hot' | 'warm' | 'frozen'

export type JulesDomain = 'sessions' | 'activities'

export type ValidationErrorCode =
  | 'INVALID_STRUCTURE'
  | 'MISSING_REQUIRED_FIELD'
  | 'INVALID_DOMAIN'
  | 'INVALID_FIELD_PATH'
  | 'INVALID_OPERATOR'
  | 'INVALID_OPERATOR_VALUE'
  | 'COMPUTED_FIELD_FILTER'
  | 'INVALID_ORDER'
  | 'INVALID_LIMIT'
  | 'INVALID_SELECT_EXPRESSION'

// ---- Activity event interfaces ----

export interface ActivityAgentMessaged {
  type: 'agentMessaged'
  message: string
}

export interface Activity
  type: 'userMessaged'
  message: string
}

export interface ActivityPlanGenerated {
  type: 'planGenerated'
  plan: Plan
}

export interface ActivityPlanApproved {
  type: 'planApproved'
  planId: string
}

export interface ActivityProgressUpdated {
  type: 'progressUpdated'
  title: string
  description: string
}

export interface ActivitySessionCompleted {
  type: 'sessionCompleted'
}

export interface ActivitySessionFailed {
  type: 'sessionFailed'
  reason: string
}

export type Activity =
  | ActivityAgentMessaged
  | ActivityUserMessaged
  | ActivityPlanGenerated
  | ActivityPlanApproved
  | ActivityProgressUpdated
  | ActivitySessionCompleted
  | ActivitySessionFailed

// ---- Plan ----

export interface PlanStep {
  id: string
  title: string
  description?: string
  index: number
}

export interface Plan {
  id: string
  steps: PlanStep[]
  createTime: string
}

// ---- Artifacts ----

export interface GitPatch
  unidiffPatch: string
  baseCommitId: string
  suggestedCommitMessage: string
}

export interface ChangeSet {
  source: string
  gitPatch: GitPatch
}

export interface ParsedFile {
  path: string
  changeType: 'created' | 'modified' | 'deleted'
  additions: number
  deletions: number
}

export interface ParsedChangeSet {
  files: ParsedFile[]
  summary: {
    totalFiles: number
    created: number
    modified: number
    deleted: number
  }
}

export interface ChangeSe
  readonly type: 'changeSet'
  readonly source: string
  readonly gitPatch: GitPatch
  parsed(): ParsedChangeSet
}

export interface BashArtifact {
  readonly type: string
  readonly command: strin
  readonly stdout: string
  readonly stderr: string
  readonly exitCode: number | null
  toString(): string
}

export interface MediaArtifact {
  readonly type: string
  readonly data: string
  readonly format: string
  save(filepath: string): Promise<void>
  toUrl(): string
}

export type Artifact = ChangeSetArtifact | MediaArtifact | BashArtifact

export type LightweightArdiaArtifact> | StrippedMedi
aArtifact

export type StrippedMediaArtifact = Omit<MediaArtifact, 'data'> & { dataStripped:
 true; hasData: true }

export interface LightweightActivity {
  message?: string
  artifacts: LightweightArtifact[] | null
  artifactCount: number
}

// ---- Files ----

export interface GeneratedFile {
  path: string
  changeType: 'created' | 'modified' | 'deleted'
  content: string
  additions: number
  deletions: number
}

export interface Generate
  all(): GeneratedFile[]
  get(path: string): GeneratedFile | undefined
  filter(changeType: 'created' | 'modified' | 'deleted'): GeneratedFile[]
}

// ---- Source ----

export interface GitHubRe
  owner: string
  repo: string
  isPrivate: boolean
  defaultBranch?: string
  branches?: string[]
}

export type Source = { name: string; id: string } & {
  type: 'githubRepo'
  githubRepo: GitHubRepo
}

export interface SourceIn
  github: string
  baseBranch: string
}

export interface SourceManager {
  get(filter: { github: string }): Promise<Source | undefined>
}

// ---- Session ----

export interface SourceContext {
  source: string
  githubRepoContext?: { s
  workingBranch?: string
  environmentVariablesEnabled?: boolean
}

export interface PullRequest {
  url: string
  title: string
  description: string
  baseRef?: string
  headRef?: string
}

export type SessionOutput =
  | { type: 'pullRequest'; pullRequest: PullRequest }
  | { type: 'changeSet'; changeSet: ChangeSet }

export interface SessionInsights {
  completionAttempts: number
  planRegenerations: numb
  userInterventions: number
  failedCommands: unknown
}

export interface SessionOutcome {
  sessionId: string
  title: string
  state: 'completed' | 'failed'
  pullRequest?: PullRequest
  outputs: SessionOutput[
  generatedFiles(): GeneratedFiles
  changeSet(): ChangeSetArtifact | undefined
}

export type Outcome = SessionOutcome

export interface SessionResource {
  name: string
  id: string
  prompt: string
  sourceContext: SourceContext
  source?: Source
  title: string
  requirePlanApproval?: boolean
  automationMode?: AutomationMode
  createTime: string
  updateTime: string
  state: SessionState
  url: string
  outputs: SessionOutput[]
  activities?: Activity[]
  outcome: SessionOutcome
  generatedFiles?: GeneratedFile[]
  archived: boolean
}

export interface TimelineEntry {
  time: string
  type: string
  summary: string
}

export interface SerializedSnapshot {
  id: string
  state: string
  url: string
  createdAt: string
  updatedAt: string
  durationMs: number
  prompt: string
  title: string
  activities: Activity[]
  activityCounts: Record<string, number>
  timeline: TimelineEntry[]
  generatedFiles: GeneratedFile[]
  insights: {
    completionAttempts: number
    planRegenerations: number
    userInterventions: number
    failedCommandCount: number
  }
  pr?: { url: string; titng }
}

export interface ToJSONOptions {
  include?: string[]
  exclude?: string[]
}

export interface SessionSnapshot {
  readonly id: string
  readonly state: Session
  readonly url: string
  readonly createdAt: Date
  readonly updatedAt: Date
  readonly durationMs: nu
  readonly prompt: string
  readonly title: string
  readonly pr?: PullRequest
  readonly activities: unknown
  readonly activityCounts: Readonly<Record<string, number>>
  readonly timeline: unknown
  readonly insights: SessionInsights
  readonly generatedFiles: GeneratedFiles
  readonly changeSet: () => ChangeSetArtifact | undefined
  toJSON(options?: ToJSONOptions): Partial<SerializedSnapshot>
  toMarkdown(): string
}

// ---- Session config ----

export interface SessionConfig {
  prompt: string
  source?: SourceInput
  title?: string
  requireApproval?: boolean
  autoPr?: boolean
}

export interface AutomatedSession {
  id: string
  stream(): AsyncIterable<Activity>
  result(): Promise<SessionOutcome>
}

// ---- Activity summary ----

export interface ActivitySummary {
  id: string
  type: string
  createTime: string
  summary: string
}

// ---- Client options ----

export interface SelectOptions {
  after?: string
  before?: string
  type?: string
  limit?: number
  order?: 'asc' | 'desc'
}

export interface ListOptions {
  pageSize?: number
  pageToken?: string
  filter?: string
}

export interface ListSourcesOptions {
  filter?: string
  pageSize?: number
}

export type ListSessionsOptions = {
  pageSize?: number
  pageToken?: string
  limit?: number
  persist?: boolean
  filter?: string
}

export type ListSessionsResponse = {
  sessions: SessionResource[]
  nextPageToken?: string
}

export type StreamActivitiesOptions = {
  exclude?: { originator: Origin }
  initialRetries?: number
}

// ---- Storage ----

export interface ActivityStorage {
  init(): Promise<void>
  close(): Promise<void>
  append(activity: Activity): Promise<void>
  get(activityId: string): Promise<Activity | undefined>
  latest(): Promise<Activity | undefined>
  scan(): AsyncIterable<A
}

export type SessionIndexEntry = {
  id: string
  title: string
  state: string
  createTime: string
  source: string
  _updatedAt: number
}

export type CachedSession = {
  resource: SessionResource
  _lastSyncedAt: number
}

export interface SessionStorage {
  init(): Promise<void>
  upsert(session: SessionResource): Promise<void>
  upsertMany(sessions: Sed>
  get(sessionId: string): Promise<CachedSession | undefined>
  delete(sessionId: string): Promise<void>
  scanIndex(): AsyncItera
}

export type StorageFactory = {
  activity: (sessionId: string) => ActivityStorage
  session: () => SessionS
}

// ---- Sync ----

export interface SyncProgress {
  phase: 'fetching_list' | 'hydrating_records' | 'hydrating_activities' | 'checkp
oint'
  current: number
  total?: number
  lastIngestedId?: string
  activityCount?: number
}

export interface SyncStat
  sessionsIngested: number
  activitiesIngested: number
  isComplete: boolean
  durationMs: number
}

export type SyncOptions = {
  sessionId?: string
  limit?: number
  depth?: SyncDepth
  incremental?: boolean
  concurrency?: number
  onProgress?: (progress: SyncProgress) => void
  checkpoint?: boolean
  signal?: AbortSignal
}

// ---- Query ----

export interface SelectExpression {
  path: string[]
  exclude: boolean
  wildcard: boolean
}

export interface Validati
  code: ValidationErrorCode
  path: string
  message: string
  suggestion?: string
}

export interface ValidationWarning {
  code: string
  path: string
  message: string
}

export interface ValidationResult {
  valid: boolean
  errors: ValidationError[]
  warnings: ValidationWarning[]
  correctedQuery?: Record
}

export interface JulesQuery<T extends JulesDomain = JulesDomain> {
  from: T
  select?: SelectExpression[]
  where?: Record<string, unknown>
  include?: Record<string, unknown>
  limit?: number
  offset?: number
  order?: 'asc' | 'desc'
  startAt?: string
  startAfter?: string
}

export type QueryResult<T> = T extends 'sessions' ? SessionResource : Activity

// ---- Jules options ---

export interface JulesOptions {
  apiKey?: string
  baseUrl?: string
  storageFactory?: StorageFactory
  platform?: unknown
  config?: {
    pollingIntervalMs?: number
    requestTimeoutMs?: number
    rateLimitRetry?: {
      maxRetryTimeMs?: nu
      baseDelayMs?: number
      maxDelayMs?: number
    }
  }
}

// ---- Activity client ----

export interface ActivityClient {
  history(): AsyncIterable<Activity>
  updates(): AsyncIterable<Activity>
  stream(): AsyncIterable<Activity>
  select(options?: SelectOptions): Promise<Activity[]>
  list(options?: ListOptions): Promise<{ activities: Activity[]; nextPageToken?:
string }>
  get(activityId: string): Promise<Activity>
  hydrate(): Promise<number>
}

// ---- Session client ----

export interface SessionClient {
  readonly id: string
  readonly activities: ActivityClient
  history(): AsyncIterable<Activity>
  updates(): AsyncIterable<Activity>
  select(options?: SelectOptions): Promise<Activity[]>
  stream(options?: StreamActivitiesOptions): AsyncIterable<Activity>
  approve(): Promise<void>
  send(prompt: string): Promise<void>
  ask(prompt: string): Promise<ActivityAgentMessaged>
  result(): Promise<SessionOutcome>
  waitFor(state: SessionState): Promise<void>
  info(): Promise<SessionResource>
  archive(): Promise<void
  unarchive(): Promise<void>
  snapshot(options?: { activities?: boolean }): Promise<SessionSnapshot>
}

// ---- Session cursor ----

export interface SessionCsionResource[]> {
  [Symbol.asyncIterator](): AsyncIterator<SessionResource>
  all(): Promise<SessionResource[]>
}

// ---- Jules client ----

export interface JulesCli
  readonly sources: SourceManager
  readonly storage: SessionStorage
  session(config: SessionConfig): Promise<SessionClient>
  session(sessionId: string): SessionClient
  sessions(options?: ListSessionsOptions): SessionCursor
  run(config: SessionConfig): Promise<AutomatedSession>
  all<T>(
    items: T[],
    mapper: (item: T) => onConfig>,
    options?: { concurrency?: number; stopOnError?: boolean; delayMs?: number },
  ): Promise<AutomatedSession[]>
  select<T extends JulesDomain>(query: JulesQuery<T>): Promise<QueryResult<T>[]>
  sync(options?: SyncOpti
  with(options: JulesOptions): JulesClient
  connect(options: JulesOptions): JulesClient
}

// ---- Singleton ----

export declare const jules: JulesClient