//this is mostly back up, for the juleslocal.ts from electron, i'll move to work with bridges and handles and hten deal with all this. 

export type JulesLocalSessionState =
  | 'unspecified'
  | 'queued'
  | 'planning'
  | 'awaitingPlanApproval'
  | 'awaitingUserFeedback'
  | 'inProgress'
  | 'paused'
  | 'failed'
  | 'completed'

export interface JulesLocalSessionRequest {
  prompt: string;
  title?: string;
  github?: string;
  branch?: string;
  requireApproval?: boolean;
  autoPr?: boolean;
  environmentVariablesEnabled?: boolean;
}

export interface JulesLocalSessionInfo {
  id: string;
  title: string;
  prompt: string;
  state: JulesLocalSessionState;
  url: string;
  source?: string;
  branch?: string;
  archived: boolean;
  outputTypes: ('pullRequest' | 'changeSet')[];
  pullRequestUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export interface JulesLocalGeneratedFile {
  path: string;
  changeType: 'created' | 'modified' | 'deleted';
  content: string;
  additions: number;
  deletions: number;
}

export interface JulesLocalSource {
  name: string;
  id: string;
  type: 'githubRepo';
  fullName: string;
  owner: string;
  repo: string;
  isPrivate: boolean;
  defaultBranch?: string;
  branches: string[];
}

export interface JulesLocalFileFilter {
  extensions?: string[];
  pathIncludes?: string;
}

export interface JulesLocalArtifact {
  type: 'changeSet' | 'bashOutput' | 'media';
  source?: string;
  diff?: string;
  summary?: string;
  files?: JulesLocalGeneratedFile[];
  command?: string;
  output?: string;
  exitCode?: number | null;
  format?: string;
  hasData?: boolean;
}

export interface JulesLocalPlanStep {
  id: string;
  title: string;
  description?: string;
  index: number;
}

export interface JulesLocalPlan {
  id: string;
  createTime: string;
  steps: JulesLocalPlanStep[];
}

export interface JulesLocalActivity {
  id: string;
  type: string;
  createTime: string;
  originator?: string;
  message?: string;
  title?: string;
  description?: string;
  reason?: string;
  plan?: JulesLocalPlan;
  artifacts: JulesLocalArtifact[];
}

export interface JulesLocalStreamActivityEvent {
  sessionId: string;
  activity: JulesLocalActivity;
}

export interface JulesLocalStreamStateEvent {
  sessionId: string;
  state: 'started' | 'completed' | 'failed' | 'stopped';
  info?: JulesLocalSessionInfo;
  error?: string;
}

export interface JulesLocalSessionOutcome {
  sessionId: string;
  title: string;
  state: 'completed' | 'failed';
  outputTypes: ('pullRequest' | 'changeSet')[];
  generatedFiles: JulesLocalGeneratedFile[];
  pullRequestUrl?: string;
  pullRequestTitle?: string;
  changeSet?: JulesLocalArtifact;
}

export interface JulesLocalSnapshotTimelineEntry {
  time: string;
  type: string;
  summary: string;
}

export interface JulesLocalSnapshotInsights {
  completionAttempts: number;
  planRegenerations: number;
  userInterventions: number;
  failedCommandCount: number;
}

export interface JulesLocalSessionSnapshot {
  id: string;
  state: JulesLocalSessionState;
  url: string;
  createdAt: string;
  updatedAt: string;
  durationMs: number;
  prompt: string;
  title: string;
  activities: JulesLocalActivity[];
  activityCounts: Record<string, number>;
  timeline: JulesLocalSnapshotTimelineEntry[];
  insights: JulesLocalSnapshotInsights;
  generatedFiles: JulesLocalGeneratedFile[];
  markdown: string;
  pullRequestUrl?: string;
  pullRequestTitle?: string;
  changeSet?: JulesLocalArtifact;
}

export interface JulesLocalFleetIssueFixRequest {
  repositories: string[];
  issue: string;
  branch?: string;
  titlePrefix?: string;
  autoPr?: boolean;
  requireApproval?: boolean;
  concurrency?: number;
  stopOnError?: boolean;
  delayMs?: number;
}

export interface JulesLocalFleetIssueFixResult {
  repository: string;
  session: JulesLocalSessionInfo;
}

export interface JulesLocalAPI {
  setApiKey: (apiKey: string | null) => Promise<boolean>;
  createSession: (request: JulesLocalSessionRequest) => Promise<JulesLocalSessionInfo>;
  startRun: (request: JulesLocalSessionRequest) => Promise<JulesLocalSessionInfo>;
  resumeSession: (sessionId: string) => Promise<JulesLocalSessionInfo>;
  getSession: (sessionId: string) => Promise<JulesLocalSessionInfo>;
  hydrateSession: (sessionId: string) => Promise<number>;
  getHistory: (sessionId: string) => Promise<JulesLocalActivity[]>;
  listSources: () => Promise<JulesLocalSource[]>;
  getSource: (github: string) => Promise<JulesLocalSource | null>;
  getResult: (sessionId: string) => Promise<JulesLocalSessionOutcome>;
  getSnapshot: (sessionId: string) => Promise<JulesLocalSessionSnapshot>;
  dispatchFleetIssueFix: (
    request: JulesLocalFleetIssueFixRequest,
  ) => Promise<JulesLocalFleetIssueFixResult[]>;
  approve: (sessionId: string) => Promise<void>;
  sendMessage: (sessionId: string, prompt: string) => Promise<void>;
  ask: (sessionId: string, prompt: string) => Promise<JulesLocalActivity>;
  getGeneratedFiles: (
    sessionId: string,
    filter?: JulesLocalFileFilter,
  ) => Promise<JulesLocalGeneratedFile[]>;
  getMarkdownFiles: (sessionId: string) => Promise<JulesLocalGeneratedFile[]>;
  startStream: (sessionId: string) => Promise<void>;
  stopStream: (sessionId: string) => Promise<void>;
  onActivity: (cb: (payload: JulesLocalStreamActivityEvent) => void) => () => void;
  onStreamState: (cb: (payload: JulesLocalStreamStateEvent) => void) => () => void;
  applyPatch: (
    sessionId: string,
    opts: { branch?: string; dryRun?: boolean; cwd: string }
  ) => Promise<
    | { success: true; branch: string; commitMessage: string; dryRun?: boolean }
    | { success: false; error: string }
  >;
  listSessions: (options?: { limit?: number; filter?: string }) => Promise<JulesLocalSessionInfo[]>;
}
