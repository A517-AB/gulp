import { toast } from 'sonner'
import { playSound, alarmLoop } from './sounds'
import { useHubStore } from './store'
import { notifications as notificationsIpc } from '@shared/bridge'
import type { HubNotification } from '@shared/hub'

/**
 * Central dispatch — call this from anywhere (alarms, reminders, timer, sessions).
 * Plays sound, shows Sonner toast, pushes to the store, and forwards to OS if needed.
 */
export function dispatch(n: HubNotification): void {
  // store (for history / badge counts later)
  useHubStore.getState().add(n)

  // sound
  if (n.sound && n.sound !== 'none') {
    if (n.channel === 'alarm' || n.channel === 'reminder') {
      alarmLoop.play(n.id, n.sound)
    } else {
      void playSound(n.sound)
    }
  }

  // toast
  toast.custom(
    (toastId) => {
      const dismiss = () => {
        toast.dismiss(toastId)
        alarmLoop.stop(n.id)
        useHubStore.getState().dismiss(n.id)
      }
      return <HubToast n={n} dismiss={dismiss} toastId={toastId} />
    },
    {
      id:          n.id,
      duration:    n.channel === 'alarm' || n.channel === 'reminder' ? Infinity : 6000,
      position:    'top-right',
    },
  )

  // forward to OS for alarm/reminder channels
  notificationsIpc?.send(n)
}

// ── HubToast ──────────────────────────────────────────────────────────────────

import { alarms as alarmsIpc, reminders as remindersIpc } from '@shared/bridge'

const ICONS: Record<HubNotification['channel'], string> = {
  alarm:    '⏰',
  reminder: '🔔',
  session:  '🤖',
  system:   '⚙️',
}

function HubToast({
  n,
  dismiss,
}: {
  n: HubNotification
  dismiss: () => void
  toastId: string | number
}) {
  const handleAction = async (action: string) => {
    try {
      if (action === 'snooze' && n.channel === 'alarm' && n.meta?.['alarmId']) {
        const mins = parseInt(n.meta['snoozeMinutes'] ?? '5', 10)
        await alarmsIpc?.snooze(n.meta['alarmId'], mins)
      } else if (action === 'done' && n.channel === 'reminder' && n.meta?.['reminderId']) {
        await remindersIpc?.done(n.meta['reminderId'])
      }
    } finally {
      dismiss()
    }
  }

  return (
    <div className="flex items-start gap-3 w-80 rounded-lg border border-border bg-surface px-4 py-3 shadow-lg">
      <span className="mt-0.5 text-base leading-none select-none">{ICONS[n.channel]}</span>
      <div className="flex-1 min-w-0 flex flex-col gap-2">
        <div>
          <p className="text-sm font-medium text-fg-primary truncate">{n.title}</p>
          {n.body && (
            <p className="text-xs text-fg-secondary mt-0.5 line-clamp-2">{n.body}</p>
          )}
        </div>
        {n.actions && n.actions.length > 0 && (
          <div className="flex items-center gap-2">
            {n.actions.map((action) => (
              <button
                key={action}
                onClick={() => { void handleAction(action) }}
                className="px-3 py-1.5 text-xs font-medium rounded-md bg-secondary text-fg-primary hover:bg-secondary/80 transition-colors capitalize"
              >
                {action}
              </button>
            ))}
          </div>
        )}
      </div>
      <button
        onClick={dismiss}
        className="mt-0.5 text-fg-secondary hover:text-fg-primary transition-colors shrink-0 text-xs"
        aria-label="Dismiss"
      >
        ✕
      </button>
    </div>
  )
}
