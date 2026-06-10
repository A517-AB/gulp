import {formatDistanceToNow, isValid, parseISO} from "date-fns";
import type {Activity, ActivityGroup, ActivityType} from '@/utils/types'

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

export function activityText(a: Activity): string {
    switch (a.type) {
        case 'agentMessaged':
        case 'userMessaged':
            return a.message
        case 'planGenerated':
            return a.plan.steps.map((s, i) => `${i + 1}. ${s.title}`).join('\n')
        case 'planApproved':
            return 'Plan approved'
        case 'progressUpdated':
            return a.title + (a.description ? `\n${a.description}` : '')
        case 'sessionCompleted':
            return 'Session completed'
        case 'sessionFailed':
            return a.reason || 'Session failed'
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
    return map[type] ?? "bg-gray-500";
}

export function filterActivities(activities: Activity[]): Activity[] {
    return activities;
}

export function groupActivities(filtered: Activity[]): ActivityGroup[] {
  const grouped: ActivityGroup[] = [];
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
        grouped.push(currentGroup);
      }
    } else {
      currentGroup = null;
      grouped.push(activity);
    }
  });

  return grouped;
}

export function getOutputBranch(activities: Activity[], fallback = "main"): string {
  for (const activity of [...activities].reverse()) {
      if (activity.type === "agentMessaged" || activity.type === "sessionCompleted") {
          const text = activityText(activity);
          const match = /(?:created|pushed|on|switched to) branch ['"`]?([\w-./]+)['"`]?/i.exec(text);
      if (match?.[1]) return match[1];
    }
  }
  return fallback;
}
