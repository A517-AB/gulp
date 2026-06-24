import {useEffect, useMemo, useRef, useState} from 'react'
import {jules} from '@jules'
import type {SessionResource} from '@jules'

interface SessionPickerProps {
  value: string
  onChange: (id: string) => void
}

export function SessionPicker({ value, onChange }: SessionPickerProps) {
    const [sessions, setSessions] = useState<SessionResource[]>([])
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const ref = useRef<HTMLDivElement>(null)

    useEffect(() => {
        void (async () => {
            const list: SessionResource[] = []
            for await (const s of jules.sessions({pageSize: 50})) {
                list.push(s)
            }
            setSessions(list)
        })()
    }, [])

  const recent = useMemo(() =>
          sessions.slice().sort((a, b) => b.updateTime.localeCompare(a.updateTime)).slice(0, 10),
    [sessions],
  )

  const filtered = useMemo(() =>
    query ? recent.filter(s => s.title.toLowerCase().includes(query.toLowerCase())) : recent,
    [recent, query],
  )

  const selected = useMemo(() => sessions.find(s => s.id === value), [sessions, value])

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => { document.removeEventListener('mousedown', handler) }
  }, [])

  return (
    <div ref={ref} className="relative space-y-1">
      <span className="text-[10px] font-mono text-fg-ghost">session</span>
      <button
        type="button"
        onClick={() => { setOpen(o => !o); setQuery('') }}
        className="w-full bg-surface border border-hair rounded px-2 py-1 text-xs font-mono text-left flex items-center justify-between gap-2 hover:border-subtle transition-colors"
      >
        <span className={selected ? 'text-fg-primary truncate' : 'text-fg-ghost'}>
          {selected?.title ?? (value || 'pick or paste id')}
        </span>
        <span className="text-fg-ghost shrink-0">{open ? '▴' : '▾'}</span>
      </button>

      {open && (
        <div className="absolute z-50 top-full mt-1 left-0 right-0 bg-base border border-hair rounded shadow-lg overflow-hidden">
          <input
            autoFocus
            value={query}
            onChange={e => { setQuery(e.target.value) }}
            placeholder="filter..."
            className="w-full bg-surface border-b border-hair px-2 py-1.5 text-xs font-mono text-fg-primary placeholder:text-fg-ghost focus:outline-none"
          />
          <div className="max-h-48 overflow-y-auto">
            {filtered.length === 0 && (
              <p className="text-[10px] font-mono text-fg-ghost px-2 py-2">no sessions</p>
            )}
            {filtered.map(s => (
              <button
                key={s.id}
                type="button"
                onMouseDown={() => { onChange(s.id); setOpen(false) }}
                className={`w-full text-left px-2 py-1.5 text-xs font-mono truncate hover:bg-hover transition-colors ${s.id === value ? 'text-fg-primary' : 'text-fg-muted'}`}
              >
                {s.title}
              </button>
            ))}
          </div>
          <div className="border-t border-hair">
            <input
              value={value}
              onChange={e => { onChange(e.target.value) }}
              placeholder="or paste session id..."
              className="w-full bg-surface px-2 py-1.5 text-[10px] font-mono text-fg-dim placeholder:text-fg-ghost focus:outline-none"
            />
          </div>
        </div>
      )}
    </div>
  )
}
