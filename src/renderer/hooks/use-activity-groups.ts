import { useMemo } from "react";
import type { Activity, ActivityGroup } from "@jules";

const groupActivities = (filtered: Activity[]): ActivityGroup[] => {
    const groups: ActivityGroup[] = [];
    let currentGroup: Activity[] | null = null;

    filtered.forEach((activity, index) => {
        const shouldGroup = activity.type === "progressUpdated";
        const prev = index > 0 ? filtered[index - 1] : null;
        const prevShouldGroup = prev?.type === "progressUpdated";

        if (shouldGroup) {
            if (prevShouldGroup && currentGroup) {
                currentGroup.push(activity);
            } else {
                currentGroup = [activity];
                groups.push(currentGroup);
            }
        } else {
            currentGroup = null;
            groups.push(activity);
        }
    });
    return groups;
};

interface UseActivityGroupsReturn {
    filtered: Activity[];
    grouped: ActivityGroup[];
    latest: Activity | null;
}

export function useActivityGroups(activities: Activity[]): UseActivityGroupsReturn {
    const grouped = useMemo(() => groupActivities(activities), [activities]);
    const latest = activities.at(-1) ?? null;
    return {filtered: activities, grouped, latest};
}
