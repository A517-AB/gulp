import { useMemo } from "react";
import {groupActivities} from "@/utils/activity";
import type { Activity } from "@google/jules-sdk/types";
import type { ActivityGroup } from "@jules";

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
