import { useState } from 'react'
import { Plus, Trash2, Check, BellOff, Bell } from 'lucide-react'
import { useReminders } from './useReminders'
import { ReminderForm } from './ReminderForm'
import { Button } from '@/ui/button'
import type { ReminderEntry, ReminderFrequency } from '@shared/hub'

function freqLabel(f: ReminderFrequency): string {
  const DAY = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  switch (f.type) {
    case 'once':     return `Once · ${f.date}`
    case 'daily':    return 'Every day'
    case 'weekdays': return 'Weekdays'
    case 'weekly':   return `Weekly · ${DAY[f.dayOfWeek]}`
    case 'monthly':  return `Monthly · day ${f.dayOfMonth}`
    case 'interval': return `Every ${f.days} days`
  }
}

function pad(n: number) { return String(n).padStart(2, '0') }

export function RemindersList() {
  const { items, save, remove, toggle, done } = useReminders()
  const [open, setOpen]       = useState(false)
  const [editing, setEditing] = useState<ReminderEntry | undefined>()

  function openNew()             { setEditing(undefined); setOpen(true) }
  function openEdit(r: ReminderEntry) { setEditing(r); setOpen(true) }

  const active   = items.filter((r) => !r.doneAt)
  const finished = items.filter((r) => !!r.doneAt)

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-medium text-fg-secondary uppercase tracking-wide">Reminders</h2>
        <Button size="sm" onClick={openNew} className="gap-1.5">
          <Plus size={13} /> New
        </Button>
      </div>

      {active.length === 0 && (
        <p className="text-sm text-fg-muted text-center py-8">No reminders yet.</p>
      )}

      <ul className="space-y-2">
        {active.map((r) => (
          <li
            key={r.id}
            className="flex items-start gap-3 rounded-lg border border-border bg-surface px-4 py-3 group"
          >
            <button
              onClick={() => { void done(r.id) }}
              className="mt-0.5 shrink-0 text-fg-secondary hover:text-green-400 transition-colors"
              aria-label="Mark done"
            >
              <Check size={14} />
            </button>

            <button onClick={() => { openEdit(r) }} className="flex-1 text-left min-w-0">
              <p className={`text-sm font-medium truncate ${r.enabled ? 'text-fg-primary' : 'text-fg-secondary line-through'}`}>
                {r.text}
              </p>
              <p className="text-xs text-fg-muted mt-0.5">
                {freqLabel(r.frequency)} · {pad(r.hour)}:{pad(r.minute)}
              </p>
            </button>

            <button
              onClick={() => { void toggle(r.id, !r.enabled) }}
              className="text-fg-secondary hover:text-fg-primary transition-colors shrink-0"
              aria-label={r.enabled ? 'Disable' : 'Enable'}
            >
              {r.enabled ? <Bell size={13} /> : <BellOff size={13} />}
            </button>

            <button
              onClick={() => { void remove(r.id) }}
              className="text-fg-secondary hover:text-destructive transition-colors opacity-0 group-hover:opacity-100 shrink-0"
              aria-label="Delete"
            >
              <Trash2 size={13} />
            </button>
          </li>
        ))}
      </ul>

      {finished.length > 0 && (
        <details className="mt-2">
          <summary className="text-xs text-fg-muted cursor-pointer select-none">
            {finished.length} completed
          </summary>
          <ul className="space-y-1 mt-2">
            {finished.map((r) => (
              <li key={r.id} className="flex items-center gap-3 px-4 py-2 rounded-lg border border-border/50 bg-surface/50 opacity-50">
                <Check size={12} className="text-green-400 shrink-0" />
                <span className="text-sm line-through text-fg-secondary flex-1 truncate">{r.text}</span>
                <button onClick={() => { void remove(r.id) }} className="text-fg-muted hover:text-destructive">
                  <Trash2 size={12} />
                </button>
              </li>
            ))}
          </ul>
        </details>
      )}

      <ReminderForm
        open={open}
        initial={editing}
        onClose={() => { setOpen(false) }}
        onSave={(r) => { void save(r) }}
      />
    </div>
  )
}
