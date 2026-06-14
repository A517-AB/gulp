import {formatDistanceToNow, isValid, parseISO} from "date-fns";
import type {Activity, ParsedFile} from '@google/jules-sdk/types'
import type {ActivityGroup, ActivityType} from '@jules'

export function parseUnidiff(patch?: string | null): ParsedFile[] {
    if (!patch) return []
    const files: ParsedFile[] = []
    const sections = patch.split(/^diff --git /m).filter(Boolean)
    for (const section of sections) {
        const lines = section.split('\n')
        let filePath = ''
        let changeType: ParsedFile['changeType'] = 'modified'
        let additions = 0
        let deletions = 0
        for (const line of lines) {
            if (line.startsWith('+++ b/')) filePath = line.slice(6)
            else if (line.startsWith('+++ /dev/null')) changeType = 'deleted'
            else if (line.startsWith('--- /dev/null')) changeType = 'created'
            else if (line.startsWith('new file')) changeType = 'created'
            else if (line.startsWith('deleted file')) changeType = 'deleted'
            else if (line.startsWith('+') && !line.startsWith('+++')) additions++
            else if (line.startsWith('-') && !line.startsWith('---')) deletions++
        }
        if (filePath) files.push({path: filePath, changeType, additions, deletions})
    }
    return files
}

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
