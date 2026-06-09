import type {ReactNode} from 'react'
import {useEffect, useMemo, useRef, useState} from 'react'
import {format} from 'date-fns'
import type {SoundId} from '@/library/alarm'
import {BrowserSoundController, useAlarmClock, useReminderClock,} from '@/library/alarm'
import {useNotification} from '@/library/notification'
import {scheduler} from '@shared/bridge'
import type {ScheduledItem} from '@shared/electron'
import {useTimeStore} from '@/store/time'

function randomId() {
  return Math.random().toString(36).slice(2, 10)
}

// ── Shared components ─────────────────────────────────────────────────────────

interface BtnProps {
  onClick:  () => void
  children: ReactNode
  muted?:   boolean
}

function Btn({ onClick, children, muted = false }: BtnProps) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors cursor-pointer ${
        muted
          ? 'bg-zinc-800/50 text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300 border border-zinc-800'
          : 'bg-zinc-800 text-zinc-200 hover:bg-zinc-700 border border-zinc-700/60'
      }`}
    >
      {children}
    </button>
  )
}

function Section({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="space-y-4">
      <h2 className="text-xs font-semibold text-zinc-600 uppercase tracking-widest">{label}</h2>
      {children}
    </div>
  )
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="space-y-2">
      <p className="text-xs text-zinc-600">{label}</p>
      <div className="flex flex-wrap gap-2 items-center">{children}</div>
    </div>
  )
}

// ── Sound section ─────────────────────────────────────────────────────────────

function SoundSection() {
  const ctrl = useMemo(() => new BrowserSoundController({ volume: 0.3 }), [])
  useEffect(() => () => { ctrl.destroy() }, [ctrl])

  const ids: SoundId[] = ['beep', 'chime', 'bell', 'pulse']

  return (
    <Section label="Sounds">
      <Row label="Preview (Web Audio, no OS)">
        {ids.map((id) => (
          <Btn key={id} onClick={() => { void ctrl.preview(id) }}>{id}</Btn>
        ))}
      </Row>
    </Section>
  )
}

// ── Notification section ──────────────────────────────────────────────────────

function NotificationSection() {
  const { notify, success, error, info, warning, dismiss } = useNotification()

  return (
    <Section label="Off-screen notifications">
      <Row label="Variants">
        <Btn onClick={() => { notify({ title: 'Last', body: 'Default notification' }) }}>Default</Btn>
        <Btn onClick={() => { success({ title: 'Success', body: 'Operation completed' }) }}>Success</Btn>
        <Btn onClick={() => { error({ title: 'Error', body: 'Something went wrong' }) }}>Error</Btn>
        <Btn onClick={() => { info({ title: 'Info', body: 'Just so you know' }) }}>Info</Btn>
        <Btn onClick={() => { warning({ title: 'Warning', body: 'Proceed with caution' }) }}>Warning</Btn>
      </Row>
      <Row label="With sound">
        <Btn onClick={() => { success({ title: 'Chime!', sound: 'chime' }) }}>Chime</Btn>
        <Btn onClick={() => { info({ title: 'Bell', sound: 'bell' }) }}>Bell</Btn>
        <Btn onClick={() => { warning({ title: 'Pulse', sound: 'pulse' }) }}>Pulse</Btn>
        <Btn onClick={() => { notify({ title: 'Beep', sound: 'beep' }) }}>Beep</Btn>
      </Row>
      <Row label="Controls">
        <Btn onClick={() => { notify({ title: 'Title only' }) }}>No body</Btn>
        <Btn muted onClick={dismiss}>Dismiss</Btn>
      </Row>
    </Section>
  )
}

// ── Actions & cancel section ──────────────────────────────────────────────────

function ActionSection() {
  const [log, setLog] = useState<string[]>([])
  const append = (msg: string) => { setLog(p => [msg, ...p].slice(0, 5)) }

  const { notify, success, info } = useNotification({
    onClick:  (d) => { append(`action → ${JSON.stringify(d)}`) },
    onCancel: (d) => { append(`cancel → ${JSON.stringify(d)}`) },
  })

  return (
    <Section label="Actions & cancel">
      <Row label="Variants">
        <Btn onClick={() => {
          notify({ title: 'New message', body: 'From Alex', action: { label: 'View' }, extraData: 'view' })
        }}>Action only</Btn>
        <Btn onClick={() => {
          success({
            title: 'Export ready', body: 'report.pdf',
            action: { label: 'Open' }, cancel: { label: 'Dismiss' },
            extraData: 'open',
          })
        }}>Action + cancel</Btn>
        <Btn onClick={() => {
          info({
            title: 'Stand-up in 5 min',
            action: { label: 'Got it' }, cancel: { label: 'Snooze 10m' },
            sound: 'pulse', extraData: 'standup',
          })
        }}>With snooze + sound</Btn>
      </Row>
      {log.length > 0 && (
        <ul className="space-y-0.5">
          {log.map((entry, i) => (
            <li key={i} className="text-xs text-zinc-600 font-mono">{entry}</li>
          ))}
        </ul>
      )}
    </Section>
  )
}

// ── Alarm section ─────────────────────────────────────────────────────────────

function AlarmSection() {
    const {alarms, addAlarm, removeAlarm, snoozeAlarm, clearAlarms} = useTimeStore()

  const { notify } = useNotification({
    onClick: (d) => {
      const extra = d as { source?: string; id?: string }
      if (extra.source !== 'alarm' || !extra.id) return
        removeAlarm(extra.id)
    },
    onCancel: (d) => {
      const extra = d as { source?: string; id?: string }
      if (extra.source !== 'alarm' || !extra.id) return
        snoozeAlarm(extra.id, new Date(Date.now() + 60_000).toISOString())
    },
  })

  useAlarmClock({
    alarms,
    intervalMs: 5000,
    onFired: (event) => {
      notify({
        title:  `Alarm: ${event.alarm.label}`,
        body:   `Fired at ${format(event.firedAt, 'HH:mm:ss')}`,
        action: { label: 'Dismiss' },
        cancel: { label: 'Snooze 1m' },
        sound:  'bell',
        extraData: { source: 'alarm', id: event.alarm.id },
      })
    },
  })

    function add() {
    const now = new Date()
        addAlarm({
            id: randomId(),
            label: 'Test alarm',
            time: format(now, 'HH:mm'),
            days: [],
            enabled: true,
            createdAt: now.toISOString(),
        })
  }

  return (
    <Section label="Alarms">
      <p className="text-xs text-zinc-600">Fires within ~10s. Dismiss removes it, Snooze delays 1 min.</p>
      <Row label="Controls">
          <Btn onClick={add}>Add (now)</Btn>
          <Btn muted onClick={clearAlarms}>Clear all</Btn>
        {alarms.length > 0 && (
          <span className="text-xs text-zinc-600">{alarms.length} pending</span>
        )}
      </Row>
      {alarms.length > 0 && (
        <ul className="space-y-1">
          {alarms.map(a => (
            <li key={a.id} className="text-xs text-zinc-600 font-mono">
              ⏰ {a.label} @ {a.time}
              {a.snoozeUntil ? ` · snooze → ${format(new Date(a.snoozeUntil), 'HH:mm')}` : ''}
            </li>
          ))}
        </ul>
      )}
    </Section>
  )
}

// ── Reminder section ──────────────────────────────────────────────────────────

function ReminderSection() {
    const {reminders, addReminder, removeReminder, snoozeReminder, clearReminders} = useTimeStore()

  const { notify } = useNotification({
    onClick: (d) => {
      const extra = d as { source?: string; id?: string }
      if (extra.source !== 'reminder' || !extra.id) return
        removeReminder(extra.id)
    },
    onCancel: (d) => {
      const extra = d as { source?: string; id?: string }
      if (extra.source !== 'reminder' || !extra.id) return
        snoozeReminder(extra.id, new Date(Date.now() + 60_000).toISOString())
    },
  })

  useReminderClock({
    reminders,
    intervalMs: 5000,
    onFired: (event) => {
      notify({
        title:  event.reminder.title,
        ...(event.reminder.note !== undefined && { body: event.reminder.note }),
        action: { label: 'Done' },
        cancel: { label: 'Snooze 1m' },
        sound:  'chime',
        extraData: { source: 'reminder', id: event.reminder.id },
      })
    },
  })

    return (
        <Section label="Reminders">
            <p className="text-xs text-zinc-600">Once fires in ~5s. Done removes it, Snooze delays 1 min.</p>
            <Row label="Create">
                <Btn onClick={() => {
                    addReminder({
                        id: randomId(),
                        title: 'Test reminder',
                        note: 'Fires within ~5 seconds',
                        schedule: {type: 'once', at: new Date().toISOString()},
                        enabled: true,
                        createdAt: new Date().toISOString(),
                    })
                }}>Once (now)</Btn>
                <Btn onClick={() => {
                    addReminder({
                        id: randomId(),
                        title: 'Interval reminder',
                        note: 'Every 1 min',
                        schedule: {type: 'interval', anchorAt: new Date().toISOString(), everyMinutes: 1},
                        enabled: true,
                        createdAt: new Date().toISOString(),
                    })
                }}>Interval (1 min)</Btn>
                <Btn muted onClick={clearReminders}>Clear all</Btn>
      </Row>
      {reminders.length > 0 && (
        <ul className="space-y-1">
          {reminders.map(r => (
            <li key={r.id} className="text-xs text-zinc-600 font-mono">
              🔔 {r.title}
              {r.snoozeUntil ? ` · snooze → ${format(new Date(r.snoozeUntil), 'HH:mm')}` : ''}
            </li>
          ))}
        </ul>
      )}
    </Section>
  )
}

// ── Main-process scheduler section ───────────────────────────────────────────

function SchedulerSection() {
  const [items, setItems]   = useState<ScheduledItem[]>([])
  const [fired, setFired]   = useState<string[]>([])
  const loaded              = useRef(false)

  useEffect(() => {
    if (!scheduler || loaded.current) return
    loaded.current = true
    void scheduler.list().then(setItems)
    return scheduler.onFired((item) => {
      setFired(p => [`fired: ${item.label} @ ${format(new Date(), 'HH:mm:ss')}`, ...p].slice(0, 5))
      setItems(p => p.filter(i => i.id !== item.id))
    })
  }, [])

  if (!scheduler) {
    return (
      <Section label="Main-process scheduler">
        <p className="text-xs text-zinc-600">Electron only — not available in web mode.</p>
      </Section>
    )
  }

  async function addOnce() {
    if (!scheduler) return
    const item: ScheduledItem = {
      id:        randomId(),
      label:     'Test (5s)',
      schedule:  { kind: 'once', at: new Date(Date.now() + 5_000).toISOString() },
      enabled:   true,
      sound:     'chime',
      createdAt: new Date().toISOString(),
    }
    const saved = await scheduler.add(item)
    setItems(p => [...p, saved])
  }

  async function addInterval() {
    if (!scheduler) return
    const item: ScheduledItem = {
      id:        randomId(),
      label:     'Interval (1 min)',
      schedule:  { kind: 'interval', everyMinutes: 1 },
      enabled:   true,
      createdAt: new Date().toISOString(),
    }
    const saved = await scheduler.add(item)
    setItems(p => [...p, saved])
  }

  async function remove(id: string) {
    if (!scheduler) return
    await scheduler.remove(id)
    setItems(p => p.filter(i => i.id !== id))
  }

  return (
    <Section label="Main-process scheduler (survives minimize)">
      <p className="text-xs text-zinc-600">Runs in Electron main via croner — fires even when window is hidden.</p>
      <Row label="Create">
        <Btn onClick={() => { void addOnce() }}>Once (5s)</Btn>
        <Btn onClick={() => { void addInterval() }}>Interval (1 min)</Btn>
      </Row>
      {items.length > 0 && (
        <Row label="Pending">
          <ul className="space-y-1 w-full">
            {items.map(i => (
              <li key={i.id} className="flex items-center gap-2 text-xs text-zinc-600 font-mono">
                <span className="flex-1">⏱ {i.label}</span>
                <Btn muted onClick={() => { void remove(i.id) }}>remove</Btn>
              </li>
            ))}
          </ul>
        </Row>
      )}
      {fired.length > 0 && (
        <ul className="space-y-0.5">
          {fired.map((entry, i) => (
            <li key={i} className="text-xs text-zinc-500 font-mono">{entry}</li>
          ))}
        </ul>
      )}
    </Section>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function LibraryPage() {
  return (
      <div className="p-4 space-y-6 max-w-xl">
      <div>
        <h1 className="text-base font-semibold text-white">Library test bed</h1>
        <p className="text-xs text-zinc-600 mt-1">Off-screen notifications · Sounds · Alarms · Reminders</p>
      </div>
      <SoundSection />
      <NotificationSection />
      <ActionSection />
      <AlarmSection />
      <ReminderSection />
      <SchedulerSection />
    </div>
  )
}
