import type { SessionStatus, SessionStatusInfo } from "@/types/activity-feed";

export const STATE_COLOR: Record<SessionStatus, string> = {
  active:    "bg-cyan-500/15 text-cyan-400",
  completed: "bg-emerald-500/15 text-emerald-400",
  failed:    "bg-red-500/15 text-red-400",
  paused:    "bg-zinc-500/15 text-zinc-400",
};

export const STATE_DOT: Record<SessionStatus, string> = {
  active:    "bg-cyan-400 animate-pulse",
  completed: "bg-emerald-500",
  failed:    "bg-red-500",
  paused:    "bg-zinc-500",
};

export function getStatusInfo(status: SessionStatus): SessionStatusInfo {
  const map: Record<SessionStatus, SessionStatusInfo> = {
    active:    { color: "text-cyan-400",    bgColor: "bg-cyan-500/15",    label: "Active",    icon: "●" },
    completed: { color: "text-emerald-400", bgColor: "bg-emerald-500/15", label: "Completed", icon: "✓" },
    failed:    { color: "text-red-400",     bgColor: "bg-red-500/15",     label: "Failed",    icon: "✕" },
    paused:    { color: "text-zinc-400",    bgColor: "bg-zinc-500/15",    label: "Paused",    icon: "⏸" },
  };
  return map[status];
}

export function getSessionDuration(createdAt: string): number {
  if (!createdAt) return 0;
  return Math.floor((Date.now() - new Date(createdAt).getTime()) / 1000 / 60);
}
