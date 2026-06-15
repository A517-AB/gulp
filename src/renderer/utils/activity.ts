import {formatDistanceToNow, isValid, parseISO} from "date-fns";
import type {Activity} from '@google/jules-sdk/types'
import type {ActivityGroup, ActivityType} from '@jules'
import { parseUnidiff } from '@jules'

export { parseUnidiff }


export function formatDate(dateString: string): string {
  if (!dateString) return "Unknown date";
  try {
    const date = parseISO(dateString);
    if (!isValid(date)) return "Unknown date";
    return formatDistanceToNow(date, { addSuffix: true });
  } catch {
    return "Unknown date";
  }
}

export function getActivityTypeColor(type: ActivityType): string {
  const map: Record<ActivityType, string> = {
      agentMessaged: "bg-blue-500",
      userMessaged: "bg-purple-500",
      planGenerated: "bg-indigo-500",
      planApproved: "bg-indigo-400",
      progressUpdated: "bg-yellow-500",
      sessionCompleted: "bg-green-500",
      sessionFailed: "bg-red-500",
  };
    return map[type];
}

export function groupActivities(activities: Activity[]): ActivityGroup[] {
  const grouped: ActivityGroup[] = [];
  let currentGroup: Activity[] | null = null;

    activities.forEach((activity, index) => {
        const shouldGroup = activity.type === "progressUpdated";
        const prev = index > 0 ? activities[index - 1] : null;
        const prevShouldGroup = prev?.type === "progressUpdated";

    if (shouldGroup) {
      if (prevShouldGroup && currentGroup) {
        currentGroup.push(activity);
      } else {
        currentGroup = [activity];
        grouped.push(currentGroup);
      }
    } else {
      currentGroup = null;
      grouped.push(activity);
    }
  });

  return grouped;
}
