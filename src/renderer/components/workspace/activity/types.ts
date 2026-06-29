import type {Activity, BashArtifact, MediaArtifact, SessionResource} from '@jules';

export type ActivityType = Activity['type'];

export interface ActivityFeedProps {
    session: SessionResource;
    onArchive?: () => void;
    onNewSession?: () => void;
    showCodeDiffs: boolean;
    onToggleCodeDiffs: (show: boolean) => void;
}

export interface SingleActivityProps {
    activity: Activity;
    onApprovePlan: () => void;
    approvingPlan: boolean;
    planApproved: boolean;
    isNew?: boolean;
}

export interface ActivityItemProps {
    item: Activity | Activity[];
    onApprovePlan: () => void;
    approvingPlan: boolean;
    planApproved: boolean;
    isNew?: boolean;
}

export interface TerminalConsoleProps {
    bashOutputs: BashArtifact[];
}

export interface ActivityArtifactsProps {
    activity: Activity;
    only?: 'changeset' | 'media';
}

export interface MediaItemGroupedProps {
    media: MediaArtifact;
    activityId: string;
    index: number;
}
