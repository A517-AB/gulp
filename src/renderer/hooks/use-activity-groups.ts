import { useMemo } from "react";
import {groupActivities} from "@/utils/activity";
import type { Activity } from "@/types/activity-feed";
import type { UseActivityGroupsReturn } from "@/types/ui-hooks";

export function useActivityGroups(activities: Activity[]): UseActivityGroupsReturn {
    const grouped = useMemo(() => groupActivities(activities), [activities]);
    const latest = activities.at(-1) ?? null;
    return {filtered: activities, grouped, latest};
}
