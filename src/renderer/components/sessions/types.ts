import type {GitHubRepo, SessionOutput, SessionState} from '@jules'

// The SDK types this feature renders against. Consumers import them from the
// sessions folder rather than reaching into @jules directly.
export type {SessionState} from '@jules'

/**
 * `SessionResource` as the local cache actually returns it. The SDK d.ts marks
 * `sourceContext`, `title`, and `state` as always-present, but synced/cached
 * records (and repoless sessions) can omit them — the SDK's own storage layer
 * guards `sourceContext` with `?.` for the same reason. We extend the SDK type
 * to tell the truth instead of trusting the optimistic declaration.
 */


export interface SessionResource {
    name: string
    id: string
    prompt: string
    sourceContext: SourceContext
    source: Source
    title: string
    createTime: string
    updateTime: string
    state: SessionState
    url: string
    outputs: SessionOutput[]
    activities?: Activity[]
    outcome?: {
        status: "SUCCESS" | "FAILURE"
        summary: string
    }
}

export type CachedSession = Omit<SessionResource, 'sourceContext' | 'title' | 'state'> & {
    sourceContext?: SessionResource['sourceContext']
    title?: SessionResource['title']
    state?: SessionResource['state']


}

export interface SourceContext {
    source: string
    githubRepoContext?: {
        startingBranch: string
    }
}

export type Source = {
    name: string;
    id: string;
    environmentVariablesEnabled?: boolean;
} & {
    type: "githubRepo";
    githubRepo: GitHubRepo;
}

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

export interface GitPatch {
    unidiffPatch: string
    baseCommitId: string
    suggestedCommitMessage?: string
}

export interface BashArtifact {
    readonly type: 'bashOutput'
    readonly command: string
    readonly stdout: string
    readonly stderr: string
    readonly exitCode: number | null
}

export interface ChangeSetArtifact {
    readonly type: 'changeSet'
    readonly source: string
    readonly gitPatch: GitPatch
}

export interface MediaArtifact {
    readonly type: 'media'
    readonly data: string
    readonly format: string
}

export type Artifact = BashArtifact | ChangeSetArtifact | MediaArtifact

export interface ActivityBase {
    name: string
    id: string
    createTime: string
    originator: 'user' | 'agent' | 'system'
    artifacts: Artifact[]
}

export type Activity =
    | (ActivityBase & { type: 'userMessaged'; message: string })
    | (ActivityBase & { type: 'agentMessaged'; message: string })
    | (ActivityBase & { type: 'planGenerated'; plan: Plan })
    | (ActivityBase & { type: 'planApproved'; planId: string })
    | (ActivityBase & { type: 'progressUpdated'; title: string; description: string })
    | (ActivityBase & { type: 'sessionCompleted' })
    | (ActivityBase & { type: 'sessionFailed'; reason: string })
