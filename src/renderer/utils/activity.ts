import { parseISO, isValid, formatDistanceToNow } from "date-fns";
import type { Activity, ActivityGroup, ActivityType } from "@/types/activity-feed";

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
    message: "bg-blue-500",
    plan: "bg-purple-500",
    progress: "bg-yellow-500",
    result: "bg-green-500",
    error: "bg-red-500",
  };
  return map[type] ?? "bg-gray-500";
}

export function filterActivities(activities: Activity[]): Activity[] {
  return activities.filter((activity) => {
    if (activity.bashOutput || activity.diff) return true;
    const content = activity.content?.trim();
    if (!content) return false;
    if (content === "{}" || content === "[]") return false;
    if (/^\[[\w,\s]+\]$/.test(content)) return false;
    try {
      const parsed = JSON.parse(content);
      if (typeof parsed === "object" && Object.keys(parsed).length === 0) return false;
      if (Array.isArray(parsed) && parsed.length === 0) return false;
    } catch {
      // not JSON, keep it
    }
    return true;
  });
}

export function groupActivities(filtered: Activity[]): ActivityGroup[] {
  const grouped: ActivityGroup[] = [];
  let currentGroup: Activity[] | null = null;

  filtered.forEach((activity, index) => {
    const shouldGroup = activity.type === "progress" && activity.role === "agent";
    const prev = index > 0 ? filtered[index - 1] : null;
    const prevShouldGroup = prev?.type === "progress" && prev?.role === "agent";

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
    if (activity.bashOutput) {
      const checkout = activity.bashOutput.match(/git checkout -b\s+([\w-./]+)/);
      if (checkout) return checkout[1];
      const push = activity.bashOutput.match(/git push\s+(?:-u\s+)?(?:origin\s+)?([\w-./]+)/);
      if (push) return push[1];
    }
    if (activity.role === "agent" && (activity.type === "message" || activity.type === "result")) {
      const match = (activity.content || "").match(
        /(?:created|pushed|on|switched to) branch ['"`]?([\w-./]+)['"`]?/i,
      );
      if (match) return match[1];
    }
  }
  return fallback;
}
