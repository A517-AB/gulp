import type {SessionState} from '@jules'

export interface StateMeta {
    /** Short human label for the state. */
    label: string
    /** Tailwind classes for the status dot. */
    dot: string
    /** Tailwind border class for the active-row accent. */
    accent: string
}

export const STATE_META: Record<SessionState, StateMeta> = {
    unspecified: {label: 'Unknown', dot: 'bg-zinc-400', accent: 'border-zinc-400'},
    queued: {label: 'Queued', dot: 'bg-zinc-400', accent: 'border-zinc-400'},
    planning: {label: 'Planning', dot: 'bg-blue-400 animate-pulse', accent: 'border-blue-400'},
    awaitingPlanApproval: {label: 'Approval', dot: 'bg-yellow-400', accent: 'border-yellow-400'},
    awaitingUserFeedback: {label: 'Feedback', dot: 'bg-orange-400', accent: 'border-orange-400'},
    inProgress: {label: 'Active', dot: 'bg-cyan-400 animate-pulse', accent: 'border-cyan-400'},
    paused: {label: 'Paused', dot: 'bg-zinc-500', accent: 'border-zinc-500'},
    completed: {label: 'Done', dot: 'bg-emerald-500', accent: 'border-emerald-500'},
    failed: {label: 'Failed', dot: 'bg-red-500', accent: 'border-red-500'},
}

/** "sources/github/owner/repo" -> "owner/repo". Returns '' for repoless/empty. */
export function repoFromSource(source: string): string {
    if (source === '' || source === 'unknown') return ''
    const match = /^sources\/github\/(.+)$/.exec(source)
    return match?.[1] ?? source
}

/** Compact relative age, e.g. "5m", "3h", "2d", "4w". */
export function relativeTime(iso: string): string {
    const then = new Date(iso).getTime()
    if (Number.isNaN(then)) return ''
    const seconds = Math.max(0, Math.round((Date.now() - then) / 1000))
    if (seconds < 60) return `${seconds}s`
    const minutes = Math.round(seconds / 60)
    if (minutes < 60) return `${minutes}m`
    const hours = Math.round(minutes / 60)
    if (hours < 24) return `${hours}h`
    const days = Math.round(hours / 24)
    if (days < 7) return `${days}d`
    const weeks = Math.round(days / 7)
    if (weeks < 5) return `${weeks}w`
    const months = Math.round(days / 30)
    if (months < 12) return `${months}mo`
    return `${Math.round(days / 365)}y`
}
