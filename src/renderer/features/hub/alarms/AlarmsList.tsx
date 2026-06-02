import { useState } from 'react'
import { Plus, Trash2, Bell, BellOff, Volume2, VolumeX } from 'lucide-react'
import { useAlarms } from './useAlarms'
import { AlarmForm } from './AlarmForm'
import { Button } from '@/ui/button'
import type { AlarmEntry } from '@shared/hub'

function pad(n: number) { return String(n).padStart(2, '0') }

export function AlarmsList() {
  const { items, save, remove, toggle } = useAlarms()
  const [open, setOpen]       = useState(false)
  const [editing, setEditing] = useState<AlarmEntry | undefined>()

  function openNew() { setEditing(undefined); setOpen(true) }
  function openEdit(a: AlarmEntry) { setEditing(a); setOpen(true) }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-medium text-fg-secondary uppercase tracking-wide">Alarms</h2>
        <Button size="sm" onClick={openNew} className="gap-1.5">
          <Plus size={13} /> New
        </Button>
      </div>

      {items.length === 0 && (
        <p className="text-sm text-fg-muted text-center py-8">No alarms yet.</p>
      )}

      <ul className="space-y-2">
        {items.map((alarm) => (
          <li
            key={alarm.id}
            className="flex items-center gap-4 rounded-lg border border-border bg-surface px-4 py-3 group"
          >
            <button onClick={() => { openEdit(alarm) }} className="flex-1 text-left">
              <span className={`text-2xl font-mono font-light tabular-nums ${alarm.enabled ? 'text-fg-primary' : 'text-fg-secondary'}`}>
                {pad(alarm.hour)}:{pad(alarm.minute)}
              </span>
              <div className="flex items-center gap-2 mt-0.5">
                {alarm.label && <span className="text-xs text-fg-secondary">{alarm.label}</span>}
                <span className="text-xs text-fg-muted capitalize">{alarm.repeat}</span>
                {alarm.sound !== 'none'
                  ? <Volume2 size={10} className="text-fg-muted" />
                  : <VolumeX  size={10} className="text-fg-muted" />
                }
              </div>
            </button>

            <button
              onClick={() => { void toggle(alarm.id, !alarm.enabled) }}
              className="text-fg-secondary hover:text-fg-primary transition-colors"
              aria-label={alarm.enabled ? 'Disable' : 'Enable'}
            >
              {alarm.enabled ? <Bell size={15} /> : <BellOff size={15} />}
            </button>

            <button
              onClick={() => { void remove(alarm.id) }}
              className="text-fg-secondary hover:text-destructive transition-colors opacity-0 group-hover:opacity-100"
              aria-label="Delete"
            >
              <Trash2 size={13} />
            </button>
          </li>
        ))}
      </ul>

      <AlarmForm
        open={open}
        initial={editing}
        onClose={() => { setOpen(false) }}
        onSave={(alarm) => { void save(alarm) }}
      />
    </div>
  )
}
