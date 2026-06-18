import type { Activity, SessionResource, BashArtifact, ChangeSetArtifact, MediaArtifact, ActivityGroup, ActivityRole, ActivityType } from "@jules";

export interface ActivityFeedProps {
    session: SessionResource;
    onArchive?: () => void;
    onNewSession?: () => void;
    showCodeDiffs: boolean;
    onToggleCodeDiffs: (show: boolean) => void;
}

export interface ActivityItemProps {
    item: ActivityGroup;
    onApprovePlan: () => void;
    approvingPlan: boolean;
    planApproved: boolean;
}

export interface SingleActivityProps {
    activity: Activity;
    onApprovePlan: () => void;
    approvingPlan: boolean;
    planApproved: boolean;
}

export interface TerminalConsoleProps {
    bashOutputs: BashArtifact[];
}

export interface ActivityArtifactsProps {
    activity: Activity;
    only?: "changeset" | "media";
}

export interface MediaItemGroupedProps {
    media: MediaArtifact;
    activityId: string;
    index: number;
}

export type { Activity, SessionResource, BashArtifact, ChangeSetArtifact, MediaArtifact, ActivityGroup, ActivityRole, ActivityType };
