import { Activity, PullRequest, SessionInsights, SessionResource, SessionSnapshot, SessionState, SerializedSnapshot, TimelineEntry } from './types.js';
export declare class SessionSnapshotImpl implements SessionSnapshot {
    readonly id: string;
    readonly state: SessionState;
    readonly url: string;
    readonly createdAt: Date;
    readonly updatedAt: Date;
    readonly durationMs: number;
    readonly prompt: string;
    readonly title: string;
    readonly pr?: PullRequest;
    readonly activities: readonly Activity[];
    readonly activityCounts: Readonly<Record<string, number>>;
    readonly timeline: readonly TimelineEntry[];
    readonly insights: SessionInsights;
    constructor(session: SessionResource, activities: Activity[]);
    private computeActivityCounts;
    private computeTimeline;
    private generateSummary;
    private computeInsights;
    toJSON(): SerializedSnapshot;
    toMarkdown(): string;
}
