import { z } from '@hono/zod-openapi';
import type {
  Activity,
  ActivityProgressUpdated,
  Artifact,
  ChangeSetArtifact,
  BashArtifact,
  MediaArtifact,
  ParsedFile,
  ActivitySummary,
  Outcome,
  ChangeSet,
  JulesClient,
} from '@google/jules-sdk';
import type { GeneratedFile } from '@google/jules-sdk/types';

type SyncStats    = Awaited<ReturnType<JulesClient['sync']>>
type SyncProgress = Parameters<NonNullable<NonNullable<Parameters<JulesClient['sync']>[0]>['onProgress']>>[0]

// ── re-exports for convenience ────────────────────────────────────────────────
export type {
  Activity,
  ActivityProgressUpdated,
  Artifact,
  ChangeSetArtifact,
  BashArtifact,
  MediaArtifact,
  ParsedFile,
  ActivitySummary,
  GeneratedFile,
};

// ── zod schemas ───────────────────────────────────────────────────────────────

export const SessionStateSchema = z.enum([
  'unspecified', 'queued', 'planning', 'awaitingPlanApproval',
  'awaitingUserFeedback', 'inProgress', 'paused', 'failed', 'completed',
]);

export type SessionStateValue = z.infer<typeof SessionStateSchema>;

export const SessionConfigSchema = z.object({
  prompt: z.string(),
  title: z.string().optional(),
  source: z.object({
    github: z.string(),
    baseBranch: z.string().optional(),
  }).optional(),
  requireApproval: z.boolean().optional(),
  autoPr: z.boolean().optional(),
}).openapi('SessionConfig');

export const SessionSchema = z.object({
  id: z.string(),
  name: z.string().optional(),
  title: z.string(),
  state: SessionStateSchema,
  prompt: z.string().optional(),
  url: z.string().optional(),
  createTime: z.string(),
  updateTime: z.string(),
  archived: z.boolean().optional(),
}).passthrough().openapi('Session');

export const ActivitySchema = z.object({
  id: z.string(),
  name: z.string().optional(),
  type: z.string(),
  createTime: z.string(),
  originator: z.enum(['user', 'agent', 'system']).optional(),
  artifacts: z.array(z.unknown()).optional(),
}).passthrough().openapi('Activity');

export const SourceSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: z.literal('githubRepo'),
  githubRepo: z.object({
    defaultBranch: z.string().optional(),
    branches: z.array(z.string()).optional(),
  }).passthrough(),
}).openapi('Source');

export const OkSchema = z.object({ ok: z.boolean() }).openapi('Ok');

export const ErrorSchema = z.object({
  error: z.string(),
  message: z.string(),
  status: z.number().optional(),
}).openapi('Error');

export const IdParam = z.object({ id: z.string() });

export const errorResponses = {
  400: { description: 'Bad request',       content: { 'application/json': { schema: ErrorSchema } } },
  401: { description: 'Auth failed',       content: { 'application/json': { schema: ErrorSchema } } },
  404: { description: 'Not found',         content: { 'application/json': { schema: ErrorSchema } } },
  408: { description: 'Timeout',           content: { 'application/json': { schema: ErrorSchema } } },
  409: { description: 'Conflict',          content: { 'application/json': { schema: ErrorSchema } } },
  422: { description: 'Session failed',    content: { 'application/json': { schema: ErrorSchema } } },
  429: { description: 'Too many requests', content: { 'application/json': { schema: ErrorSchema } } },
  500: { description: 'Server error',      content: { 'application/json': { schema: ErrorSchema } } },
  503: { description: 'Network error',     content: { 'application/json': { schema: ErrorSchema } } },
} as const;

// ── enriched artifact shapes ──────────────────────────────────────────────────

export interface ParsedFileSummary {
  path: string;
  changeType: string;
  additions: number;
  deletions: number;
}

export interface EnrichedChangeSetArtifact {
  type: 'changeSet';
  gitPatch: ChangeSetArtifact['gitPatch'];
  _parsed: {
    summary: { totalFiles: number; created: number; modified: number; deleted: number };
    files: ParsedFileSummary[];
  };
  _summary: ActivitySummary;
}

export interface EnrichedBashArtifact {
  type: 'bashOutput';
  exitCode: number | null | undefined;
  _text: string;
}

export type EnrichedArtifact = EnrichedChangeSetArtifact | EnrichedBashArtifact | MediaArtifact;

export interface EnrichedProgressActivity extends Omit<ActivityProgressUpdated, 'artifacts'> {
  artifacts: EnrichedArtifact[];
}

export type EnrichedActivity = Exclude<Activity, ActivityProgressUpdated> | EnrichedProgressActivity;

// ── generated file shape ──────────────────────────────────────────────────────

export interface GeneratedFileSummary {
  path: string;
  changeType: string;
  additions: number;
  deletions: number;
  content: string | null;
}

// ── artifact summary shapes ───────────────────────────────────────────────────

export interface ChangeSetArtifactSummary {
  activityId: string;
  activityType: string;
  type: 'changeSet';
  summary: { totalFiles: number; created: number; modified: number; deleted: number };
  files: ParsedFileSummary[];
  unidiffPatch: string | null;
  suggestedCommitMessage: string | null;
}

export interface BashArtifactSummary {
  activityId: string;
  activityType: string;
  type: 'bashOutput';
  output: string;
  exitCode: number | null;
}

export interface MediaArtifactSummary {
  activityId: string;
  activityType: string;
  type: 'media';
  format: string;
}

export type ArtifactSummary = ChangeSetArtifactSummary | BashArtifactSummary | MediaArtifactSummary;

// ── websocket ─────────────────────────────────────────────────────────────────

export type WsKind = 'session-stream' | 'session-updates' | 'run' | 'sync';

export interface WsData {
  kind: WsKind;
  id: string;
  cancelled: boolean;
  autoApprove: boolean;
}

export interface WsOutcome extends Omit<Outcome, 'generatedFiles' | 'changeSet'> {
  generatedFiles: GeneratedFile[];
  changeSet: ChangeSet | null;
}

export interface WsMessage {
  type: 'activity' | 'update' | 'done' | 'error' | 'progress' | 'started';
  activity?: EnrichedActivity;
  outcome?: WsOutcome;
  stats?: SyncStats;
  progress?: SyncProgress;
  id?: string;
  error?: string;
}
