export type {
    SessionResource,
    SessionState,
    Activity,
    ActivityAgentMessaged,
    ActivityUserMessaged,
    ActivityPlanGenerated,
    ActivityPlanApproved,
    ActivityProgressUpdated,
    ActivitySessionCompleted,
    ActivitySessionFailed,
    Source,
    GitHubRepo,
    SessionConfig,
    SourceInput,
    SourceContext,
    SessionOutput,
    PullRequest,
    Artifact,
    ChangeSetArtifact,
    MediaArtifact,
    BashArtifact,
    ParsedFile,
    ParsedChangeSet,
} from '@google/jules-sdk/types'

export type {FleetTask, FleetTaskGroup} from '@jules'

// Session is an alias for SessionResource used throughout the renderer
export type {SessionResource as Session} from '@google/jules-sdk/types'
