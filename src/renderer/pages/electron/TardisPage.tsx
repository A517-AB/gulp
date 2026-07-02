import {useEffect, useRef, useState} from 'react'
import {AnimatePresence, motion} from 'framer-motion'
import {scheduler} from '@shared/bridge'
import type {ScheduledItem, ScheduleInput, UINotifAction} from '@shared/electron'
import {AlertCircle, Bell, Clock, Edit2, Plus, Trash2, Volume2, X} from 'lucide-react'

function toLocalInputValue(d: Date): string {
    const pad = (n: number) => String(n).padStart(2, '0')
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

type ScheduleKind = 'once' | 'interval' | 'daily' | 'weekly'
type SoundId = 'none' | 'beep' | 'chime' | 'bell' | 'pulse'

type ActionPreset = 'snooze-10' | 'snooze-5' | 'snooze-30' | 'done'

interface CustomActionInput {
    preset: ActionPreset
    id: string
    label: string
    style: 'primary' | 'ghost'
}

export default function TardisPage() {
  const [items, setItems] = useState<ScheduledItem[]>([])

    // Modal visibility and edit state
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [editingId, setEditingId] = useState<string | null>(null)

    // Form Fields
    const [label, setLabel] = useState('')
    const [kind, setKind] = useState<ScheduleKind>('once')
    const [onceAt, setOnceAt] = useState('')
    const [minutes, setMinutes] = useState(15)
    const [time, setTime] = useState('09:00')
    const [dayOfWeek, setDayOfWeek] = useState<number>(1) // Monday
    const [sound, setSound] = useState<SoundId>('chime')
    const [color, setColor] = useState<string>('')

    const [hasLeadTime, setHasLeadTime] = useState(false)
    const [leadTimeMin, setLeadTimeMin] = useState(15)
    const [customActions, setCustomActions] = useState<CustomActionInput[]>([])

  const loaded = useRef(false)

    // Load schedules on mount
  useEffect(() => {
      if (!scheduler || loaded.current) return
    loaded.current = true

      scheduler.list()
          .then(setItems)
          .catch((err: unknown) => {
              console.error('[TardisPage] Failed to load reminders:', err)
          })
  }, [])

    // Open modal for a new reminder
    function openAddModal() {
        setEditingId(null)
        setLabel('')
        setKind('once')
        setOnceAt(toLocalInputValue(new Date(Date.now() + 15 * 60_000)))
        setMinutes(15)
        setTime('09:00')
        setDayOfWeek(1)
        setSound('chime')
        setColor('')
        setHasLeadTime(false)
        setLeadTimeMin(15)
        setCustomActions([])
        setIsModalOpen(true)
    }

    // Open modal to edit an existing reminder
    function openEditModal(item: ScheduledItem) {
        setEditingId(item.id)
        setLabel(item.label)
        if (item.schedule.kind === 'once' ||
            item.schedule.kind === 'interval' ||
            item.schedule.kind === 'daily' ||
            item.schedule.kind === 'weekly') {
            setKind(item.schedule.kind)
        }

        // Parse schedule configuration
        if (item.schedule.kind === 'once') {
            setOnceAt(toLocalInputValue(new Date(item.schedule.at)))
        } else if (item.schedule.kind === 'interval') {
            setMinutes(item.schedule.everyMinutes)
        } else if (item.schedule.kind === 'daily') {
            setTime(item.schedule.time)
        } else if (item.schedule.kind === 'weekly') {
            setTime(item.schedule.time)
            setDayOfWeek(item.schedule.dayOfWeek)
        }

        setSound((item.sound as SoundId) || 'none')
        setColor(item.color || '')
        setHasLeadTime(!!item.leadTimeMin)
        setLeadTimeMin(item.leadTimeMin || 15)

        const actionsMapped = (item.actions || []).map(a => {
            let preset: ActionPreset = 'snooze-10'
            if (a.id === 'snooze-10') preset = 'snooze-10'
            else if (a.id === 'snooze-5') preset = 'snooze-5'
            else if (a.id === 'snooze-30') preset = 'snooze-30'
            else if (a.id === 'done') preset = 'done'

            return {
                preset,
                id: a.id,
                label: a.label,
                style: a.style || 'primary'
            }
        })
        setCustomActions(actionsMapped)
        setIsModalOpen(true)
    }

    // Delete item
    async function handleDelete(id: string) {
    if (!scheduler) return
        try {
            await scheduler.remove(id)
            setItems(p => p.filter(i => i.id !== id && i.id !== `${id}_lead`))
        } catch (err) {
            console.error('[TardisPage] Delete failed:', err)
        }
  }

    // Toggle Muted / Active
    async function handleToggle(id: string, enabled: boolean) {
    if (!scheduler) return
        try {
            const updated = await scheduler.toggle(id, enabled)
            setItems(p => p.map(i => i.id === id ? updated : i))
        } catch (err) {
            console.error('[TardisPage] Toggle failed:', err)
        }
    }

    // Custom action field management
    function addActionField() {
        if (customActions.length >= 3) return
        setCustomActions(p => [...p, {preset: 'snooze-10', id: 'snooze-10', label: 'Snooze 10m', style: 'primary'}])
    }

    function removeActionField(idx: number) {
        setCustomActions(p => p.filter((_, i) => i !== idx))
    }

    // Preset configuration resolver
    function updateActionPreset(idx: number, preset: ActionPreset) {
        let id = ''
        let label = ''

        switch (preset) {
            case 'snooze-10':
                id = 'snooze-10'
                label = 'Snooze 10m'
                break
            case 'snooze-5':
                id = 'snooze-5'
                label = 'Snooze 5m'
                break
            case 'snooze-30':
                id = 'snooze-30'
                label = 'Snooze 30m'
                break
            case 'done':
                id = 'done'
                label = 'Mark Done'
                break
        }

        setCustomActions(p => p.map((act, i) => {
            if (i === idx) {
                return {...act, preset, id, label}
            }
            return act
        }))
    }

    function updateActionStyle(idx: number, style: 'primary' | 'ghost') {
        setCustomActions(p => p.map((act, i) => {
            if (i === idx) {
                return {...act, style}
            }
            return act
        }))
    }

    // Helper to build schedule
    function buildScheduleInput(): ScheduleInput {
        switch (kind) {
            case 'once':
                return {kind: 'once', at: new Date(onceAt).toISOString()}
            case 'interval':
                return {kind: 'interval', everyMinutes: minutes}
            case 'daily':
                return {kind: 'daily', time}
            case 'weekly':
                return {kind: 'weekly', time, dayOfWeek: dayOfWeek as any}
        }
  }

    // Form submit handler (both Add and Edit)
    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault()
        if (!scheduler || !label.trim()) return

        const schedule = buildScheduleInput()
        const actionsPayload: UINotifAction[] = customActions
            .filter(a => a.id.trim() && a.label.trim())
            .map(a => ({id: a.id.trim(), label: a.label.trim(), style: a.style}))

        const savedItem: ScheduledItem = {
            id: editingId || `rem-${Math.random().toString(36).slice(2, 10)}`,
            label: label.trim(),
            schedule,
            enabled: true,
            createdAt: new Date().toISOString()
        }

        if (sound !== 'none') savedItem.sound = sound
        if (hasLeadTime) savedItem.leadTimeMin = leadTimeMin
        if (actionsPayload.length > 0) savedItem.actions = actionsPayload
        if (color) savedItem.color = color

        try {
            const saved = await scheduler.add(savedItem)
            if (editingId) {
                setItems(p => p.map(i => i.id === editingId ? saved : i))
            } else {
                setItems(p => [...p, saved])
            }
            setIsModalOpen(false)
        } catch (err) {
            console.error('[TardisPage] Save failed:', err)
        }
    }

    const daysLabels = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

    return (
        <div className="flex-1 flex flex-col h-full bg-background overflow-hidden select-none font-sans">

            {/* Header */}
            <div className="px-8 pt-6 pb-4 border-b border-hair shrink-0 flex items-center justify-between">
                <div>
                    <h1 className="text-base font-bold text-fg-primary tracking-tight">
                        Tardis Reminders
                    </h1>
                    <p className="text-3xs text-fg-ghost mt-0.5">
                        Configure custom desktop notifications and system alarms that persist in the background.
                    </p>
                </div>

                <button
                    onClick={openAddModal}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-selected border border-hair text-fg-primary text-3xs font-semibold shadow-sm transition-all hover:bg-hover cursor-pointer"
                >
                    <Plus className="w-3.5 h-3.5"/>
                    New Reminder
                </button>
            </div>

            {/* Unified List View */}
            <div className="flex-1 overflow-y-auto px-8 py-6 space-y-6">

                {/* Active Reminders */}
                <div className="space-y-3">
                    <div className="flex items-center justify-between px-1">
                        <h2 className="text-3xs font-semibold uppercase tracking-widest text-fg-ghost">
                            Active Schedules ({items.length})
                        </h2>
                    </div>

                    {items.length === 0 ? (
                        <div
                            className="border border-dashed border-hair rounded-xl py-16 flex flex-col items-center justify-center text-center">
                            <Bell className="w-8 h-8 text-fg-ghost/20 mb-2"/>
                            <p className="text-3xs text-fg-ghost font-medium">No background schedules active.</p>
                            <button
                                onClick={openAddModal}
                                className="mt-2 text-3xs text-fg-secondary hover:text-fg-primary font-semibold transition-colors"
                            >
                                Create one now →
                            </button>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {items.map(item => {
                                const sched = item.schedule
                                const isOnce = sched.kind === 'once'
                                const isInterval = sched.kind === 'interval'
                                const isDaily = sched.kind === 'daily'
                                const isWeekly = sched.kind === 'weekly'

                                return (
                                    <div
                                        key={item.id}
                                        className={`group relative flex border border-hair rounded-xl p-4 bg-hover/20 hover:bg-hover/40 hover:border-subtle transition-all duration-200 ${
                                            !item.enabled ? 'opacity-60 border-dashed bg-hover/5' : ''
                                        }`}
                                        style={item.color ? {borderLeft: `3.5px solid ${item.color}`} : undefined}
                                    >
                                        <div className="flex-1 min-w-0 pr-12">
                                            <h3 className="text-xs font-semibold text-fg-primary truncate">{item.label}</h3>
                                            {item.body && (
                                                <p className="text-2xs text-fg-secondary mt-0.5 leading-normal line-clamp-2">{item.body}</p>
                                            )}

                                            <div
                                                className="flex flex-wrap items-center gap-x-4 gap-y-1.5 mt-3 pt-2.5 border-t border-hair/40">
                                                {/* Time Spec */}
                                                <div
                                                    className="flex items-center gap-1 text-3xs font-medium text-fg-ghost">
                                                    <Clock className="w-3 h-3 shrink-0"/>
                                                    {isOnce && <span>Once</span>}
                                                    {isInterval && sched.kind === 'interval' &&
                                                        <span>Every {sched.everyMinutes}m</span>}
                                                    {isDaily && sched.kind === 'daily' &&
                                                        <span>Daily @ {sched.time}</span>}
                                                    {isWeekly && sched.kind === 'weekly' && (
                                                        <span>
                              {daysLabels[sched.dayOfWeek]} @ {sched.time}
                            </span>
                                                    )}
                                                </div>

                                                {/* Sound Alert */}
                                                {item.sound && item.sound !== 'none' && (
                                                    <div
                                                        className="flex items-center gap-1 text-3xs font-medium text-fg-ghost">
                                                        <Volume2 className="w-3 h-3 shrink-0"/>
                                                        <span className="capitalize">{item.sound}</span>
                                                    </div>
                                                )}

                                                {/* Warning Early Alert */}
                                                {item.leadTimeMin && (
                                                    <div
                                                        className="flex items-center gap-1 text-3xs font-semibold text-fg-muted">
                                                        <AlertCircle className="w-3.5 h-3.5 shrink-0"/>
                                                        <span>-{item.leadTimeMin}m pre-alert</span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {/* Controls on hover */}
                                        <div
                                            className="absolute top-4 right-4 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button
                                                onClick={() => handleToggle(item.id, !item.enabled)}
                                                className={`px-1.5 py-0.5 rounded text-3xs font-bold border transition-colors cursor-pointer ${
                                                    item.enabled
                                                        ? 'bg-selected text-fg-primary border-hair hover:bg-hover'
                                                        : 'bg-raised text-fg-ghost border-hair hover:bg-hover'
                                                }`}
                                            >
                                                {item.enabled ? 'Active' : 'Muted'}
                                            </button>

                                            <button
                                                onClick={() => {
                                                    openEditModal(item);
                                                }}
                                                className="p-1 rounded text-fg-ghost hover:text-fg-primary hover:bg-hover transition-colors cursor-pointer"
                                                title="Edit Reminder"
                                            >
                                                <Edit2 className="w-3.5 h-3.5"/>
                                            </button>

                                            <button
                                                onClick={() => handleDelete(item.id)}
                                                className="p-1 rounded text-fg-ghost hover:text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer"
                                                title="Delete"
                                            >
                                                <Trash2 className="w-3.5 h-3.5"/>
                                            </button>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
          )}
                </div>
            </div>

            {/* Floating Add/Edit Modal */}
            <AnimatePresence>
                {isModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">

                        {/* Backdrop */}
                        <motion.div
                            initial={{opacity: 0}}
                            animate={{opacity: 1}}
                            exit={{opacity: 0}}
                            onClick={() => {
                                setIsModalOpen(false);
                            }}
                            className="absolute inset-0 bg-black/60"
                        />

                        {/* Dialog Container */}
                        <motion.div
                            initial={{opacity: 0, scale: 0.95, y: 15}}
                            animate={{opacity: 1, scale: 1, y: 0}}
                            exit={{opacity: 0, scale: 0.95, y: 15}}
                            transition={{duration: 0.2, ease: 'easeOut'}}
                            className="relative w-full max-w-md bg-overlay border border-hair rounded-2xl shadow-2xl overflow-hidden z-10 flex flex-col max-h-[85vh]"
                        >

                            {/* Header */}
                            <div className="px-6 py-4 border-b border-hair flex items-center justify-between shrink-0">
                                <h2 className="text-xs font-bold text-fg-primary">
                                    {editingId ? 'Edit Alarm Schedule' : 'New Alarm Schedule'}
                                </h2>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setIsModalOpen(false);
                                    }}
                                    className="p-1 rounded text-fg-ghost hover:text-fg-primary hover:bg-hover transition-colors cursor-pointer"
                                >
                                    <X className="w-4 h-4"/>
                                </button>
                            </div>

                            {/* Form Content */}
                            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-6 py-4 space-y-4">

                                {/* Title */}
                                <div className="space-y-1">
                                    <label
                                        className="text-3xs font-semibold text-fg-ghost uppercase tracking-wider block">
                                        Label
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        value={label}
                                        onChange={e => {
                                            setLabel(e.target.value);
                                        }}
                                        placeholder="E.g. Drink water, Code review..."
                                        className="w-full bg-hover border border-hair rounded-lg px-3 py-2 text-xs text-fg-primary placeholder-fg-ghost/30 focus:border-subtle outline-none transition-colors"
                                    />
                                </div>

                                {/* Schedule Tab Bar */}
                                <div className="space-y-2">
                                    <label
                                        className="text-3xs font-semibold text-fg-ghost uppercase tracking-wider block">
                                        Repeat Schedule
                                    </label>
                                    <div className="grid grid-cols-4 p-1 bg-hover border border-hair rounded-lg">
                                        {(['once', 'interval', 'daily', 'weekly'] as const).map(tab => (
                                            <button
                                                key={tab}
                                                type="button"
                                                onClick={() => {
                                                    setKind(tab);
                                                }}
                                                className={`py-1 rounded-md text-3xs font-semibold capitalize transition-all cursor-pointer ${
                                                    kind === tab
                                                        ? 'bg-selected text-fg-primary shadow-sm'
                                                        : 'text-fg-ghost hover:text-fg-secondary'
                                                }`}
                                            >
                                                {tab}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Dynamic Inputs depending on type */}
                                <div className="p-3.5 bg-hover/40 border border-hair/50 rounded-lg">
                                    {kind === 'once' && (
                                        <div className="flex items-center justify-between gap-3">
                                            <span className="text-2xs text-fg-secondary">Trigger at:</span>
                                            <input
                                                type="datetime-local"
                                                required
                                                value={onceAt}
                                                onChange={e => {
                                                    setOnceAt(e.target.value);
                                                }}
                                                className="bg-hover border border-hair rounded px-2.5 py-1 text-xs font-mono text-fg-primary focus:border-subtle outline-none"
                                            />
                                        </div>
                                    )}

                                    {kind === 'interval' && (
                                        <div className="flex items-center justify-between gap-3">
                                            <span className="text-2xs text-fg-secondary">Trigger repeat every:</span>
                                            <div className="flex items-center gap-1.5">
                                                <input
                                                    type="number"
                                                    min={1}
                                                    required
                                                    value={minutes}
                                                    onChange={e => {
                                                        setMinutes(Number(e.target.value));
                                                    }}
                                                    className="w-16 bg-hover border border-hair rounded px-2 py-1 text-xs font-mono text-center text-fg-primary focus:border-subtle outline-none"
                                                />
                                                <span className="text-2xs text-fg-ghost">minutes</span>
                                            </div>
                                        </div>
                                    )}

                                    {kind === 'daily' && (
                                        <div className="flex items-center justify-between gap-3">
                                            <span className="text-2xs text-fg-secondary">Trigger every day at:</span>
                                            <input
                                                type="time"
                                                required
                                                value={time}
                                                onChange={e => {
                                                    setTime(e.target.value);
                                                }}
                                                className="bg-hover border border-hair rounded px-2.5 py-1 text-xs font-mono text-fg-primary focus:border-subtle outline-none"
                                            />
                                        </div>
                                    )}

                                    {kind === 'weekly' && (
                                        <div className="space-y-3">
                                            <div className="flex items-center justify-between gap-3">
                                                <span className="text-2xs text-fg-secondary">Trigger weekly at:</span>
                                                <input
                                                    type="time"
                                                    required
                                                    value={time}
                                                    onChange={e => {
                                                        setTime(e.target.value);
                                                    }}
                                                    className="bg-hover border border-hair rounded px-2.5 py-1 text-xs font-mono text-fg-primary focus:border-subtle outline-none"
                                                />
                                            </div>

                                            <div className="space-y-1">
                        <span className="text-3xs font-semibold text-fg-ghost uppercase tracking-wider block">
                          Day of the week
                        </span>
                                                <div className="grid grid-cols-7 gap-1">
                                                    {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, idx) => (
                                                        <button
                                                            key={idx}
                                                            type="button"
                                                            onClick={() => {
                                                                setDayOfWeek(idx);
                                                            }}
                                                            className={`py-1 rounded text-3xs font-bold transition-all cursor-pointer ${
                                                                dayOfWeek === idx
                                                                    ? 'bg-selected border border-subtle text-fg-primary font-extrabold'
                                                                    : 'bg-hover text-fg-ghost hover:text-fg-secondary border border-hair'
                                                            }`}
                                                        >
                                                            {day}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Alarm Sound Selector */}
                                <div className="space-y-1.5">
                                    <label
                                        className="text-3xs font-semibold text-fg-ghost uppercase tracking-wider block">
                                        Alert Sound
                                    </label>
                                    <div className="flex flex-wrap gap-1.5">
                                        {(['none', 'chime'] as const).map(soundId => (
                                            <button
                                                key={soundId}
                                                type="button"
                                                onClick={() => {
                                                    setSound(soundId);
                                                }}
                                                className={`px-3 py-1 rounded-lg text-3xs font-semibold capitalize border transition-all cursor-pointer ${
                                                    sound === soundId
                                                        ? 'bg-selected text-fg-primary border-subtle'
                                                        : 'bg-hover text-fg-ghost border-hair hover:text-fg-secondary'
                                                }`}
                                            >
                                                {soundId === 'none' ? 'silent' : soundId}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Color Accent highlight */}
                                <div className="space-y-1.5">
                                    <label
                                        className="text-3xs font-semibold text-fg-ghost uppercase tracking-wider block">
                                        Color Accent Highlight
                                    </label>
                                    <div className="flex flex-wrap gap-2 items-center">
                                        {[
                                            {name: 'Default', value: ''},
                                            {name: 'Purple', value: 'oklch(0.65 0.22 310)'},
                                            {name: 'Blue', value: 'oklch(0.65 0.18 250)'},
                                            {name: 'Green', value: 'oklch(0.7 0.18 140)'},
                                            {name: 'Red', value: 'oklch(0.6 0.2 25)'},
                                            {name: 'Orange', value: 'oklch(0.7 0.18 45)'}
                                        ].map(c => (
                                            <button
                                                key={c.name}
                                                type="button"
                                                onClick={() => {
                                                    setColor(c.value);
                                                }}
                                                className={`px-2.5 py-1 rounded border text-3xs font-semibold transition-all cursor-pointer ${
                                                    color === c.value
                                                        ? 'bg-selected text-fg-primary border-subtle'
                                                        : 'bg-hover text-fg-ghost border-hair hover:text-fg-secondary'
                                                }`}
                                            >
                                                {c.name}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Pre-alert trigger Option */}
                                <div className="space-y-2 pt-2 border-t border-hair/40">
                                    <div className="flex items-center justify-between">
                                        <label
                                            className="text-2xs font-semibold text-fg-secondary flex items-center gap-1">
                                            <AlertCircle className="w-3.5 h-3.5 text-fg-ghost"/>
                                            Trigger Warning Early
                                        </label>
                                        <input
                                            type="checkbox"
                                            checked={hasLeadTime}
                                            onChange={e => {
                                                setHasLeadTime(e.target.checked);
                                            }}
                                            className="w-4 h-4 accent-fg-primary border-hair rounded cursor-pointer"
                                        />
                                    </div>

                                    {hasLeadTime && (
                                        <div
                                            className="flex items-center justify-between pl-4.5 pr-2 py-1 bg-hover/20 rounded">
                                            <span className="text-3xs text-fg-ghost">Warning lead time:</span>
                                            <div className="flex items-center gap-1">
                                                <input
                                                    type="number"
                                                    min={1}
                                                    max={120}
                                                    value={leadTimeMin}
                                                    onChange={e => {
                                                        setLeadTimeMin(Number(e.target.value));
                                                    }}
                                                    className="w-12 bg-hover border border-hair rounded px-1.5 py-0.5 text-3xs font-mono text-center text-fg-primary outline-none"
                                                />
                                                <span className="text-3xs text-fg-ghost">minutes</span>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Custom Action Buttons */}
                                <div className="space-y-2 pt-2 border-t border-hair/40">
                                    <div className="flex items-center justify-between">
                                        <label className="text-2xs font-semibold text-fg-secondary">
                                            Custom Notification Buttons ({customActions.length}/3)
                                        </label>
                                        <button
                                            type="button"
                                            disabled={customActions.length >= 3}
                                            onClick={addActionField}
                                            className="text-3xs text-fg-secondary hover:text-fg-primary font-bold disabled:opacity-40 cursor-pointer"
                                        >
                                            + Button
                                        </button>
                                    </div>

                                    {customActions.length > 0 && (
                                        <div className="space-y-2 max-h-36 overflow-y-auto pr-1">
                                            {customActions.map((action, idx) => (
                                                <div key={idx} className="flex gap-1.5 items-center">
                                                    {/* Preset Selection Dropdown */}
                                                    <select
                                                        value={action.preset}
                                                        onChange={e => {
                                                            updateActionPreset(idx, e.target.value as ActionPreset);
                                                        }}
                                                        className="bg-hover border border-hair rounded px-1.5 py-1 text-3xs text-fg-primary focus:border-subtle outline-none"
                                                    >
                                                        <option value="snooze-10">Snooze 10m</option>
                                                        <option value="snooze-5">Snooze 5m</option>
                                                        <option value="snooze-30">Snooze 30m</option>
                                                        <option value="done">Mark Done</option>
                                                    </select>

                                                    <span className="flex-1 text-3xs text-fg-ghost italic px-1">
                              {action.label} ({action.id})
                            </span>

                                                    {/* Accent/Ghost Style select */}
                                                    <select
                                                        value={action.style}
                                                        onChange={e => {
                                                            updateActionStyle(idx, e.target.value as 'primary' | 'ghost');
                                                        }}
                                                        className="bg-hover border border-hair rounded px-1.5 py-1 text-3xs text-fg-ghost focus:border-subtle outline-none"
                                                    >
                                                        <option value="primary">accent</option>
                                                        <option value="ghost">ghost</option>
                                                    </select>

                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            removeActionField(idx);
                                                        }}
                                                        className="text-fg-ghost hover:text-red-400 p-1 transition-colors cursor-pointer"
                                                    >
                                                        ×
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                {/* Submit / Action Buttons */}
                                <div className="pt-4 border-t border-hair flex items-center justify-end gap-2 shrink-0">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setIsModalOpen(false);
                                        }}
                                        className="px-4 py-2 rounded-lg border border-hair bg-hover/20 hover:bg-hover text-fg-secondary text-3xs font-semibold transition-colors cursor-pointer"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={!label.trim()}
                                        className="px-4 py-2 rounded-lg bg-selected border border-hair text-fg-primary hover:bg-hover text-3xs font-semibold transition-colors disabled:opacity-45 disabled:cursor-not-allowed cursor-pointer"
                                    >
                                        {editingId ? 'Update Reminder' : 'Create Reminder'}
                                    </button>
                                </div>

                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

    </div>
  )
}
