import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Bell, Plus, Trash2, ToggleLeft, ToggleRight, Clock } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { cn } from '@/utils'
import { scheduler } from '@shared/bridge'
import type { ScheduledItem, ScheduleInput } from '@shared/electron'

type RepeatMode = 'none' | 'daily' | 'weekly'
const SOUNDS    = ['none', 'pulse', 'chime', 'bell', 'beep', 'alert']
const REPEATS: RepeatMode[] = ['none', 'daily', 'weekly']

// ── helpers ───────────────────────────────────────────────────────────────────

function toSchedule(isoTime: string, repeat: RepeatMode): ScheduleInput {
  const d   = new Date(isoTime)
  const hh  = d.getHours().toString().padStart(2, '0')
  const mm  = d.getMinutes().toString().padStart(2, '0')
  const t   = `${hh}:${mm}`
  if (repeat === 'daily')  return { kind: 'daily',  time: t }
  if (repeat === 'weekly') return { kind: 'weekly', time: t, dayOfWeek: d.getDay() as 0|1|2|3|4|5|6 }
  return { kind: 'once', at: d.toISOString() }
}

function scheduleLabel(s: ScheduleInput): string {
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  if (s.kind === 'once')    return new Date(s.at).toLocaleString()
  if (s.kind === 'daily')   return `Daily at ${s.time}`
  if (s.kind === 'weekly')  return `${days[s.dayOfWeek] ?? ''} at ${s.time}`
  return s.kind
}

function onceDate(s: ScheduleInput): Date | null {
  return s.kind === 'once' ? new Date(s.at) : null
}

function isOverdue(item: ScheduledItem): boolean {
  if (!item.enabled) return false
  const d = onceDate(item.schedule)
  return d !== null && d < new Date()
}

// ── AddForm ───────────────────────────────────────────────────────────────────

function AddForm({ onAdd }: { onAdd: () => void }) {
  const [title,  setTitle]  = useState('')
  const [body,   setBody]   = useState('')
  const [time,   setTime]   = useState('')
  const [repeat, setRepeat] = useState<RepeatMode>('none')
  const [sound,  setSound]  = useState('chime')

  const submit = async () => {
    if (!title.trim() || !time || !scheduler) return
    const item: ScheduledItem = {
      id:       crypto.randomUUID(),
      label:    title.trim(),
      ...(body.trim()         ? { body:  body.trim() } : {}),
      ...(sound !== 'none'    ? { sound: sound       } : {}),
      schedule:  toSchedule(time, repeat),
      enabled:   true,
      category:  'reminder',
      createdAt: new Date().toISOString(),
    }
    await scheduler.add(item)
    setTitle(''); setBody(''); setTime('')
    onAdd()
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.18 }}
      className="rounded-md border border-hair bg-hover/30 p-4 space-y-3"
    >
      <input
        autoFocus
        value={title}
        onChange={e => { setTitle(e.target.value) }}
        placeholder="Reminder title…"
        className="w-full bg-transparent border-b border-hair pb-1 text-[12px] font-semibold text-fg-primary placeholder-fg-ghost/40 outline-none focus:border-purple-500/40 transition-colors"
      />
      <input
        value={body}
        onChange={e => { setBody(e.target.value) }}
        placeholder="Description (optional)…"
        className="w-full bg-transparent text-[11px] text-fg-secondary placeholder-fg-ghost/40 outline-none"
      />
      <div className="flex items-center gap-3 flex-wrap">
        <input
          type="datetime-local"
          value={time}
          onChange={e => { setTime(e.target.value) }}
          className="bg-hover border border-hair rounded px-2 py-1 text-[10px] font-mono text-fg-primary outline-none focus:border-purple-500/40 transition-colors"
        />
        <select
          value={repeat}
          onChange={e => { setRepeat(e.target.value as RepeatMode) }}
          className="bg-hover border border-hair rounded px-2 py-1 text-[10px] font-mono text-fg-secondary outline-none"
        >
          {REPEATS.map(r => <option key={r} value={r}>{r}</option>)}
        </select>
        <select
          value={sound}
          onChange={e => { setSound(e.target.value) }}
          className="bg-hover border border-hair rounded px-2 py-1 text-[10px] font-mono text-fg-secondary outline-none"
        >
          {SOUNDS.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <button
          onClick={() => { void submit() }}
          disabled={!title.trim() || !time}
          className="ml-auto px-3 py-1 rounded border border-purple-500 bg-purple-600 text-white text-[10px] font-mono font-bold hover:bg-purple-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          Add
        </button>
      </div>
    </motion.div>
  )
}

// ── ReminderRow ───────────────────────────────────────────────────────────────

