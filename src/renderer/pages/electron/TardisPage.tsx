import { useEffect, useRef, useState } from 'react'
import { scheduler } from '@shared/bridge'
import type { ScheduledItem } from '@shared/electron'
import { ScheduleForm } from '@/components/shared/ScheduleForm'
import { WatcherList } from '@/library/jules-watcher'

// ── hardcoded temp item — remove when real presets exist ──────────────────────
const TEMP_ITEM: ScheduledItem = {
  id:        'tardis-temp-pomodoro',
  label:     'TEMP: Pomodoro tick — remove later',
  schedule:  { kind: 'interval', everyMinutes: 1 },
  enabled:   true,
  sound:     'chime',
  category:  'temp',
  createdAt: new Date().toISOString(),
}

const WORK_ITEM: ScheduledItem = {
  id:        'tardis-work-15m',
  label:     'Work interval — every 15min, 9–5 Mon–Fri',
  schedule:  { kind: 'windowed', everyMinutes: 15, fromHour: 9, toHour: 17, days: [1, 2, 3, 4, 5] },
  enabled:   false,
  sound:     'chime',
  category:  'work',
  createdAt: new Date().toISOString(),
}

export default function TardisPage() {
  const [items, setItems] = useState<ScheduledItem[]>([])
  const loaded = useRef(false)

  useEffect(() => {
    const s = scheduler
    if (!s || loaded.current) return
    loaded.current = true

    s.list().then(async (existing) => {
      setItems(existing)

      const ids = new Set(existing.map(i => i.id))

      if (!ids.has(TEMP_ITEM.id)) {
        const saved = await s.add(TEMP_ITEM)
        setItems(p => [...p, saved])
      }
      if (!ids.has(WORK_ITEM.id)) {
        const saved = await s.add(WORK_ITEM)
        setItems(p => [...p, saved])
      }
    }).catch(() => {})
  }, [])

  async function add(item: ScheduledItem) {
    if (!scheduler) return
    const saved = await scheduler.add(item)
    setItems(p => [...p, saved])
  }

  async function toggle(id: string, enabled: boolean) {
    if (!scheduler) return
    const updated = await scheduler.toggle(id, enabled)
    setItems(p => p.map(i => i.id === updated.id ? updated : i))
  }

  if (!scheduler) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-fg-ghost text-sm font-mono select-none">Desktop only</p>
      </div>
    )
  }

  const temp = items.find(i => i.id === TEMP_ITEM.id)
  const work = items.find(i => i.id === WORK_ITEM.id)

  return (
    <div className="p-4 space-y-6 max-w-xl">
      <div>
        <h1 className="text-base font-semibold text-white">Tardis</h1>
        <p className="text-xs text-fg-ghost mt-1">Scheduled notifications</p>
      </div>

      <div>
        <h2 className="text-xs font-semibold text-fg-secondary mb-2">Jules Watchers</h2>
        <WatcherList />
      </div>

      <ScheduleForm onAdd={item => { void add(item) }} />

      {temp && (
        <div className="flex items-center justify-between p-3 rounded-md border border-hair bg-raised">
          <div>
            <p className="text-xs text-fg-secondary font-mono">{temp.label}</p>
            <p className="text-3xs text-fg-ghost mt-0.5">every 1 min · chime · temp</p>
          </div>
          <button
            onClick={() => { void toggle(temp.id, !temp.enabled) }}
            className={`text-xs font-mono px-3 py-1 rounded-md border transition-colors cursor-pointer ${
              temp.enabled
                ? 'bg-selected text-fg-primary border-subtle'
                : 'bg-raised text-fg-ghost border-hair'
            }`}
          >
            {temp.enabled ? 'on' : 'off'}
          </button>
        </div>
      )}

      {work && (
        <div className="flex items-center justify-between p-3 rounded-md border border-hair bg-raised">
          <div>
            <p className="text-xs text-fg-secondary font-mono">{work.label}</p>
            <p className="text-3xs text-fg-ghost mt-0.5">every 15 min · 9–5 Mon–Fri · chime</p>
          </div>
          <button
            onClick={() => { void toggle(work.id, !work.enabled) }}
            className={`text-xs font-mono px-3 py-1 rounded-md border transition-colors cursor-pointer ${
              work.enabled
                ? 'bg-zinc-700 text-zinc-200 border-zinc-600'
                : 'bg-zinc-900 text-zinc-600 border-zinc-800'
            }`}
          >
            {work.enabled ? 'on' : 'off'}
          </button>
        </div>
      )}
    </div>
  )
}
