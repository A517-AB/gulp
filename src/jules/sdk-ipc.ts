import type {
    Activity,
    ActivityAgentMessaged,
    JulesClient,
    JulesDomain,
    JulesOptions,
    JulesQuery,
    SelectOptions,
    SerializedSnapshot,
    SessionConfig,
    SessionOutcome,
    SessionResource,
    SessionState,
    Source,
    StreamActivitiesOptions,
    SyncOptions as _SyncOptions,
    SyncProgress,
    SyncStats,
} from '@google/jules-sdk/types'
import type {ActivitySummary, DomainSchema, ListSessionsOptions, ParsedFile, ValidationResult} from '@google/jules-sdk'

type Unsubscribe = () => void
type SyncOptions = Omit<_SyncOptions, 'onProgress' | 'signal'>
interface ListOptions { pageSize?: number; pageToken?: string; filter?: string }
type IpcOutcome  = Omit<SessionOutcome, 'generatedFiles' | 'changeSet'>

export interface SdkIpc {
  client: {
    sessions:         (options?: ListSessionsOptions) => Promise<SessionResource[]>
    streamSessions:   (onItem: (item: SessionResource) => void, onDone?: () => void, options?: ListSessionsOptions) => Unsubscribe
    sync:             (options?: SyncOptions) => Promise<SyncStats>
    onSyncProgress:   (cb: (p: SyncProgress) => void) => Unsubscribe
    select:           <T extends JulesDomain>(query: JulesQuery<T>) => Promise<(T extends 'sessions' ? SessionResource : Activity)[]>
    getSessionResource: (id: string) => Promise<SessionResource>
    run:              (config: SessionConfig) => Promise<Pick<Awaited<ReturnType<JulesClient['run']>>, 'id'>>
    with:             (options: JulesOptions) => Promise<void>
  }
  session: {
    send:      (id: string, prompt: string) => Promise<void>
    ask:       (id: string, prompt: string) => Promise<ActivityAgentMessaged>
    approve:   (id: string) => Promise<void>
    info:      (id: string) => Promise<SessionResource>
    result:    (id: string) => Promise<IpcOutcome>
    waitFor:   (id: string, state: SessionState) => Promise<void>
    snapshot:  (id: string, options?: { activities?: boolean }) => Promise<SerializedSnapshot>
    archive:   (id: string) => Promise<void>
    unarchive: (id: string) => Promise<void>
    select:    (id: string, options?: SelectOptions) => Promise<Activity[]>
    hydrate:   (id: string) => Promise<number>
    applyPatch: (id: string, options: { cwd: string }) => Promise<{ success: boolean; branch?: string; error?: string }>
    stream:    (id: string, onItem: (item: Activity) => void, onDone?: () => void, options?: StreamActivitiesOptions) => Unsubscribe
    history:   (id: string, onItem: (item: Activity) => void, onDone?: () => void) => Unsubscribe
    updates:   (id: string, onItem: (item: Activity) => void, onDone?: () => void) => Unsubscribe
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
    list: () => Promise<Source[]>
    get: (filter: { github: string }) => Promise<Source | undefined>
  }
  artifact: {
      save: (data: string, filepath: string) => Promise<string>
      parseUnidiff: (patch?: string | null) => Promise<ParsedFile[]>
  }
    util: {
        toSummary: (activity: Activity) => Promise<ActivitySummary>
    }
    query: {
        validate: (query: unknown) => Promise<ValidationResult>
        format: (result: ValidationResult) => Promise<string>
        schema: (domain: 'sessions' | 'activities') => Promise<DomainSchema>
        schemas: () => Promise<{ sessions: DomainSchema; activities: DomainSchema }>
        typeDef: (domain: 'sessions' | 'activities') => Promise<string>
        markdownDocs: () => Promise<string>
  }
}
