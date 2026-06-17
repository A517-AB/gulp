import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Bell, Plus, Trash2, ToggleLeft, ToggleRight, Clock } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { cn } from '@/utils'
import { useRemindersStore, type Reminder, type RepeatMode } from '@/store/reminders'
import { useNotification } from '@/library/notification'

const SOUNDS = ['none', 'pulse', 'chime', 'alert', 'soft']
const REPEATS: RepeatMode[] = ['none', 'daily', 'weekly']

function fmtTime(iso: string): string {
  try { return new Date(iso).toLocaleString() } catch { return iso }
}
function isOverdue(iso: string): boolean {
  try { return new Date(iso) < new Date() } catch { return false }
}

function AddForm({ onAdd }: { onAdd: () => void }) {
  const { add } = useRemindersStore()
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [time, setTime] = useState('')
  const [repeat, setRepeat] = useState<RepeatMode>('none')
  const [sound, setSound] = useState('chime')

  const submit = () => {
    if (!title.trim() || !time) return
    const trimmedBody = body.trim()
    add({ title: title.trim(), ...(trimmedBody ? { body: trimmedBody } : {}), time: new Date(time).toISOString(), repeat, sound, enabled: true })
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
          onClick={submit}
          disabled={!title.trim() || !time}
          className="ml-auto px-3 py-1 rounded border border-purple-500 bg-purple-600 text-white text-[10px] font-mono font-bold hover:bg-purple-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          Add
        </button>
      </div>
    </motion.div>
  )
}

function ReminderRow({ reminder }: { reminder: Reminder }) {
  const { remove, toggle } = useRemindersStore()
  const overdue = isOverdue(reminder.time) && reminder.enabled

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.18 }}
      className={cn(
        'flex items-center gap-3 py-3 px-3 rounded-md transition-colors group',
        reminder.enabled ? 'hover:bg-hover/50' : 'opacity-50 hover:opacity-70',
      )}
    >
      <div className="w-2 shrink-0 flex items-center justify-center">
        {overdue ? (
          <span className="relative flex h-1.5 w-1.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-60" />
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-red-500" />
          </span>
        ) : (
          <span className={cn('h-1.5 w-1.5 rounded-full', reminder.enabled ? 'bg-purple-500' : 'bg-fg-ghost/20')} />
        )}
      </div>

      <div className="flex-1 min-w-0">
        <span className="text-[12px] font-semibold text-fg-primary block truncate">{reminder.title}</span>
        {reminder.body && (
          <span className="text-3xs text-fg-ghost truncate block">{reminder.body}</span>
        )}
        <div className="flex items-center gap-2 mt-0.5">
          <Clock className="h-2.5 w-2.5 text-fg-ghost shrink-0" />
          <span className={cn('text-3xs font-mono', overdue ? 'text-red-400' : 'text-fg-ghost')}>
            {fmtTime(reminder.time)}
            {overdue && ` · ${formatDistanceToNow(new Date(reminder.time), { addSuffix: true })}`}
          </span>
          {reminder.repeat !== 'none' && (
            <span className="text-3xs font-mono text-purple-400 uppercase">{reminder.repeat}</span>
          )}
        </div>
      </div>

      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
        <button onClick={() => { toggle(reminder.id) }} className="p-1 rounded hover:bg-hover text-fg-ghost hover:text-fg-primary transition-colors">
          {reminder.enabled
            ? <ToggleRight className="h-3.5 w-3.5 text-purple-400" />
            : <ToggleLeft className="h-3.5 w-3.5" />}
        </button>
        <button onClick={() => { remove(reminder.id) }} className="p-1 rounded hover:bg-red-500/10 text-fg-ghost hover:text-red-400 transition-colors">
          <Trash2 className="h-3 w-3" />
        </button>
      </div>
    </motion.div>
  )
}

export default function RemindersPage() {
  const { reminders, markFired } = useRemindersStore()
  const { notify } = useNotification()
  const [adding, setAdding] = useState(false)

  // Fire due reminders
  useEffect(() => {
    const check = () => {
      const now = new Date()
      for (const r of reminders) {
        if (!r.enabled) continue
        const due = new Date(r.time)
        if (due <= now && r.firedAt !== r.time) {
          notify({
            title: r.title,
            ...(r.body !== undefined ? { body: r.body } : {}),
            sound: r.sound as never,
            duration: 8000,
            id: `reminder-${r.id}`,
          })
          markFired(r.id)
        }
      }
    }
    check()
    const id = setInterval(check, 30000)
    return () => { clearInterval(id) }
  }, [reminders, notify, markFired])

  const sorted = [...reminders].sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime())
  const upcoming = sorted.filter(r => r.enabled && new Date(r.time) > new Date())
  const overdue  = sorted.filter(r => r.enabled && new Date(r.time) <= new Date())
  const disabled = sorted.filter(r => !r.enabled)

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
            {adding && <AddForm onAdd={() => { setAdding(false) }} />}
          </AnimatePresence>

          {reminders.length === 0 && !adding && (
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
                {overdue.map(r => <ReminderRow key={r.id} reminder={r} />)}
              </AnimatePresence>
            </div>
          )}

          {upcoming.length > 0 && (
            <div className="space-y-px">
              <p className="text-3xs font-mono text-fg-ghost uppercase tracking-widest px-3 pt-2 pb-1">Upcoming</p>
              <AnimatePresence>
                {upcoming.map(r => <ReminderRow key={r.id} reminder={r} />)}
              </AnimatePresence>
            </div>
          )}

          {disabled.length > 0 && (
            <div className="space-y-px">
              <p className="text-3xs font-mono text-fg-ghost uppercase tracking-widest px-3 pt-2 pb-1">Disabled</p>
              <AnimatePresence>
                {disabled.map(r => <ReminderRow key={r.id} reminder={r} />)}
              </AnimatePresence>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
