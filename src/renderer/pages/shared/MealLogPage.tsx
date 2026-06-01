import { useEffect, useRef, useState } from 'react'
import { Plus } from 'lucide-react'
import { Button } from '@/ui/button'
import { Input } from '@/ui/input'

const LS_KEY = 'meallog:entries'

interface MealEntry {
  id: string
  text: string
  timestamp: string
}

function load(): MealEntry[] {
  try {
    const raw = localStorage.getItem(LS_KEY)
    return raw ? (JSON.parse(raw) as MealEntry[]) : []
  } catch {
    return []
  }
}

function save(entries: MealEntry[]) {
  localStorage.setItem(LS_KEY, JSON.stringify(entries))
}

function fmt(ts: string) {
  const d = new Date(ts)
  return d.toLocaleString(undefined, {
    month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

export default function MealLogPage() {
  const [entries, setEntries] = useState<MealEntry[]>([])
  const [draft, setDraft] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setEntries(load())
  }, [])

  function add() {
    const text = draft.trim()
    if (!text) return
    const entry: MealEntry = { id: crypto.randomUUID(), text, timestamp: new Date().toISOString() }
    const next = [entry, ...entries]
    setEntries(next)
    save(next)
    setDraft('')
    inputRef.current?.focus()
  }

  function remove(id: string) {
    const next = entries.filter((e) => e.id !== id)
    setEntries(next)
    save(next)
  }

  return (
    <div className="w-full h-full overflow-y-auto">
      <div className="max-w-xl mx-auto px-6 pt-10 pb-20">

        <h1 className="text-lg font-semibold text-fg-primary mb-6">Meal Log</h1>

        <div className="flex gap-2 mb-8">
          <Input
            ref={inputRef}
            placeholder="What did you eat?"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') add() }}
            className="flex-1"
          />
          <Button size="sm" onClick={add} className="gap-1.5">
            <Plus size={14} /> Add
          </Button>
        </div>

        {entries.length === 0 && (
          <p className="text-sm text-fg-secondary text-center mt-16">
            No entries yet. Log your first meal above.
          </p>
        )}

        <ul className="space-y-2">
          {entries.map((entry) => (
            <li
              key={entry.id}
              className="flex items-start gap-3 rounded-lg border border-border bg-surface px-4 py-3 group"
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm text-fg-primary">{entry.text}</p>
                <p className="text-xs text-fg-muted mt-0.5">{fmt(entry.timestamp)}</p>
              </div>
              <button
                onClick={() => remove(entry.id)}
                className="text-xs text-fg-secondary hover:text-destructive transition-colors opacity-0 group-hover:opacity-100 mt-0.5 shrink-0"
                aria-label="Delete entry"
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
