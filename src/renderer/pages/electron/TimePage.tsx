import type { ReactNode } from 'react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { format } from 'date-fns'
import { BrowserSoundController } from '@notification/sounds'
import { useNotification } from '@/library/notification'
import { scheduler } from '@shared/bridge'
import type { ScheduledItem } from '@shared/electron'

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
    onClick:  (d) => { append(`click → ${JSON.stringify(d)}`) },
    onCancel: (d) => { append(`cancel → ${JSON.stringify(d)}`) },
  })

  return (
    <Section label="Actions">
      <Row label="Variants">
        <Btn onClick={() => {
          notify({ title: 'New message', body: 'From Alex', action: { label: 'View' }, extraData: 'view' })
        }}>Action only</Btn>
        <Btn onClick={() => {
          success({ title: 'Export ready', body: 'report.pdf', action: { label: 'Open' }, cancel: { label: 'Dismiss' }, extraData: 'open' })
        }}>Action + cancel</Btn>
        <Btn onClick={() => {
          info({ title: 'Stand-up in 5 min', action: { label: 'Got it' }, cancel: { label: 'Snooze 10m' }, sound: 'pulse', extraData: 'standup' })
        }}>With snooze + sound</Btn>
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
  const [fired, setFired] = useState<string[]>([])
  const loaded            = useRef(false)

  useEffect(() => {
    if (!scheduler || loaded.current) return
    loaded.current = true
    void scheduler.list().then(setItems)
    return scheduler.onFired((item) => {
      setFired(p => [`${item.label} @ ${format(new Date(), 'HH:mm:ss')}`, ...p].slice(0, 5))
      setItems(p => p.filter(i => i.id !== item.id))
    })
  }, [])

  if (!scheduler) {
    return (
      <Section label="Scheduler">
        <p className="text-xs text-fg-ghost">Electron only.</p>
      </Section>
    )
  }

  async function addOnce() {
    if (!scheduler) return
    const saved = await scheduler.add({
      id: randomId(), label: 'Once (5s)',
      schedule: { kind: 'once', at: new Date(Date.now() + 5_000).toISOString() },
      enabled: true, sound: 'chime', createdAt: new Date().toISOString(),
    })
    setItems(p => [...p, saved])
  }

  async function addInterval() {
    if (!scheduler) return
    const saved = await scheduler.add({
      id: randomId(), label: 'Interval (1 min)',
      schedule: { kind: 'interval', everyMinutes: 1 },
      enabled: true, createdAt: new Date().toISOString(),
    })
    setItems(p => [...p, saved])
  }

  async function remove(id: string) {
    if (!scheduler) return
    await scheduler.remove(id)
    setItems(p => p.filter(i => i.id !== id))
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
      {fired.length > 0 && (
        <ul className="space-y-0.5 pt-1">
          {fired.map((entry, i) => (
            <li key={i} className="text-xs text-fg-ghost font-mono">{entry}</li>
          ))}
        </ul>
      )}
    </Section>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function TimePage() {
  return (
    <div className="p-6 space-y-8 max-w-2xl">
      <SoundSection />
      <SectionDivider />
      <NotificationSection />
      <SectionDivider />
      <ActionSection />
      <SectionDivider />
      <SchedulerSection />
    </div>
  )
}

function SectionDivider() {
  return <div className="border-t border-hair" />
}