function ReminderRow({ item, onRemove, onToggle }: {
  item:     ScheduledItem
  onRemove: (id: string) => void
  onToggle: (id: string, enabled: boolean) => void
}) {
  const overdue = isOverdue(item)
  const d       = onceDate(item.schedule)

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.18 }}
      className={cn(
        'flex items-center gap-3 py-3 px-3 rounded-md transition-colors group',
        item.enabled ? 'hover:bg-hover/50' : 'opacity-50 hover:opacity-70',
      )}
    >
      <div className="w-2 shrink-0 flex items-center justify-center">
        {overdue ? (
          <span className="relative flex h-1.5 w-1.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-60" />
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-red-500" />
          </span>
        ) : (
          <span className={cn('h-1.5 w-1.5 rounded-full', item.enabled ? 'bg-purple-500' : 'bg-fg-ghost/20')} />
        )}
      </div>

      <div className="flex-1 min-w-0">
        <span className="text-[12px] font-semibold text-fg-primary block truncate">{item.label}</span>
        {item.body !== undefined && (
          <span className="text-3xs text-fg-ghost truncate block">{item.body}</span>
        )}
        <div className="flex items-center gap-2 mt-0.5">
          <Clock className="h-2.5 w-2.5 text-fg-ghost shrink-0" />
          <span className={cn('text-3xs font-mono', overdue ? 'text-red-400' : 'text-fg-ghost')}>
            {scheduleLabel(item.schedule)}
            {overdue && d !== null && ` · ${formatDistanceToNow(d, { addSuffix: true })}`}
          </span>
          {item.schedule.kind !== 'once' && (
            <span className="text-3xs font-mono text-purple-400 uppercase">{item.schedule.kind}</span>
          )}
        </div>
      </div>

      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
        <button
          onClick={() => { onToggle(item.id, !item.enabled) }}
          className="p-1 rounded hover:bg-hover text-fg-ghost hover:text-fg-primary transition-colors"
        >
          {item.enabled
            ? <ToggleRight className="h-3.5 w-3.5 text-purple-400" />
            : <ToggleLeft  className="h-3.5 w-3.5" />}
        </button>
        <button
          onClick={() => { onRemove(item.id) }}
          className="p-1 rounded hover:bg-red-500/10 text-fg-ghost hover:text-red-400 transition-colors"
        >
          <Trash2 className="h-3 w-3" />
        </button>
      </div>
    </motion.div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function RemindersPage() {
  const [items,  setItems]  = useState<ScheduledItem[]>([])
  const [adding, setAdding] = useState(false)
  const loaded = useRef(false)

  useEffect(() => {
    if (!scheduler || loaded.current) return
    loaded.current = true
    void scheduler.list().then(all => {
      setItems(all.filter(i => i.category === 'reminder'))
    })
    return scheduler.onFired((fired) => {
      if (fired.schedule.kind === 'once') {
        setItems(p => p.filter(i => i.id !== fired.id))
      }
    })
  }, [])

  async function remove(id: string) {
    if (!scheduler) return
    await scheduler.remove(id)
    setItems(p => p.filter(i => i.id !== id))
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

  const sorted   = [...items].sort((a, b) => {
    const da = onceDate(a.schedule)?.getTime() ?? 0
    const db = onceDate(b.schedule)?.getTime() ?? 0
    return da - db
  })
  const overdue  = sorted.filter(isOverdue)
  const upcoming = sorted.filter(i => i.enabled && !isOverdue(i))
  const disabled = sorted.filter(i => !i.enabled)

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <motion.div
        initial={{ opacity: 0, y: -6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.18 }}
        className="flex items-center gap-3 px-6 pt-5 pb-4 shrink-0"
      >
        <Bell className="h-4 w-4 text-fg-ghost" />
        <span className="text-[12px] font-semibold text-fg-primary">Reminders</span>
        {overdue.length > 0 && (
          <span className="text-3xs font-mono px-1.5 rounded bg-red-500/10 text-red-400 font-bold">
            {overdue.length} overdue
          </span>
        )}
        <div className="flex-1" />
        <button
          onClick={() => { setAdding(v => !v) }}
          className="flex items-center gap-1.5 px-3 py-1 rounded border border-hair text-[10px] font-mono text-fg-ghost hover:text-fg-primary hover:border-subtle transition-colors"
        >
          <Plus className="h-3 w-3" />
          New reminder
        </button>
      </motion.div>

      <div className="flex-1 overflow-y-auto min-h-0">
        <div className="px-6 pb-8 space-y-2">
          <AnimatePresence>
            {adding && <AddForm onAdd={() => { setAdding(false); void scheduler?.list().then(all => { setItems(all.filter(i => i.category === 'reminder')) }) }} />}
          </AnimatePresence>

          {items.length === 0 && !adding && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-[10px] font-mono text-fg-ghost uppercase tracking-widest text-center py-16"
            >
              No reminders
            </motion.p>
          )}

          {overdue.length > 0 && (
            <div className="space-y-px">
              <p className="text-3xs font-mono text-red-400 uppercase tracking-widest px-3 pt-2 pb-1">Overdue</p>
              <AnimatePresence>
                {overdue.map(i => <ReminderRow key={i.id} item={i} onRemove={id => { void remove(id) }} onToggle={(id, en) => { void toggle(id, en) }} />)}
              </AnimatePresence>
            </div>
          )}

          {upcoming.length > 0 && (
            <div className="space-y-px">
              <p className="text-3xs font-mono text-fg-ghost uppercase tracking-widest px-3 pt-2 pb-1">Upcoming</p>
              <AnimatePresence>
                {upcoming.map(i => <ReminderRow key={i.id} item={i} onRemove={id => { void remove(id) }} onToggle={(id, en) => { void toggle(id, en) }} />)}
              </AnimatePresence>
            </div>
          )}

          {disabled.length > 0 && (
            <div className="space-y-px">
              <p className="text-3xs font-mono text-fg-ghost uppercase tracking-widest px-3 pt-2 pb-1">Disabled</p>
              <AnimatePresence>
                {disabled.map(i => <ReminderRow key={i.id} item={i} onRemove={id => { void remove(id) }} onToggle={(id, en) => { void toggle(id, en) }} />)}
              </AnimatePresence>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
