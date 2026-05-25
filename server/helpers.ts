import { toSummary } from '@google/jules-sdk';
import type {
  Activity,
  ActivityProgressUpdated,
  Artifact,
  ChangeSetArtifact,
  BashArtifact,
  MediaArtifact,
} from '@google/jules-sdk';
import type {
  EnrichedActivity,
  EnrichedArtifact,
  EnrichedChangeSetArtifact,
  EnrichedBashArtifact,
  ParsedFileSummary,
  ArtifactSummary,
  ChangeSetArtifactSummary,
  BashArtifactSummary,
  MediaArtifactSummary,
} from './types.ts';

// ── async iterable helpers ────────────────────────────────────────────────────

export async function collect<T>(iter: AsyncIterable<T>): Promise<T[]> {
  const out: T[] = [];
  for await (const x of iter) out.push(x);
  return out;
}

export async function collectUpTo<T>(iter: AsyncIterable<T>, limit: number): Promise<T[]> {
  const out: T[] = [];
  for await (const x of iter) {
    out.push(x);
    if (out.length >= limit) break;
  }
  return out;
}

// ── pagination ────────────────────────────────────────────────────────────────

export function boundedLimit(
  value: number | undefined,
  fallback: number,
  max: number,
): number {
  if (value === undefined || !Number.isFinite(value) || value < 1) return fallback;
  return Math.min(Math.floor(value), max);
}

// ── type guards ───────────────────────────────────────────────────────────────

function isProgressUpdated(a: Activity): a is ActivityProgressUpdated {
  return a.type === 'progressUpdated';
}

function isChangeSetArtifact(a: Artifact): a is ChangeSetArtifact {
  return a.type === 'changeSet';
}

function isBashArtifact(a: Artifact): a is BashArtifact {
  return a.type === 'bashOutput';
}

function isMediaArtifact(a: Artifact): a is MediaArtifact {
  return a.type === 'media';
}

// ── artifact enrichment ───────────────────────────────────────────────────────

function enrichArtifact(artifact: Artifact, activity: ActivityProgressUpdated): EnrichedArtifact {
  if (isChangeSetArtifact(artifact)) {
    const parsed = artifact.parsed();
    const enriched: EnrichedChangeSetArtifact = {
      type: 'changeSet',
      gitPatch: artifact.gitPatch,
      _parsed: {
        summary: parsed.summary,
        files: parsed.files.map((f): ParsedFileSummary => ({
          path: f.path,
          changeType: f.changeType,
          additions: f.additions,
          deletions: f.deletions,
        })),
      },
      _summary: toSummary(activity),
    };
    return enriched;
  }

  if (isBashArtifact(artifact)) {
    const enriched: EnrichedBashArtifact = {
      type: 'bashOutput',
      exitCode: artifact.exitCode,
      _text: artifact.toString(),
    };
    return enriched;
  }

  return artifact as MediaArtifact;
}

export function enrichActivity(activity: Activity): EnrichedActivity {
  if (!isProgressUpdated(activity)) return activity;

  return {
    ...activity,
    artifacts: activity.artifacts.map((a) => enrichArtifact(a, activity)),
  };
}

// ── artifact summaries (for REST /artifacts endpoint) ────────────────────────

export function summarizeArtifacts(
  activities: Activity[],
): ArtifactSummary[] {
  const out: ArtifactSummary[] = [];

  for (const activity of activities) {
    if (!isProgressUpdated(activity)) continue;

    for (const artifact of activity.artifacts) {
      if (isChangeSetArtifact(artifact)) {
        const parsed = artifact.parsed();
        const summary: ChangeSetArtifactSummary = {
          activityId: activity.id,
          activityType: activity.type,
          type: 'changeSet',
          summary: parsed.summary,
          files: parsed.files.map((f): ParsedFileSummary => ({
            path: f.path,
            changeType: f.changeType,
            additions: f.additions,
            deletions: f.deletions,
          })),
          unidiffPatch: artifact.gitPatch?.unidiffPatch ?? null,
          suggestedCommitMessage: artifact.gitPatch?.suggestedCommitMessage ?? null,
        };
        out.push(summary);
      } else if (isBashArtifact(artifact)) {
        const summary: BashArtifactSummary = {
          activityId: activity.id,
          activityType: activity.type,
          type: 'bashOutput',
          output: artifact.toString(),
          exitCode: artifact.exitCode ?? null,
        };
        out.push(summary);
      } else if (isMediaArtifact(artifact)) {
        const summary: MediaArtifactSummary = {
          activityId: activity.id,
          activityType: activity.type,
          type: 'media',
          format: artifact.format,
        };
        out.push(summary);
      }
    }
  }

  return out;
}

// ── find media artifact by activity id ───────────────────────────────────────

export function findMediaArtifact(
  activities: Activity[],
  activityId: string,
): MediaArtifact | null {
  for (const activity of activities) {
    if (activity.id !== activityId) continue;
    if (!isProgressUpdated(activity)) continue;
    for (const artifact of activity.artifacts) {
      if (isMediaArtifact(artifact)) return artifact;
    }
  }
  return null;
}
