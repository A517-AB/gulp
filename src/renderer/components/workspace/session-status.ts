import type { SessionStatus, SessionStatusInfo } from '@/types/activity-feed.ts'

export const STATE_COLOR: Record<SessionStatus, string> = {
  queued:           "bg-zinc-500/15 text-zinc-400",
  planning:         "bg-blue-500/15 text-blue-400",
  awaitingApproval: "bg-yellow-500/15 text-yellow-400",
  awaitingFeedback: "bg-orange-500/15 text-orange-400",
  active:           "bg-cyan-500/15 text-cyan-400",
  paused:           "bg-zinc-500/15 text-zinc-400",
  completed:        "bg-emerald-500/15 text-emerald-400",
  failed:           "bg-red-500/15 text-red-400",
}

export const STATE_DOT: Record<SessionStatus, string> = {
  queued:           "bg-zinc-400",
  planning:         "bg-blue-400 animate-pulse",
  awaitingApproval: "bg-yellow-400",
  awaitingFeedback: "bg-orange-400",
  active:           "bg-cyan-400 animate-pulse",
  paused:           "bg-zinc-500",
  completed:        "bg-emerald-500",
  failed:           "bg-red-500",
}

export function getStatusInfo(status: SessionStatus): SessionStatusInfo {
  const map: Record<SessionStatus, SessionStatusInfo> = {
    queued:           { color: "text-zinc-400",    bgColor: "bg-zinc-500/15",    label: "Queued",    icon: "○" },
    planning:         { color: "text-blue-400",    bgColor: "bg-blue-500/15",    label: "Planning",  icon: "◎" },
    awaitingApproval: { color: "text-yellow-400",  bgColor: "bg-yellow-500/15",  label: "Approval",  icon: "?" },
    awaitingFeedback: { color: "text-orange-400",  bgColor: "bg-orange-500/15",  label: "Feedback",  icon: "…" },
    active:           { color: "text-cyan-400",    bgColor: "bg-cyan-500/15",    label: "Active",    icon: "●" },
    paused:           { color: "text-zinc-400",    bgColor: "bg-zinc-500/15",    label: "Paused",    icon: "⏸" },
    completed:        { color: "text-emerald-400", bgColor: "bg-emerald-500/15", label: "Completed", icon: "✓" },
    failed:           { color: "text-red-400",     bgColor: "bg-red-500/15",     label: "Failed",    icon: "✕" },
  }
  return map[status]
}

export function getSessionDuration(createdAt: string): number {
  if (!createdAt) return 0
  return Math.floor((Date.now() - new Date(createdAt).getTime()) / 1000 / 60)
}
