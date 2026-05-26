import type { SessionStatus, SessionStatusInfo } from "@/types/activity-feed";

export function getStatusInfo(status: SessionStatus): SessionStatusInfo {
  const map: Record<SessionStatus, SessionStatusInfo> = {
    active:    { color: "text-green-500",  bgColor: "bg-green-500/10",  label: "Active",    icon: "●" },
    completed: { color: "text-blue-500",   bgColor: "bg-blue-500/10",   label: "Completed", icon: "✓" },
    failed:    { color: "text-red-500",    bgColor: "bg-red-500/10",    label: "Failed",    icon: "✕" },
    paused:    { color: "text-yellow-500", bgColor: "bg-yellow-500/10", label: "Paused",    icon: "⏸" },
  };
  return map[status] ?? { color: "text-gray-500", bgColor: "bg-gray-500/10", label: status, icon: "○" };
}

export function getSessionDuration(createdAt: string): number {
  if (!createdAt) return 0;
  return Math.floor((Date.now() - new Date(createdAt).getTime()) / 1000 / 60);
}
