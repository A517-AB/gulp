import { useState } from 'react'
import type { ReminderEntry, ReminderFrequency, SoundId } from '@shared/hub'
import { SOUND_LABELS } from '../sounds'
import { Button } from '@/ui/button'
import { Input } from '@/ui/input'
import { Label } from '@/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/ui/dialog'

type FreqType = ReminderFrequency['type']

const FREQ_LABELS: Record<FreqType, string> = {
  once:     'Once',
  daily:    'Every day',
  weekdays: 'Weekdays',
  weekly:   'Weekly',
  monthly:  'Monthly',
  interval: 'Every N days',
}

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

function pad(n: number) { return String(n).padStart(2, '0') }
function fmtTime(h: number, m: number) { return `${pad(h)}:${pad(m)}` }
function parseTime(v: string) {
  const [h, m] = v.split(':').map(Number)
  return { hour: h ?? 0, minute: m ?? 0 }
}

type FormState = {
  text: string
  freqType: FreqType
  freqDate: string
  freqDayOfWeek: number
  freqDayOfMonth: number
  freqDays: number
  hour: number
  minute: number
  sound: SoundId
  enabled: boolean
}

function buildFrequency(f: FormState): ReminderFrequency {
  switch (f.freqType) {
    case 'once':     return { type: 'once', date: f.freqDate }
    case 'daily':    return { type: 'daily' }
    case 'weekdays': return { type: 'weekdays' }
    case 'weekly':   return { type: 'weekly', dayOfWeek: f.freqDayOfWeek }
    case 'monthly':  return { type: 'monthly', dayOfMonth: f.freqDayOfMonth }
    case 'interval': return { type: 'interval', days: f.freqDays }
  }
}

function initialForm(r?: ReminderEntry): FormState {
  if (!r) return {
    text: '', freqType: 'daily', freqDate: new Date().toISOString().slice(0, 10),
    freqDayOfWeek: new Date().getDay(), freqDayOfMonth: new Date().getDate(),
    freqDays: 3, hour: 9, minute: 0, sound: 'soft', enabled: true,
  }
  const f = r.frequency
  return {
    text: r.text, freqType: f.type,
    freqDate:       f.type === 'once'     ? f.date        : new Date().toISOString().slice(0, 10),
    freqDayOfWeek:  f.type === 'weekly'   ? f.dayOfWeek   : new Date().getDay(),
    freqDayOfMonth: f.type === 'monthly'  ? f.dayOfMonth  : new Date().getDate(),
    freqDays:       f.type === 'interval' ? f.days        : 3,
    hour: r.hour, minute: r.minute, sound: r.sound, enabled: r.enabled,
  }
}

interface Props {
  initial: ReminderEntry | undefined
  open: boolean
  onClose: () => void
  onSave: (r: ReminderEntry) => void
}

export function ReminderForm({ initial, open, onClose, onSave }: Props) {
  const [form, setForm] = useState<FormState>(() => initialForm(initial))

  function set<K extends keyof FormState>(k: K, v: FormState[K]) {
    setForm((f) => ({ ...f, [k]: v }))
  }

  function save() {
    if (!form.text.trim()) return
    const entry: ReminderEntry = initial
      ? { ...initial, text: form.text, frequency: buildFrequency(form),
          hour: form.hour, minute: form.minute, sound: form.sound, enabled: form.enabled }
      : { id: crypto.randomUUID(), text: form.text, frequency: buildFrequency(form),
          hour: form.hour, minute: form.minute, sound: form.sound, enabled: form.enabled,
          createdAt: new Date().toISOString() }
    onSave(entry)
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose() }}>
      <DialogContent className="sm:max-w-sm" aria-describedby={undefined}>
        <DialogHeader>
          <DialogTitle>{initial ? 'Edit reminder' : 'New reminder'}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label>Reminder</Label>
            <Input
              placeholder="What do you need to remember?"
              value={form.text}
              onChange={(e) => { set('text', e.target.value) }}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Time</Label>
              <Input
                type="time"
                value={fmtTime(form.hour, form.minute)}
                onChange={(e) => { const { hour, minute } = parseTime(e.target.value); set('hour', hour); set('minute', minute) }}
              />
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
            <Label>Frequency</Label>
            <Select value={form.freqType} onValueChange={(v) => { set('freqType', v as FreqType) }}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {(Object.keys(FREQ_LABELS) as FreqType[]).map((k) => (
                  <SelectItem key={k} value={k}>{FREQ_LABELS[k]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {form.freqType === 'once' && (
            <div className="space-y-1.5">
              <Label>Date</Label>
              <Input type="date" value={form.freqDate} onChange={(e) => { set('freqDate', e.target.value) }} />
            </div>
          )}

          {form.freqType === 'weekly' && (
            <div className="space-y-1.5">
              <Label>Day</Label>
              <Select value={String(form.freqDayOfWeek)} onValueChange={(v) => { set('freqDayOfWeek', Number(v)) }}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {DAY_LABELS.map((d, i) => (
                    <SelectItem key={i} value={String(i)}>{d}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {form.freqType === 'monthly' && (
            <div className="space-y-1.5">
              <Label>Day of month</Label>
              <Input
                type="number" min={1} max={31}
                value={form.freqDayOfMonth}
                onChange={(e) => { set('freqDayOfMonth', Number(e.target.value)) }}
              />
            </div>
          )}

          {form.freqType === 'interval' && (
            <div className="space-y-1.5">
              <Label>Every N days</Label>
              <Input
                type="number" min={1}
                value={form.freqDays}
                onChange={(e) => { set('freqDays', Number(e.target.value)) }}
              />
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button onClick={save}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
