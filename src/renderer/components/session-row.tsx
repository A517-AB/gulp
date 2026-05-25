import { cn } from '@/utils'
import type { SessionResource } from '@/types/jules-sdk'

type Session = SessionResource

const STATE_COLOR: Record<Session['state'], string> = {
  unspecified:          'bg-surface text-fg-dim',
  queued:               'bg-blue-500/15 text-blue-400',
  planning:             'bg-indigo-500/15 text-indigo-400',
  awaitingPlanApproval: 'bg-yellow-500/15 text-yellow-400',
  awaitingUserFeedback: 'bg-orange-500/15 text-orange-400',
  inProgress:           'bg-cyan-500/15 text-cyan-400',
  paused:               'bg-zinc-500/15 text-fg-muted',
  failed:               'bg-red-500/15 text-red-400',
  completed:            'bg-emerald-500/15 text-emerald-400',
}

const STATE_DOT: Record<Session['state'], string> = {
  unspecified:          'bg-fg-ghost',
  queued:               'bg-blue-400',
  planning:             'bg-indigo-400',
  awaitingPlanApproval: 'bg-yellow-400 animate-pulse',
  awaitingUserFeedback: 'bg-orange-400 animate-pulse',
  inProgress:           'bg-cyan-400 animate-pulse',
  paused:               'bg-zinc-500',
  failed:               'bg-red-500',
  completed:            'bg-emerald-500',
}

interface SessionRowProps {
  session: Session
  selected: boolean
  onClick: () => void
}

export function SessionRow({ session, selected, onClick }: SessionRowProps) {
  const age = formatAge(session.updateTime)

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'w-full flex items-start gap-2.5 px-3 py-2.5 text-left transition-colors',
        selected ? 'bg-selected' : 'hover:bg-hover',
      )}
    >
      <span
        className={cn('mt-1 shrink-0 size-1.5 rounded-full', STATE_DOT[session.state])}
      />
      <div className="min-w-0 flex-1">
        <div className="truncate text-xs font-medium text-fg-primary leading-tight">
          {session.title || session.id}
        </div>
        <div className="flex items-center gap-1.5 mt-0.5">
          <span className={cn('text-[9px] px-1 py-0.5 rounded font-medium uppercase tracking-wide', STATE_COLOR[session.state])}>
            {session.state === 'awaitingPlanApproval' ? 'approval' : session.state}
          </span>
          <span className="text-[10px] text-fg-dim">{age}</span>
        </div>
      </div>
    </button>
  )
}

function formatAge(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const s = Math.floor(diff / 1000)
  if (s < 60) return `${s}s`
  const m = Math.floor(s / 60)
  if (m < 60) return `${m}m`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h`
  return `${Math.floor(h / 24)}d`
}
