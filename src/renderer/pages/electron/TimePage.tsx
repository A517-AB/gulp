import type {ReactNode} from 'react'
import {useEffect, useMemo, useRef, useState} from 'react'
import {format, formatDistanceToNow} from 'date-fns'
import {AnimatePresence, motion} from 'motion/react'
import {BrowserSoundController} from '@notification/sounds'
import {useNotification} from '@/library/notification'
import {notifLog, scheduler} from '@shared/bridge'
import type {NotifLogEntry, ScheduledItem, UpcomingRun} from '@shared/electron'

function randomId() {
  return Math.random().toString(36).slice(2, 10)
}

// ── Shared ────────────────────────────────────────────────────────────────────

function Btn({ onClick, children, muted = false }: { onClick: () => void; children: ReactNode; muted?: boolean }) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 rounded-md text-sm font-medium transition-colors cursor-pointer border ${
        muted
          ? 'bg-raised text-fg-ghost hover:bg-hover hover:text-fg-secondary border-hair'
          : 'bg-raised text-fg-secondary hover:bg-hover hover:text-fg-primary border-subtle'
      }`}
    >
      {children}
    </button>
  )
}

function Section({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="space-y-4">
      <p className="text-xs font-mono uppercase tracking-widest text-fg-ghost">{label}</p>
      {children}
    </div>
  )
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="space-y-2">
      <p className="text-xs text-fg-muted">{label}</p>
      <div className="flex flex-wrap gap-2 items-center">{children}</div>
    </div>
  )
}

// ── Sounds ────────────────────────────────────────────────────────────────────

function SoundSection() {
  const ctrl = useMemo(() => new BrowserSoundController({ volume: 0.3 }), [])
  useEffect(() => () => { ctrl.destroy() }, [ctrl])

  return (
    <Section label="Sounds">
      <Row label="Web Audio — no OS">
        {(['beep', 'chime', 'bell', 'pulse'] as const).map((id) => (
          <Btn key={id} onClick={() => { void ctrl.preview(id) }}>{id}</Btn>
        ))}
      </Row>
    </Section>
  )
}

// ── Notifications ─────────────────────────────────────────────────────────────

function NotificationSection() {
  const { notify, success, error, info, warning, dismiss } = useNotification()

  return (
    <Section label="Notifications">
      <Row label="Types">
        <Btn onClick={() => { notify({ title: 'Default', body: 'Default notification' }) }}>Default</Btn>
        <Btn onClick={() => { success({ title: 'Success', body: 'Operation completed' }) }}>Success</Btn>
        <Btn onClick={() => { error({ title: 'Error', body: 'Something went wrong' }) }}>Error</Btn>
        <Btn onClick={() => { info({ title: 'Info', body: 'Just so you know' }) }}>Info</Btn>
        <Btn onClick={() => { warning({ title: 'Warning', body: 'Proceed with caution' }) }}>Warning</Btn>
      </Row>
      <Row label="With sound">
        <Btn onClick={() => { success({ title: 'Chime', sound: 'chime' }) }}>Chime</Btn>
        <Btn onClick={() => { info({ title: 'Bell', sound: 'bell' }) }}>Bell</Btn>
        <Btn onClick={() => { warning({ title: 'Pulse', sound: 'pulse' }) }}>Pulse</Btn>
        <Btn onClick={() => { notify({ title: 'Beep', sound: 'beep' }) }}>Beep</Btn>
      </Row>
      <Row label="Controls">
        <Btn onClick={() => { notify({ title: 'Title only' }) }}>No body</Btn>
        <Btn muted onClick={dismiss}>Dismiss all</Btn>
      </Row>
    </Section>
  )
}

// ── Actions ───────────────────────────────────────────────────────────────────

function ActionSection() {
  const [log, setLog] = useState<string[]>([])
  const append = (msg: string) => { setLog(p => [msg, ...p].slice(0, 5)) }

  const { notify, success, info } = useNotification({
    onAction: (actionId, d) => { append(`${actionId} → ${JSON.stringify(d)}`) },
  })

  return (
    <Section label="Actions">
      <Row label="Variants">
        <Btn onClick={() => {
          notify({ title: 'New message', body: 'From Alex', actions: [{ id: 'view', label: 'View' }], extraData: 'msg-1' })
        }}>Single action</Btn>
        <Btn onClick={() => {
          success({ title: 'Export ready', body: 'report.pdf', actions: [{ id: 'open', label: 'Open' }, { id: 'dismiss', label: 'Dismiss', style: 'ghost' }], extraData: 'export-1' })
        }}>Two actions</Btn>
        <Btn onClick={() => {
          info({ title: 'Stand-up in 5 min', actions: [{ id: 'ack', label: 'Got it' }, { id: 'snooze', label: 'Snooze 10m', style: 'ghost' }], sound: 'pulse', extraData: 'standup' })
        }}>With sound</Btn>
      </Row>
      {log.length > 0 && (
        <ul className="space-y-0.5 pt-1">
          {log.map((entry, i) => (
            <li key={i} className="text-xs text-fg-ghost font-mono">{entry}</li>
          ))}
        </ul>
      )}
    </Section>
  )
}

// ── Scheduler ─────────────────────────────────────────────────────────────────

function SchedulerSection() {
    const [items, setItems] = useState<ScheduledItem[]>([])
    const [upcoming, setUpcoming] = useState<UpcomingRun[]>([])
    const [history, setHistory] = useState<NotifLogEntry[]>([])
    const loaded = useRef(false)

  useEffect(() => {
    if (!scheduler || loaded.current) return
    loaded.current = true
    void scheduler.list().then(setItems)
      void scheduler.upcoming().then(setUpcoming)
      void notifLog?.get().then(entries => {
          setHistory(entries.filter(e => e.source === 'scheduler'))
    })

      const id = setInterval(() => {
          void scheduler?.upcoming().then(setUpcoming)
          void notifLog?.get().then(entries => {
              setHistory(entries.filter(e => e.source === 'scheduler'))
          })
      }, 15_000)
      return () => {
          clearInterval(id)
      }
  }, [])

  if (!scheduler) {
    return (
      <Section label="Scheduler">
        <p className="text-xs text-fg-ghost">Electron only.</p>
      </Section>
    )
  }

    async function refreshUpcoming() {
        const next = await scheduler?.upcoming()
        if (next) setUpcoming(next)
    }

  async function addOnce() {
    if (!scheduler) return
    const saved = await scheduler.add({
      id: randomId(), label: 'Once (5s)',
      schedule: { kind: 'once', at: new Date(Date.now() + 5_000).toISOString() },
      enabled: true, sound: 'chime', createdAt: new Date().toISOString(),
    })
    setItems(p => [...p, saved])
      void refreshUpcoming()
  }

  async function addInterval() {
    if (!scheduler) return
    const saved = await scheduler.add({
      id: randomId(), label: 'Interval (1 min)',
      schedule: { kind: 'interval', everyMinutes: 1 },
      enabled: true, createdAt: new Date().toISOString(),
    })
    setItems(p => [...p, saved])
      void refreshUpcoming()
  }

  async function remove(id: string) {
    if (!scheduler) return
    await scheduler.remove(id)
    setItems(p => p.filter(i => i.id !== id))
      void refreshUpcoming()
  }

  return (
    <Section label="Scheduler — survives minimize">
      <Row label="Create">
        <Btn onClick={() => { void addOnce() }}>Once (5s)</Btn>
        <Btn onClick={() => { void addInterval() }}>Interval (1 min)</Btn>
      </Row>
      {items.length > 0 && (
        <ul className="space-y-1">
          {items.map(i => (
            <li key={i.id} className="flex items-center gap-2 text-sm text-fg-secondary font-mono">
              <span className="flex-1">{i.label}</span>
              <Btn muted onClick={() => { void remove(i.id) }}>remove</Btn>
            </li>
          ))}
        </ul>
      )}
        {upcoming.length > 0 && (
            <div className="space-y-1 pt-2">
                <p className="text-2xs text-fg-ghost uppercase tracking-wider">Upcoming</p>
                <ul className="space-y-0.5">
                    {upcoming.map(u => (
                        <li key={u.id} className="flex items-center gap-2 text-xs text-fg-secondary font-mono">
                            <span className="flex-1">{u.label}</span>
                            <span className="text-fg-ghost">
                  {u.nextRun ? formatDistanceToNow(new Date(u.nextRun), {addSuffix: true}) : '—'}
                </span>
                        </li>
                    ))}
                </ul>
            </div>
        )}
        {history.length > 0 && (
            <div className="space-y-1 pt-2">
                <p className="text-2xs text-fg-ghost uppercase tracking-wider">History</p>
                <ul className="space-y-0.5">
                    {history.slice(0, 8).map(h => (
                        <li key={h.id} className="flex items-center gap-2 text-xs text-fg-ghost font-mono">
                            <span className="flex-1">{h.title}</span>
                            <span>{format(new Date(h.firedAt), 'HH:mm:ss')}</span>
                        </li>
                    ))}
                </ul>
            </div>
      )}
    </Section>
  )
}

// ── Missed Notifications ──────────────────────────────────────────────────────

function MissedNotificationsSection() {
  const [entries, setEntries] = useState<NotifLogEntry[]>([])
  const loaded = useRef(false)

  useEffect(() => {
    if (!notifLog || loaded.current) return
    loaded.current = true
    void notifLog.get().then(setEntries)
  }, [])

  if (!notifLog) {
    return (
      <Section label="Missed Notifications">
        <p className="text-xs text-fg-ghost">Electron only.</p>
      </Section>
    )
  }

  const unseenCount = entries.filter(e => !e.seen).length

  async function markAllSeen() {
    const updated = await notifLog?.markAllSeen()
    if (updated) setEntries(updated)
  }

  async function clear() {
    await notifLog?.clear()
    setEntries([])
  }

  return (
    <Section label="Missed Notifications">
      {entries.length > 0 && (
        <div className="flex items-center gap-2">
          {unseenCount > 0 && (
            <Btn onClick={() => { void markAllSeen() }}>
              Mark all seen{unseenCount > 0 ? ` (${unseenCount})` : ''}
            </Btn>
          )}
          <Btn muted onClick={() => { void clear() }}>Clear all</Btn>
        </div>
      )}

      {entries.length === 0 && (
        <p className="text-xs text-fg-ghost">No recent notifications.</p>
      )}

      <div className="space-y-2">
        <AnimatePresence initial={false}>
          {entries.map((entry) => (
            <motion.div
              key={entry.id}
              initial={{ opacity: 0, y: -6, scale: 0.98 }}
              animate={{ opacity: 1, y: 0,  scale: 1    }}
              exit={{    opacity: 0, x: 16, scale: 0.97 }}
              transition={{ duration: 0.18, ease: 'easeOut' }}
              className={`rounded-lg border px-3 py-2.5 space-y-1 transition-colors ${
                entry.seen
                  ? 'border-hair bg-transparent'
                  : 'border-subtle bg-raised'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <p className={`text-xs font-medium leading-snug ${entry.seen ? 'text-fg-ghost' : 'text-fg-primary'}`}>
                  {entry.title}
                </p>
                <span className="text-2xs text-fg-ghost shrink-0 tabular-nums">
                  {format(new Date(entry.firedAt), 'HH:mm')}
                </span>
              </div>

              {entry.body !== undefined && (
                <p className="text-2xs text-fg-muted leading-snug">{entry.body}</p>
              )}

              <div className="flex items-center gap-3">
                {entry.source !== undefined && (
                  <span className="text-2xs text-fg-ghost font-mono">{entry.source}</span>
                )}
                {(entry.actions?.length ?? 0) > 0 && (
                  <div className="flex gap-1.5">
                    {entry.actions?.map(a => (
                      <span key={a.id} className="text-2xs text-fg-ghost font-mono px-1.5 py-0.5 rounded border border-hair">{a.label}</span>
                    ))}
                  </div>
                )}
                {!entry.seen && (
                  <button
                    onClick={() => {
                      void notifLog?.markSeen(entry.id).then(updated => { setEntries(updated) })
                    }}
                    className="ml-auto text-2xs text-fg-ghost hover:text-fg-secondary transition-colors"
                  >
                    mark seen
                  </button>
                )}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </Section>
  )
}

