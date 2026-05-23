import { useState, useEffect, useCallback, type ReactNode } from 'react'
import { RefreshCw, Circle, Loader2, AlertCircle, CheckCircle2, Clock, PauseCircle } from 'lucide-react'
import { Button } from '@/ui/button'
import { ScrollArea } from '@/ui/scroll-area'
import { cn } from '@/utils'
import type { SessionResource, SessionState } from '@shared/types'

interface SessionListProps {
  onSelect: (id: string) => void
  selectedId?: string | null
  className?: string
}

function repoLabel(sourceContext: SessionResource['sourceContext']): string {
  // "sources/github/owner/repo" → "owner/repo"
  const parts = sourceContext.source.split('/')
  return parts.length >= 4 ? `${parts[2] ?? ''}/${parts[3] ?? ''}` : sourceContext.source
}

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60_000)
  if (m < 1) return 'just now'
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}

const STATE_META: Record<SessionState, { icon: typeof Circle; color: string; label: string }> = {
  unspecified: { icon: Circle,       color: 'text-fg-ghost',   label: 'unknown' },
  queued:      { icon: Clock,        color: 'text-fg-dim',     label: 'queued' },
  planning:    { icon: Loader2,      color: 'text-blue-400',   label: 'planning' },
  awaitingPlanApproval: { icon: PauseCircle, color: 'text-amber-400', label: 'needs approval' },
  awaitingUserFeedback: { icon: PauseCircle, color: 'text-amber-400', label: 'needs input' },
  inProgress:  { icon: Loader2,      color: 'text-blue-400',   label: 'running' },
  paused:      { icon: PauseCircle,  color: 'text-fg-dim',     label: 'paused' },
  failed:      { icon: AlertCircle,  color: 'text-red-400',    label: 'failed' },
  completed:   { icon: CheckCircle2, color: 'text-green-400',  label: 'done' },
}

const ACTIVE_STATES: SessionState[] = ['queued', 'planning', 'awaitingPlanApproval', 'awaitingUserFeedback', 'inProgress']

export function SessionList({ onSelect, selectedId, className }: SessionListProps): ReactNode {
  const [sessions, setSessions] = useState<SessionResource[]>([])
  const [loading, setLoading] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const sdk = window.electronAPI?.sdk

  const load = useCallback(async () => {
    if (!sdk) return
    setLoading(true)
    setError(null)
    try {
      const list = await sdk.client.sessions()
      setSessions(list.sort((a, b) => new Date(b.updateTime).getTime() - new Date(a.updateTime).getTime()))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load sessions')
    } finally {
      setLoading(false)
    }
  }, [sdk])

  const sync = async () => {
    if (!sdk) return
    setSyncing(true)
    try {
      await sdk.client.sync()
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sync failed')
    } finally {
      setSyncing(false)
    }
  }

  useEffect(() => { void load() }, [load])

  const active = sessions.filter(s => ACTIVE_STATES.includes(s.state))
  const rest = sessions.filter(s => !ACTIVE_STATES.includes(s.state))

  return (
    <div className={cn('flex flex-col h-full', className)}>
      <div className="flex items-center justify-between px-3 h-toolbar border-b border-hair shrink-0">
        <span className="label-mono text-fg-ghost">Sessions</span>
        <div className="flex gap-1">
          <Button size="icon-sm" variant="ghost" onClick={sync} disabled={syncing} title="Sync from Jules">
            <RefreshCw className={cn('size-3.5', syncing && 'animate-spin')} />
          </Button>
          <Button size="icon-sm" variant="ghost" onClick={load} disabled={loading} title="Refresh">
            <RefreshCw className={cn('size-3.5', loading && 'animate-spin')} />
          </Button>
        </div>
      </div>

      {error && (
        <div className="mx-3 mt-2 px-2.5 py-2 rounded-md border border-red-400/20 bg-red-400/5">
          <p className="text-xxs font-mono text-red-400">{error}</p>
        </div>
      )}

      <ScrollArea className="flex-1">
        {loading && sessions.length === 0 ? (
          <div className="flex items-center justify-center h-16">
            <Loader2 className="size-4 animate-spin text-fg-ghost" />
          </div>
        ) : sessions.length === 0 ? (
          <div className="flex items-center justify-center h-16">
            <p className="label-mono text-fg-ghost">No sessions</p>
          </div>
        ) : (
          <div className="py-1">
            {active.length > 0 && (
              <>
                <div className="px-3 py-1.5 label-mono text-fg-ghost">Active</div>
                {active.map(s => <SessionRow key={s.id} session={s} selected={selectedId === s.id} onSelect={onSelect} />)}
                {rest.length > 0 && <div className="border-t border-hair my-1" />}
              </>
            )}
            {rest.map(s => <SessionRow key={s.id} session={s} selected={selectedId === s.id} onSelect={onSelect} />)}
          </div>
        )}
      </ScrollArea>
    </div>
  )
}

function SessionRow({
  session,
  selected,
  onSelect,
}: {
  session: SessionResource
  selected: boolean
  onSelect: (id: string) => void
}) {
  const meta = STATE_META[session.state] ?? STATE_META.unspecified
  const Icon = meta.icon
  const isSpinning = session.state === 'planning' || session.state === 'inProgress'

  return (
    <button
      type="button"
      onClick={() => onSelect(session.id)}
      className={cn(
        'w-full text-left px-3 py-2.5 flex items-start gap-2.5 hover:bg-hover transition-colors border-b border-hair last:border-0',
        selected && 'bg-selected',
      )}
    >
      <Icon className={cn('size-3.5 shrink-0 mt-0.5', meta.color, isSpinning && 'animate-spin')} />
      <div className="flex-1 min-w-0">
        <p className="text-xxs font-mono text-fg-primary truncate leading-snug">
          {session.title || session.prompt}
        </p>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-3xs font-mono text-fg-ghost truncate">
            {repoLabel(session.sourceContext)}
          </span>
          <span className="text-3xs font-mono text-fg-ghost shrink-0">
            {relativeTime(session.updateTime)}
          </span>
        </div>
      </div>
    </button>
  )
}
