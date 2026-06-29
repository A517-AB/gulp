import type {SessionState} from '@jules'

type SessionStatus = SessionState

interface SessionStatusInfo {
    color: string
    bgColor: string
    label: string
    icon: string
}

export const STATE_COLOR: Record<SessionStatus, string> = {
    unspecified: "bg-zinc-500/15 text-zinc-400",
    queued: "bg-zinc-500/15 text-zinc-400",
    planning: "bg-blue-500/15 text-blue-400",
    awaitingPlanApproval: "bg-yellow-500/15 text-yellow-400",
    awaitingUserFeedback: "bg-orange-500/15 text-orange-400",
    inProgress: "bg-cyan-500/15 text-cyan-400",
    paused: "bg-zinc-500/15 text-zinc-400",
    completed: "bg-emerald-500/15 text-emerald-400",
    failed: "bg-red-500/15 text-red-400",
}

export const STATE_DOT: Record<SessionStatus, string> = {
    unspecified: "bg-zinc-400",
    queued: "bg-zinc-400",
    planning: "bg-blue-400 animate-pulse",
    awaitingPlanApproval: "bg-yellow-400",
    awaitingUserFeedback: "bg-orange-400",
    inProgress: "bg-cyan-400 animate-pulse",
    paused: "bg-zinc-500",
    completed: "bg-emerald-500",
    failed: "bg-red-500",
}

export const STATE_BADGE: Record<SessionStatus, string> = {
    unspecified: "bg-zinc-500/10 text-zinc-400 border-zinc-500/20",
    queued: "bg-zinc-500/10 text-zinc-400 border-zinc-500/20",
    planning: "bg-blue-500/10 text-blue-400 border-blue-500/20",
    awaitingPlanApproval: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
    awaitingUserFeedback: "bg-orange-500/10 text-orange-400 border-orange-500/20",
    inProgress: "bg-cyan-500/10 text-cyan-400 border-cyan-500/20",
    paused: "bg-zinc-500/10 text-zinc-400 border-zinc-500/20",
    completed: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    failed: "bg-red-500/10 text-red-400 border-red-500/20",
}

export function getStatusInfo(status: SessionStatus): SessionStatusInfo {
    const map: Record<SessionStatus, SessionStatusInfo> = {
    unspecified: {color: "text-zinc-400", bgColor: "bg-zinc-500/15", label: "Unknown", icon: "○"},
    queued: {color: "text-zinc-400", bgColor: "bg-zinc-500/15", label: "Queued", icon: "○"},
    planning: {color: "text-blue-400", bgColor: "bg-blue-500/15", label: "Planning", icon: "◎"},
    awaitingPlanApproval: {color: "text-yellow-400", bgColor: "bg-yellow-500/15", label: "Approval", icon: "?"},
    awaitingUserFeedback: {color: "text-orange-400", bgColor: "bg-orange-500/15", label: "Feedback", icon: "…"},
    inProgress: {color: "text-cyan-400", bgColor: "bg-cyan-500/15", label: "Active", icon: "●"},
    paused: {color: "text-zinc-400", bgColor: "bg-zinc-500/15", label: "Paused", icon: "⏸"},
    completed: {color: "text-emerald-400", bgColor: "bg-emerald-500/15", label: "Completed", icon: "✓"},
    failed: {color: "text-red-400", bgColor: "bg-red-500/15", label: "Failed", icon: "✕"},
}
    return map[status]
}

export function getSessionDuration(createdAt: string): number {
  if (!createdAt) return 0
  return Math.floor((Date.now() - new Date(createdAt).getTime()) / 1000 / 60)
}
