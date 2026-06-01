import { useCallback, useEffect, useState } from 'react'
import { Plus, Trash2, Bell, BellOff, Volume2, VolumeX } from 'lucide-react'
import { alarms as alarmsIpc } from '@shared/bridge'
import { Button } from '@/ui/button'
import { Input } from '@/ui/input'
import { Label } from '@/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/ui/select'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/ui/dialog'
import type { AlarmEntry, AlarmRepeat } from '@shared/alarms'

const REPEAT_LABELS: Record<AlarmRepeat, string> = {
  none:     'Once',
  daily:    'Every day',
  weekdays: 'Weekdays',
  weekly:   'Weekly',
}

function pad(n: number) { return String(n).padStart(2, '0') }
function fmtTime(h: number, m: number) { return `${pad(h)}:${pad(m)}` }

function parseTime(value: string): { hour: number; minute: number } {
  const [h, m] = value.split(':').map(Number)
  return { hour: h ?? 0, minute: m ?? 0 }
}

const DEFAULT_FORM: Omit<AlarmEntry, 'id' | 'createdAt'> = {
  label: '',
  hour: 8,
  minute: 0,
  repeat: 'none',
  dayOfWeek: new Date().getDay(),
  enabled: true,
  sound: true,
  snoozeMinutes: 5,
}

export default function AlarmsPage() {
  const [items, setItems] = useState<AlarmEntry[]>([])
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<AlarmEntry | null>(null)
  const [form, setForm] = useState(DEFAULT_FORM)

  const load = useCallback(async () => {
    const ipc = alarmsIpc
    if (!ipc) return
    const list = await ipc.list()
    setItems(list.sort((a, b) => a.hour * 60 + a.minute - (b.hour * 60 + b.minute)))
  }, [])

  useEffect(() => {
    void load()
    const ipc = alarmsIpc
    if (!ipc) return
    return ipc.onChanged(() => { void load() })
  }, [load])

  function openNew() {
    setEditing(null)
    setForm({ ...DEFAULT_FORM, dayOfWeek: new Date().getDay() })
    setOpen(true)
  }

  function openEdit(alarm: AlarmEntry) {
    setEditing(alarm)
    setForm({
      label:         alarm.label,
      hour:          alarm.hour,
      minute:        alarm.minute,
      repeat:        alarm.repeat,
      dayOfWeek:     alarm.dayOfWeek,
      enabled:       alarm.enabled,
      sound:         alarm.sound,
      snoozeMinutes: alarm.snoozeMinutes,
    })
    setOpen(true)
  }

  async function save() {
    const ipc = alarmsIpc
    if (!ipc) return
    const alarm: AlarmEntry = editing
      ? { ...editing, ...form }
      : {
          ...form,
          id: crypto.randomUUID(),
          createdAt: new Date().toISOString(),
        }
    await ipc.save(alarm)
    setOpen(false)
    void load()
  }

  async function remove(id: string) {
    await alarmsIpc?.delete(id)
    void load()
  }

  async function toggle(id: string, enabled: boolean) {
    await alarmsIpc?.toggle(id, enabled)
    setItems((prev) =>
      prev.map((a) => (a.id === id ? { ...a, enabled } : a))
    )
  }

  return (
    <div className="w-full h-full overflow-y-auto">
      <div className="max-w-xl mx-auto px-6 pt-10 pb-20">

        <div className="flex items-center justify-between mb-6">
          <h1 className="text-lg font-semibold text-fg-primary">Alarms</h1>
          <Button size="sm" onClick={openNew} className="gap-1.5">
            <Plus size={14} /> New alarm
          </Button>
        </div>

        {items.length === 0 && (
          <p className="text-sm text-fg-secondary text-center mt-16">
            No alarms yet. Add one to get started.
          </p>
        )}

        <ul className="space-y-2">
          {items.map((alarm) => (
            <li
              key={alarm.id}
              className="flex items-center gap-4 rounded-lg border border-border bg-surface px-4 py-3 group"
            >
              <button
                onClick={() => openEdit(alarm)}
                className="flex-1 text-left"
              >
                <span className={`text-2xl font-mono font-light tabular-nums ${alarm.enabled ? 'text-fg-primary' : 'text-fg-secondary'}`}>
                  {fmtTime(alarm.hour, alarm.minute)}
                </span>
                <div className="flex items-center gap-2 mt-0.5">
                  {alarm.label && (
                    <span className="text-xs text-fg-secondary">{alarm.label}</span>
                  )}
                  <span className="text-xs text-fg-muted">{REPEAT_LABELS[alarm.repeat]}</span>
                  {alarm.sound
                    ? <Volume2 size={11} className="text-fg-muted" />
                    : <VolumeX  size={11} className="text-fg-muted" />
                  }
                </div>
              </button>

              <button
                onClick={() => toggle(alarm.id, !alarm.enabled)}
                className="text-fg-secondary hover:text-fg-primary transition-colors"
                aria-label={alarm.enabled ? 'Disable alarm' : 'Enable alarm'}
              >
                {alarm.enabled ? <Bell size={16} /> : <BellOff size={16} />}
              </button>

              <button
                onClick={() => remove(alarm.id)}
                className="text-fg-secondary hover:text-destructive transition-colors opacity-0 group-hover:opacity-100"
                aria-label="Delete alarm"
              >
                <Trash2 size={14} />
              </button>
            </li>
          ))}
        </ul>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit alarm' : 'New alarm'}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Time</Label>
              <Input
                type="time"
                value={fmtTime(form.hour, form.minute)}
                onChange={(e) => {
                  const { hour, minute } = parseTime(e.target.value)
                  setForm((f) => ({ ...f, hour, minute }))
                }}
              />
            </div>

            <div className="space-y-1.5">
              <Label>Label</Label>
              <Input
                placeholder="Alarm label"
                value={form.label}
                onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))}
              />
            </div>

            <div className="space-y-1.5">
              <Label>Repeat</Label>
              <Select
                value={form.repeat}
                onValueChange={(v) => setForm((f) => ({ ...f, repeat: v as AlarmRepeat }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(REPEAT_LABELS) as AlarmRepeat[]).map((k) => (
                    <SelectItem key={k} value={k}>{REPEAT_LABELS[k]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Snooze</Label>
              <Select
                value={String(form.snoozeMinutes)}
                onValueChange={(v) => setForm((f) => ({ ...f, snoozeMinutes: Number(v) }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[1, 5, 10, 15, 20, 30].map((m) => (
                    <SelectItem key={m} value={String(m)}>{m} min</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => setForm((f) => ({ ...f, sound: !f.sound }))}
                className="flex items-center gap-2 text-sm text-fg-secondary hover:text-fg-primary transition-colors"
              >
                {form.sound ? <Volume2 size={15} /> : <VolumeX size={15} />}
                {form.sound ? 'Sound on' : 'Sound off'}
              </button>
            </div>
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={save}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
