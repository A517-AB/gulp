import type { ReactNode } from 'react'
import { Settings2 } from 'lucide-react'
import { usePowerSettings, useAlarmSettings, useNotificationSettings } from '@/hooks/use-settings'
import { useSettingsStore } from '@/store/settings'
import type { Deadline } from '@/types/settings'

function SectionHeader({ title }: { title: string }) {
  return (
    <div className="flex items-center gap-3 mb-4">
      <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-fg-dim">{title}</span>
      <div className="flex-1 h-px bg-hair" />
    </div>
  )
}

function Row({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-hair last:border-0">
      <div>
        <p className="text-xs font-semibold text-fg-primary">{label}</p>
        {hint && <p className="text-[10px] text-fg-dim mt-0.5">{hint}</p>}
      </div>
      <div className="flex items-center gap-2 ml-4 shrink-0">{children}</div>
    </div>
  )
}

function Toggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => { onChange(!value) }}
      className={`relative w-9 h-5 rounded-full transition-colors duration-200 ${value ? 'bg-blue-500' : 'bg-surface border border-subtle'}`}
    >
      <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform duration-200 ${value ? 'translate-x-4' : 'translate-x-0'}`} />
    </button>
  )
}

function NumberInput({ value, onChange, min, max, suffix }: {
  value: number; onChange: (v: number) => void; min?: number; max?: number; suffix?: string
}) {
  return (
    <div className="flex items-center gap-1.5">
      <input
        type="number"
        value={value}
        min={min}
        max={max}
        onChange={(e) => { onChange(Number(e.target.value)) }}
        className="w-16 h-7 px-2 rounded bg-surface border border-subtle text-xs font-mono text-fg-primary text-right focus:outline-none focus:border-moderate transition-colors"
      />
      {suffix && <span className="text-[10px] text-fg-dim font-mono">{suffix}</span>}
    </div>
  )
}

function TimeInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <input
      type="time"
      value={value}
      onChange={(e) => { onChange(e.target.value) }}
      className="h-7 px-2 rounded bg-surface border border-subtle text-xs font-mono text-fg-primary focus:outline-none focus:border-moderate transition-colors"
    />
  )
}

// ── Sections ──────────────────────────────────────────────────────────────────

function PowerSection() {
  const [power, setPower] = usePowerSettings()

  return (
    <div className="mb-8">
      <SectionHeader title="Power" />
      <Row label="Auto low-power on idle" hint="Enter low-power mode after inactivity">
        <NumberInput
          value={power.autoEnterIdleMs ? power.autoEnterIdleMs / 60000 : 0}
          onChange={(v) => { setPower({ autoEnterIdleMs: v > 0 ? v * 60000 : null }) }}
          min={0}
          suffix="min"
        />
        <Toggle
          value={power.autoEnterIdleMs !== null}
          onChange={(v) => { setPower({ autoEnterIdleMs: v ? 15 * 60000 : null }) }}
        />
      </Row>
      <Row label="Auto low-power at time" hint="Enter low-power at a specific time daily">
        {power.autoEnterAtTime !== null && (
          <TimeInput
            value={power.autoEnterAtTime}
            onChange={(v) => { setPower({ autoEnterAtTime: v }) }}
          />
        )}
        <Toggle
          value={power.autoEnterAtTime !== null}
          onChange={(v) => { setPower({ autoEnterAtTime: v ? '22:00' : null }) }}
        />
      </Row>
      <Row label="Auto-exit on activity" hint="Wake from low-power on mouse or keyboard">
        <Toggle value={power.autoExitOnActivity} onChange={(v) => { setPower({ autoExitOnActivity: v }) }} />
      </Row>
    </div>
  )
}

function AlarmSection() {
  const [alarms, setAlarms] = useAlarmSettings()

  const addDeadline = () => {
    const d: Deadline = { id: crypto.randomUUID(), label: 'New deadline', targetMs: Date.now() + 86400000 }
    setAlarms({ deadline: { ...alarms.deadline, deadlines: [...alarms.deadline.deadlines, d] } })
  }

  const removeDeadline = (id: string) => {
    setAlarms({ deadline: { ...alarms.deadline, deadlines: alarms.deadline.deadlines.filter(d => d.id !== id) } })
  }

  const patchDeadline = (id: string, patch: Partial<Deadline>) => {
    setAlarms({
      deadline: {
        ...alarms.deadline,
        deadlines: alarms.deadline.deadlines.map(d => d.id === id ? { ...d, ...patch } : d),
      }
    })
  }

  return (
    <div className="mb-8">
      <SectionHeader title="Alarms" />

      <Row label="Focus timer" hint={`${String(alarms.focusTimer.workMinutes)} min work / ${String(alarms.focusTimer.breakMinutes)} min break`}>
        <NumberInput value={alarms.focusTimer.workMinutes} min={1} suffix="work"
          onChange={(v) => { setAlarms({ focusTimer: { ...alarms.focusTimer, workMinutes: v } }) }} />
        <NumberInput value={alarms.focusTimer.breakMinutes} min={1} suffix="break"
          onChange={(v) => { setAlarms({ focusTimer: { ...alarms.focusTimer, breakMinutes: v } }) }} />
        <Toggle value={alarms.focusTimer.enabled}
          onChange={(v) => { setAlarms({ focusTimer: { ...alarms.focusTimer, enabled: v } }) }} />
      </Row>

      <Row label="Break reminder" hint="Nudge to step away periodically">
        <NumberInput value={alarms.breakReminder.intervalMinutes} min={5} suffix="min"
          onChange={(v) => { setAlarms({ breakReminder: { ...alarms.breakReminder, intervalMinutes: v } }) }} />
        <Toggle value={alarms.breakReminder.enabled}
          onChange={(v) => { setAlarms({ breakReminder: { ...alarms.breakReminder, enabled: v } }) }} />
      </Row>

      <Row label="Eye strain (20-20-20)" hint="Look 20ft away for 20 sec every 20 min">
        <Toggle value={alarms.eyeStrain.enabled}
          onChange={(v) => { setAlarms({ eyeStrain: { enabled: v } }) }} />
      </Row>

      <Row label="Hydration reminder" hint="Drink water">
        <NumberInput value={alarms.hydration.intervalMinutes} min={5} suffix="min"
          onChange={(v) => { setAlarms({ hydration: { ...alarms.hydration, intervalMinutes: v } }) }} />
        <Toggle value={alarms.hydration.enabled}
          onChange={(v) => { setAlarms({ hydration: { ...alarms.hydration, enabled: v } }) }} />
      </Row>

      <Row label="End of day" hint="Alert when it's time to stop">
        {alarms.endOfDay.enabled && (
          <TimeInput value={alarms.endOfDay.time}
            onChange={(v) => { setAlarms({ endOfDay: { ...alarms.endOfDay, time: v } }) }} />
        )}
        <Toggle value={alarms.endOfDay.enabled}
          onChange={(v) => { setAlarms({ endOfDay: { ...alarms.endOfDay, enabled: v } }) }} />
      </Row>

      <Row label="Jules session watchdog" hint="Alert when a session runs too long">
        <NumberInput value={alarms.julesWatchdog.maxSessionMinutes} min={5} suffix="min"
          onChange={(v) => { setAlarms({ julesWatchdog: { ...alarms.julesWatchdog, maxSessionMinutes: v } }) }} />
        <Toggle value={alarms.julesWatchdog.enabled}
          onChange={(v) => { setAlarms({ julesWatchdog: { ...alarms.julesWatchdog, enabled: v } }) }} />
      </Row>

      {/* Deadlines */}
      <div className="mt-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[10px] font-mono text-fg-dim uppercase tracking-wider">Deadlines</span>
          <button
            onClick={addDeadline}
            className="text-[10px] font-mono uppercase tracking-wider text-fg-muted hover:text-fg-primary transition-colors"
          >
            + Add
          </button>
        </div>
        {alarms.deadline.deadlines.map((d) => (
          <div key={d.id} className="flex items-center gap-2 py-2 border-b border-hair last:border-0">
            <input
              value={d.label}
              onChange={(e) => { patchDeadline(d.id, { label: e.target.value }) }}
              className="flex-1 h-7 px-2 rounded bg-surface border border-subtle text-xs text-fg-primary focus:outline-none focus:border-moderate transition-colors"
            />
            <input
              type="datetime-local"
              value={new Date(d.targetMs).toISOString().slice(0, 16)}
              onChange={(e) => { patchDeadline(d.id, { targetMs: new Date(e.target.value).getTime() }) }}
              className="h-7 px-2 rounded bg-surface border border-subtle text-xs font-mono text-fg-primary focus:outline-none focus:border-moderate transition-colors"
            />
            <button onClick={() => { removeDeadline(d.id) }}
              className="text-fg-ghost hover:text-red-400 transition-colors text-xs font-mono">✕</button>
          </div>
        ))}
      </div>
    </div>
  )
}

function NotificationsSection() {
  const [notifications, setNotifications] = useNotificationSettings()

  return (
    <div className="mb-8">
      <SectionHeader title="Notifications" />
      <Row label="Default duration" hint="How long toasts stay visible (0 = until dismissed)">
        <NumberInput
          value={notifications.defaultDurationMs / 1000}
          min={0}
          suffix="sec"
          onChange={(v) => { setNotifications({ defaultDurationMs: v * 1000 }) }}
        />
      </Row>
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function SettingsPage(): ReactNode {
  const reset = useSettingsStore((s) => s.reset)

  return (
    <div className="flex flex-col h-full p-6 overflow-hidden max-w-2xl mx-auto w-full">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-md bg-surface border border-subtle flex items-center justify-center">
            <Settings2 className="h-4 w-4 text-fg-muted" />
          </div>
          <div>
            <h2 className="text-lg font-bold tracking-tight text-fg-primary uppercase">Settings</h2>
            <p className="text-[10px] text-fg-dim font-mono uppercase tracking-widest">app-settings</p>
          </div>
        </div>
        <button
          onClick={reset}
          className="text-[10px] font-mono uppercase tracking-wider text-fg-ghost hover:text-red-400 transition-colors"
        >
          Reset all
        </button>
      </div>

      <div className="flex-1 overflow-auto pr-2 pb-12">
        <PowerSection />
        <AlarmSection />
        <NotificationsSection />
      </div>
    </div>
  )
}
