import { BellOff } from 'lucide-react'
import { useWatcherStore } from './store'
import { JulesWatcher } from './JulesWatcher'

export function WatcherList() {
  const watched  = useWatcherStore(s => s.watched)
  const unwatch  = useWatcherStore(s => s.unwatch)
  const sessions = Object.values(watched)

  if (!sessions.length) return (
    <p className="text-3xs text-fg-ghost font-mono">No sessions watched</p>
  )

  return (
    <div className="space-y-1.5">
      {sessions.map(s => (
        <div key={s.id}>
          <JulesWatcher id={s.id} title={s.title} />
          <div className="flex items-center justify-between p-3 rounded-md border border-hair bg-raised">
            <div className="min-w-0 mr-3">
              <p className="text-xs text-fg-secondary font-mono truncate">{s.title}</p>
              <p className="text-3xs text-fg-ghost mt-0.5">watching · live</p>
            </div>
            <button
              onClick={() => { unwatch(s.id) }}
              className="shrink-0 text-xs font-mono px-2 py-1 rounded-md border border-hair bg-raised text-fg-dim hover:text-red-400 hover:border-red-900 transition-colors cursor-pointer"
            >
              <BellOff className="size-3" />
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}