// ── Fullscreen Clock ──────────────────────────────────────────────────────────

function FullscreenClock({onClose}: { onClose: () => void }) {
    const [time, setTime] = useState(() => format(new Date(), 'HH:mm:ss'))

    useEffect(() => {
        const id = setInterval(() => {
            setTime(format(new Date(), 'HH:mm:ss'))
        }, 1000)
        return () => {
            clearInterval(id)
        }
    }, [])

    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose()
        }
        window.addEventListener('keydown', handler)
        return () => {
            window.removeEventListener('keydown', handler)
        }
    }, [onClose])

    return (
        <motion.div
            initial={{opacity: 0}}
            animate={{opacity: 1}}
            exit={{opacity: 0}}
            onClick={onClose}
            className="fixed inset-0 z-50 flex items-center justify-center bg-base cursor-pointer"
        >
      <span className="font-mono text-[12vw] font-bold text-fg-primary tabular-nums tracking-tight select-none">
        {time}
      </span>
        </motion.div>
    )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function TimePage() {
    const [fullscreen, setFullscreen] = useState(false)

  return (
      <>
          <AnimatePresence>
              {fullscreen && <FullscreenClock onClose={() => {
                  setFullscreen(false)
              }}/>}
          </AnimatePresence>

          <div className="p-6 space-y-8 max-w-2xl">
              <div className="flex items-center justify-between">
                  <button
                      onClick={() => {
                          setFullscreen(true)
                      }}
                      className="px-4 py-2 rounded-md text-sm font-medium border border-hair text-fg-secondary hover:text-fg-primary hover:bg-hover transition-colors"
                  >
                      Fullscreen clock
                  </button>
              </div>
              <SoundSection/>
              <SectionDivider/>
              <NotificationSection/>
              <SectionDivider/>
              <ActionSection/>
              <SectionDivider/>
              <SchedulerSection/>
              <SectionDivider/>
              <MissedNotificationsSection/>
          </div>
      </>
  )
}

function SectionDivider() {
  return <div className="border-t border-hair" />
}
