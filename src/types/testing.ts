import { GitHubBranch } from "./github";
import { jules } from "@google/jules-sdk";


export enum SessionState {
  STATE_UNSPECIFIED = 'STATE_UNSPECIFIED',
  QUEUED = 'QUEUED',
  PLANNING = 'PLANNING',
  AWAITING_PLAN_APPROVAL = 'AWAITING_PLAN_APPROVAL',
  AWAITING_USER_FEEDBACK = 'AWAITING_USER_FEEDBACK',
  IN_PROGRESS = 'IN_PROGRESS',
  PAUSED = 'PAUSED',
  FAILED = 'FAILED',
  COMPLETED = 'COMPLETED',
}

export enum AutomationMode {
  AUTOMATION_MODE_UNSPECIFIED = 'AUTOMATION_MODE_UNSPECIFIED',
  AUTO_CREATE_PR = 'AUTO_CREATE_PR',
}

export interface Session {
  /** Output only. The full resource name (e.g., 'sessions/{session}'). */
  name: string;
  /** Output only. The session ID. */
  id: string;
  /** The task description for Jules to execute. */
  prompt: string;
  /** Optional title. If not provided, the system generates one. */
  title?: string;
  /** Output only. Current state of the session. */
  state: SessionState;
  /** Output only. URL to view the session in the Jules web app. */
  url: string;
  /** The source repository and branch context. */
  sourceContext: SourceContext;
  /** Input only. If true, plans require explicit approval. */
  requirePlanApproval?: boolean;
  /** Input only. Automation mode for the session. */
  automationMode?: AutomationMode;
  /** Output only. Results of the session (e.g., pull requests). */
  outputs: SessionOutput[];
  /** Output only. When the session was created. */
  createTime: string;
  /** Output only. When the session was last updated. */
  updateTime: string;
}

export interface Activity {
  /** The full resource name (e.g., 'sessions/{session}/activities/{activity}'). */
  name: string;
  /** Output only. The activity ID. */
  id: string;
  /** The entity that created this activity ('user', 'agent', or 'system'). */
  originator: 'user' | 'agent' | 'system' | string;
  /** Output only. A description of this activity. */
  description: string;
  /** Output only. When the activity was created. */
  createTime: string;
  /** Output only. Artifacts produced by this activity. */
  artifacts: Artifact[];
  /** A plan was generated. */
  planGenerated?: PlanGenerated;
  /** A plan was approved. */
  planApproved?: PlanApproved;
  /** The user posted a message. */
  userMessaged?: UserMessaged;
  /** Jules posted a message. */
  agentMessaged?: AgentMessaged;
  /** A progress update occurred. */
  progressUpdated?: ProgressUpdated;
  /** The session completed. */
  sessionCompleted?: SessionCompleted;
  /** The session failed. */
  sessionFailed?: SessionFailed;
}

export interface Source {
  /** The full resource name (e.g., 'sources/{source}'). */
  name: string;
  /** Output only. The source ID. */
  id: string;
  /** GitHub repository details. */
  githubRepo?: GitHubRepo;
}

export interface Plan {
  /** Output only. Unique ID for this plan within a session. */
  id: string;
  /** Output only. The steps in the plan. */
  steps: PlanStep[];
  /** Output only. When the plan was created. */
  createTime: string;
}

export interface PlanStep {
  /** Output only. Unique ID for this step within a plan. */
  id: string;
  /** Output only. 0-based index in the plan. */
  index: number;
  /** Output only. The title of the step. */
  title: string;
  /** Output only. Detailed description of the step. */
  description: string;
}

export interface Artifact {
  /** Code changes produced. */
  changeSet?: ChangeSet;
  /** Command output produced. */
  bashOutput?: BashOutput;
  /** Media file produced (e.g., image, video). */
  media?: Media;
}

export interface ChangeSet {
  /** The source this change set applies to. Format: sources/{source} */
  source: string;
  /** The patch in Git format. */
  gitPatch: GitPatch;
}

export interface GitPatch {
  /** The commit ID the patch should be applied to. */
  baseCommitId: string;
  /** The patch in unified diff format. */
  unidiffPatch: string;
  /** A suggested commit message for the patch. */
  suggestedCommitMessage: string;
}

export interface BashOutput {
  /** The bash command that was executed. */
  command: string;
  /** Combined stdout and stderr output. */
  output: string;
  /** The exit code of the command. */
  exitCode: number;
}

export interface Media {
  /** The MIME type of the media (e.g., 'image/png'). */
  mimeType: string;
  /** Base64-encoded media data. */
  data: string;
}

export interface GitHubRepo {
  /** The repository owner (user or organization). */
  owner: string;
  /** The repository name. */
  repo: string;
  /** Whether the repository is private. */
  isPrivate: boolean;
  /** The default branch. */
  defaultBranch: GitHubBranch;
  /** List of active branches. */
  branches: GitHubBranch[];
}

export interface GitHubBranch {
  /** The branch name. */
  displayName: string;
}

export interface GitHubRepoContext {
  /** The branch to start the session from. */
  startingBranch: string;
}

export interface SourceContext {
  /** The source resource name. Format: sources/{source} */
  source: string;
  /** Context for GitHub repositories. */
  githubRepoContext?: GitHubRepoContext;
}

export interface SessionOutput {
  /** A pull request created by the session. */
  pullRequest?: PullRequest;
}

export interface PullRequest {
  /** The URL of the pull request. */
  url: string;
  /** The title of the pull request. */
  title: string;
  /** The description of the pull request. */
  description: string;
}

export interface PlanGenerated {
  /** The generated plan. */
  plan: Plan;
}

export interface PlanApproved {
  /** The ID of the approved plan. */
  planId: string;
}

export interface UserMessaged {
  /** The message content. */
  userMessage: string;
}

export interface AgentMessaged {
  /** Jules posted a message. */
  agentMessage: string;
}

export interface ProgressUpdated {
  /** The title of the update. */
  title: string;
  /** Details about the progress. */
  description: string;
}

export interface SessionCompleted {}

export interface SessionFailed {
  /** The reason for the failure. */
  reason: string;
}

export interface SendMessageRequest {
  /** The message to send. */
  prompt: string;
}

export interface SendMessageResponse {}

export interface ApprovePlanRequest {}

export interface ApprovePlanResponse {}

export interface ListSessionsResponse {
  /** The list of sessions. */
  sessions: Session[];
  /** Token for the next page of results. */
  nextPageToken?: string;
}

export interface ListActivitiesResponse {
  /** The list of activities. */
  activities: Activity[];
  /** Token for the next page of results. */
  nextPageToken?: string;
}

export interface ListSourcesResponse {
  /** The list of sources. */
  sources: Source[];
  /** Token for the next page of results. */
  nextPageToken?: string;
}
