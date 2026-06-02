import { useState } from 'react'
import type { AlarmEntry, AlarmRepeat, SoundId } from '@shared/hub'
import { SOUND_LABELS } from '../sounds'
import { Button } from '@/ui/button'
import { Input } from '@/ui/input'
import { Label } from '@/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/ui/dialog'

const REPEAT_LABELS: Record<AlarmRepeat, string> = {
  none:     'Once',
  daily:    'Every day',
  weekdays: 'Weekdays',
  weekly:   'Weekly',
}

function pad(n: number) { return String(n).padStart(2, '0') }
function fmtTime(h: number, m: number) { return `${pad(h)}:${pad(m)}` }
function parseTime(v: string) {
  const [h, m] = v.split(':').map(Number)
  return { hour: h ?? 0, minute: m ?? 0 }
}

type FormState = Omit<AlarmEntry, 'id' | 'createdAt' | 'lastFiredDate'>

const DEFAULTS: FormState = {
  label: '', hour: 8, minute: 0, repeat: 'none',
  dayOfWeek: new Date().getDay(), enabled: true, sound: 'chime', snoozeMinutes: 5,
}

interface Props {
  initial: AlarmEntry | undefined
  open: boolean
  onClose: () => void
  onSave: (alarm: AlarmEntry) => void
}

export function AlarmForm({ initial, open, onClose, onSave }: Props) {
  const [form, setForm] = useState<FormState>(
    initial
      ? { label: initial.label, hour: initial.hour, minute: initial.minute,
          repeat: initial.repeat, dayOfWeek: initial.dayOfWeek, enabled: initial.enabled,
          sound: initial.sound, snoozeMinutes: initial.snoozeMinutes }
      : { ...DEFAULTS, dayOfWeek: new Date().getDay() }
  )

  function set<K extends keyof FormState>(k: K, v: FormState[K]) {
    setForm((f) => ({ ...f, [k]: v }))
  }

  function save() {
    const alarm: AlarmEntry = initial
      ? { ...initial, ...form }
      : { ...form, id: crypto.randomUUID(), createdAt: new Date().toISOString() }
    onSave(alarm)
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose() }}>
      <DialogContent className="sm:max-w-sm" aria-describedby={undefined}>
        <DialogHeader>
          <DialogTitle>{initial ? 'Edit alarm' : 'New alarm'}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label>Time</Label>
            <Input
              type="time"
              value={fmtTime(form.hour, form.minute)}
              onChange={(e) => { const { hour, minute } = parseTime(e.target.value); set('hour', hour); set('minute', minute) }}
            />
          </div>

          <div className="space-y-1.5">
            <Label>Label</Label>
            <Input
              placeholder="Alarm label"
              value={form.label}
              onChange={(e) => { set('label', e.target.value) }}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Repeat</Label>
              <Select value={form.repeat} onValueChange={(v) => { set('repeat', v as AlarmRepeat) }}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(Object.keys(REPEAT_LABELS) as AlarmRepeat[]).map((k) => (
                    <SelectItem key={k} value={k}>{REPEAT_LABELS[k]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Sound</Label>
              <Select value={form.sound} onValueChange={(v) => { set('sound', v as SoundId) }}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(Object.keys(SOUND_LABELS) as SoundId[]).map((id) => (
                    <SelectItem key={id} value={id}>{SOUND_LABELS[id]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Snooze</Label>
            <Select value={String(form.snoozeMinutes)} onValueChange={(v) => { set('snoozeMinutes', Number(v)) }}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {[1, 5, 10, 15, 20, 30].map((m) => (
                  <SelectItem key={m} value={String(m)}>{m} min</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button onClick={save}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
