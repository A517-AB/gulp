import { useState } from 'react'
import { AlarmsList } from '@/features/hub/alarms/AlarmsList'
import { RemindersList } from '@/features/hub/reminders/RemindersList'
import { TimerView } from '@/features/hub/timer/TimerView'
import { cn } from '@/utils'

type Tab = 'alarms' | 'reminders' | 'timer'

const TABS: { id: Tab; label: string }[] = [
  { id: 'alarms',    label: 'Alarms' },
  { id: 'reminders', label: 'Reminders' },
  { id: 'timer',     label: 'Timer' },
]

export default function HubPage() {
  const [tab, setTab] = useState<Tab>('alarms')

  return (
    <div className="w-full h-full overflow-y-auto">
      <div className="max-w-xl mx-auto px-6 pt-8 pb-20">

        <div className="flex gap-1 mb-8 p-1 rounded-lg bg-surface border border-border">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => { setTab(t.id) }}
              className={cn(
                'flex-1 py-1.5 text-sm rounded-md transition-colors',
                tab === t.id
                  ? 'bg-active text-fg-primary font-medium'
                  : 'text-fg-secondary hover:text-fg-primary',
              )}
            >
              {t.label}
            </button>
          ))}
        </div>

        {tab === 'alarms'    && <AlarmsList />}
        {tab === 'reminders' && <RemindersList />}
        {tab === 'timer'     && (
          <div className="pt-4">
            <TimerView />
          </div>
        )}

      </div>
    </div>
  )
}
