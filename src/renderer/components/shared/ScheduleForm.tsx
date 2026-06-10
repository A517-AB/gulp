import { useState } from 'react'
import type { ScheduledItem, ScheduleInput } from '@shared/electron'

type SoundId = 'none' | 'beep' | 'chime' | 'bell' | 'pulse'
type Kind = 'once' | 'interval' | 'daily' | 'windowed'

interface Props {
  onAdd: (item: ScheduledItem) => void
}

function randomId() {
  return Math.random().toString(36).slice(2, 10)
}

export function ScheduleForm({ onAdd }: Props) {
  const [label,    setLabel]    = useState('')
  const [kind,     setKind]     = useState<Kind>('once')
  const [minutes,  setMinutes]  = useState(15)
  const [time,     setTime]     = useState('09:00')
  const [fromHour, setFromHour] = useState(9)
  const [toHour,   setToHour]   = useState(17)
  const [sound,    setSound]    = useState<SoundId>('chime')

  function buildSchedule(): ScheduleInput | null {
    if (kind === 'once')     return { kind: 'once',     at: new Date(Date.now() + minutes * 60_000).toISOString() }
    if (kind === 'interval') return { kind: 'interval', everyMinutes: minutes }
    if (kind === 'daily')    return { kind: 'daily',    time }
    if (kind === 'windowed') return { kind: 'windowed', everyMinutes: minutes, fromHour, toHour, days: [1, 2, 3, 4, 5] }
    return null
  }

  function submit() {
    const l = label.trim()
    if (!l) return
    const schedule = buildSchedule()
    if (!schedule) return

    const item: ScheduledItem = {
      id:        randomId(),
      label:     l,
      schedule,
      enabled:   true,
      ...(sound !== 'none' && { sound }),
      createdAt: new Date().toISOString(),
    }

    onAdd(item)
    setLabel('')
  }

  return (
    <div className="space-y-3 p-3 rounded-md border border-hair bg-raised">
      <input
        value={label}
        onChange={e => { setLabel(e.target.value) }}
        placeholder="Label…"
        className="w-full bg-transparent border border-hair rounded-md px-2 py-1.5 text-xs text-fg-secondary placeholder:text-fg-ghost font-mono outline-none focus:border-zinc-600"
        onKeyDown={e => { if (e.key === 'Enter') submit() }}
      />

      <div className="flex gap-2 flex-wrap">
        {(['once', 'interval', 'daily', 'windowed'] as Kind[]).map(k => (
          <button
            key={k}
            onClick={() => { setKind(k) }}
            className={`text-3xs font-mono px-2 py-1 rounded border transition-colors cursor-pointer ${
              kind === k
                ? 'bg-zinc-700 text-zinc-200 border-zinc-600'
                : 'bg-transparent text-fg-ghost border-hair hover:text-fg-secondary'
            }`}
          >
            {k}
          </button>
        ))}
      </div>

      <div className="flex gap-2 flex-wrap items-center">
        {kind === 'once' && (
          <label className="flex items-center gap-1.5 text-xs text-fg-ghost">
            in
            <input type="number" min={1} value={minutes} onChange={e => { setMinutes(Number(e.target.value)) }}
              className="w-14 bg-transparent border border-hair rounded px-1.5 py-0.5 text-xs text-fg-secondary font-mono outline-none" />
            min
          </label>
        )}

        {kind === 'interval' && (
          <label className="flex items-center gap-1.5 text-xs text-fg-ghost">
            every
            <input type="number" min={1} value={minutes} onChange={e => { setMinutes(Number(e.target.value)) }}
              className="w-14 bg-transparent border border-hair rounded px-1.5 py-0.5 text-xs text-fg-secondary font-mono outline-none" />
            min
          </label>
        )}

        {kind === 'daily' && (
          <label className="flex items-center gap-1.5 text-xs text-fg-ghost">
            at
            <input type="time" value={time} onChange={e => { setTime(e.target.value) }}
              className="bg-transparent border border-hair rounded px-1.5 py-0.5 text-xs text-fg-secondary font-mono outline-none" />
          </label>
        )}

        {kind === 'windowed' && (
          <>
            <label className="flex items-center gap-1.5 text-xs text-fg-ghost">
              every
              <input type="number" min={1} value={minutes} onChange={e => { setMinutes(Number(e.target.value)) }}
                className="w-14 bg-transparent border border-hair rounded px-1.5 py-0.5 text-xs text-fg-secondary font-mono outline-none" />
              min
            </label>
            <label className="flex items-center gap-1.5 text-xs text-fg-ghost">
              <input type="number" min={0} max={23} value={fromHour} onChange={e => { setFromHour(Number(e.target.value)) }}
                className="w-10 bg-transparent border border-hair rounded px-1.5 py-0.5 text-xs text-fg-secondary font-mono outline-none" />
              –
              <input type="number" min={1} max={24} value={toHour} onChange={e => { setToHour(Number(e.target.value)) }}
                className="w-10 bg-transparent border border-hair rounded px-1.5 py-0.5 text-xs text-fg-secondary font-mono outline-none" />
              h
            </label>
          </>
        )}

        <select
          value={sound}
          onChange={e => { setSound(e.target.value as SoundId) }}
          className="bg-zinc-900 border border-hair rounded px-1.5 py-0.5 text-xs text-fg-secondary font-mono outline-none cursor-pointer"
        >
          {(['none', 'beep', 'chime', 'bell', 'pulse'] as SoundId[]).map(s => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>

      <button
        onClick={submit}
        disabled={!label.trim()}
        className="text-xs font-mono px-3 py-1 rounded-md border border-zinc-700 bg-zinc-800 text-zinc-200 hover:bg-zinc-700 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
      >
        add
      </button>
    </div>
  )
}
