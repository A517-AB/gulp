import type { Activity, ActivityGroup } from "./activity-feed";

export interface UseActivityGroupsReturn {
  filtered: Activity[];
  grouped: ActivityGroup[];
  latest: Activity | null;
}

export interface UseResizableProps {
  defaultWidth?: number;
  min?: number;
  max?: number;
}

export interface UseResizableReturn {
  width: number;
  isResizing: boolean;
  startResizing: () => void;
}
