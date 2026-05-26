import type { ReactNode } from 'react'
import { cn } from '@/utils'
import type { ApiSession, SessionState } from './types'

const DOT: Record<SessionState, string> = {
  unspecified:           'bg-fg-ghost',
  queued:                'bg-fg-dim',
  planning:              'bg-blue-400 animate-pulse',
  awaitingPlanApproval:  'bg-yellow-400',
  awaitingUserFeedback:  'bg-orange-400',
  inProgress:            'bg-emerald-400 animate-pulse',
  paused:                'bg-fg-dim',
  failed:                'bg-destructive',
  completed:             'bg-emerald-500',
}

const LABEL: Record<SessionState, string> = {
  unspecified:           'Unknown',
  queued:                'Queued',
  planning:              'Planning',
  awaitingPlanApproval:  'Needs approval',
  awaitingUserFeedback:  'Waiting',
  inProgress:            'In progress',
  paused:                'Paused',
  failed:                'Failed',
  completed:             'Done',
}

function fmtTime(iso: string): string {
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

interface Props {
  sessions: ApiSession[]
  activeId: string | null
  onSelect: (s: ApiSession) => void
}

export function SessionList({ sessions, activeId, onSelect }: Props): ReactNode {
  if (sessions.length === 0) {
    return (
      <p className="text-2xs text-fg-ghost text-center py-6 px-4">
        No sessions yet.
      </p>
    )
  }

  return (
    <ul className="px-1.5 pb-2 space-y-px">
      {sessions.map(s => {
        const active = activeId === s.id
        return (
          <li key={s.id}>
            <button
              onClick={() => { onSelect(s) }}
              className={cn(
                'group w-full text-left rounded-lg px-2.5 py-2 transition-colors',
                active ? 'bg-selected' : 'hover:bg-hover',
              )}
            >
              <div className="flex items-center gap-2 min-w-0">
                <span className={cn('h-1.5 w-1.5 rounded-full shrink-0 mt-px', DOT[s.state])} />
                <span className={cn(
                  'flex-1 truncate text-xxs font-medium leading-snug',
                  active ? 'text-fg-primary' : 'text-fg-secondary group-hover:text-fg-primary',
                )}>
                  {s.title}
                </span>
              </div>
              <div className="flex items-center justify-between pl-3.5 mt-0.5">
                <span className="text-3xs text-fg-ghost">{LABEL[s.state]}</span>
                <span className="text-3xs font-mono text-fg-ghost">{fmtTime(s.createTime)}</span>
              </div>
            </button>
          </li>
        )
      })}
    </ul>
  )
}
