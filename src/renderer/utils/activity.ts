import {formatDistanceToNow, isValid, parseISO} from "date-fns";
import type {Activity} from '@google/jules-sdk/types'
import type {ActivityGroup, ActivityType, ParsedFile} from '@jules'

export function parseUnidiff(patch?: string | null): ParsedFile[] {
  if (!patch) return [];
  const files: ParsedFile[] = [];
  const diffSections = patch.split(/^diff --git /m).filter(Boolean);

  for (const section of diffSections) {
    const lines = section.split('\n');

    let path: string;
    let fromPath = '';
    let toPath = '';

    for (const line of lines) {
      if (line.startsWith('--- ')) {
        fromPath = line
          .slice(4)
          .replace(/^a\//, '')
          .replace(/^\/dev\/null$/, '');
      } else if (line.startsWith('+++ ')) {
        toPath = line
          .slice(4)
          .replace(/^b\//, '')
          .replace(/^\/dev\/null$/, '');
      }
    }

    let changeType: 'created' | 'modified' | 'deleted';
    if (fromPath === '' || lines.some((l) => l.startsWith('--- /dev/null'))) {
      changeType = 'created';
      path = toPath;
    } else if (
      toPath === '' ||
      lines.some((l) => l.startsWith('+++ /dev/null'))
    ) {
      changeType = 'deleted';
      path = fromPath;
    } else {
      changeType = 'modified';
      path = toPath;
    }

    if (!path) continue;

    let additions = 0;
    let deletions = 0;
    let inHunk = false;

    for (const line of lines) {
      if (line.startsWith('@@')) {
        inHunk = true;
        continue;
      }
      if (inHunk) {
        if (line.startsWith('+') && !line.startsWith('+++')) {
          additions++;
        } else if (line.startsWith('-') && !line.startsWith('---')) {
          deletions++;
        }
      }
    }

    files.push({ path, changeType, additions, deletions });
  }

  return files;
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
