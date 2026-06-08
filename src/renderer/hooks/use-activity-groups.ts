import { useMemo } from "react";
import { filterActivities, groupActivities } from "@/utils/activity";
import type { Activity } from "@/types/activity-feed";
import type { UseActivityGroupsReturn } from "@/types/ui-hooks";

export function useActivityGroups(activities: Activity[]): UseActivityGroupsReturn {
  const filtered = useMemo(() => filterActivities(activities), [activities]);

  const grouped = useMemo(() => groupActivities(filtered), [filtered]);

  const latest = filtered.at(-1) ?? null;

  return { filtered, grouped, latest };
}
