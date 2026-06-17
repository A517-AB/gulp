import { useState } from 'react'
import { useNotification } from '@/library/notification'

const SOUNDS = ['none', 'pulse', 'chime', 'alert', 'soft']
const DURATIONS = [3000, 5000, 8000, 12000, 0]
const DURATION_LABELS: Record<number, string> = { 3000: '3s', 5000: '5s', 8000: '8s', 12000: '12s', 0: 'persistent' }

export function NotificationPanel() {
  const { notify } = useNotification()
  const [sound, setSound] = useState('chime')
  const [duration, setDuration] = useState(5000)

  const test = () => {
    notify({
      title: 'Test notification',
      body: 'This is what your notifications look like.',
      sound: sound as never,
      duration,
      id: 'notif-test',
    })
  }

  return (
    <div className="space-y-6 text-[11px] font-mono">
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-fg-secondary">Default sound</span>
          <select
            value={sound}
            onChange={e => { setSound(e.target.value) }}
            className="bg-hover border border-hair rounded px-2 py-1 text-[10px] text-fg-primary outline-none focus:border-purple-500/40"
          >
            {SOUNDS.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-fg-secondary">Default duration</span>
          <select
            value={duration}
            onChange={e => { setDuration(Number(e.target.value)) }}
            className="bg-hover border border-hair rounded px-2 py-1 text-[10px] text-fg-primary outline-none focus:border-purple-500/40"
          >
            {DURATIONS.map(d => <option key={d} value={d}>{DURATION_LABELS[d]}</option>)}
          </select>
        </div>
      </div>

      <button
        onClick={test}
        className="px-4 py-1.5 rounded border border-hair text-[10px] font-mono text-fg-secondary hover:text-fg-primary hover:border-subtle transition-colors"
      >
        Send test notification
      </button>
    </div>
  )
}
