import { useEffect } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { X, BellRing } from 'lucide-react'
import { alarms as alarmsIpc, notifications as notificationsIpc } from '@shared/bridge'
import { useNotifications, playAlarmBeep, alarmAudio } from '@/store/notifications'
import type { AppNotification } from '@shared/notifications'

const CHANNEL_ICONS: Record<AppNotification['channel'], string> = {
  alarm:    '⏰',
  session:  '🤖',
  reminder: '🔔',
  system:   '⚙️',
  chat:     '💬',
}

const AUTO_DISMISS_MS = 8_000

function Toast({ item }: { item: AppNotification }) {
  const dismiss = useNotifications((s) => s.dismiss)

  useEffect(() => {
    if (item.channel === 'alarm') return;
    const t = setTimeout(() => dismiss(item.id), AUTO_DISMISS_MS)
    return () => clearTimeout(t)
  }, [item.id, dismiss, item.channel])

  useEffect(() => {
    return () => {
      if (item.channel === 'alarm') {
        alarmAudio.stop(item.id)
      }
    }
  }, [item.id, item.channel])

  const handleAction = async (action: string) => {
    if (item.channel === 'alarm' && action === 'snooze' && item.meta?.alarmId) {
      const minutes = parseInt(item.meta.snoozeMinutes || '5', 10)
      await alarmsIpc?.snooze(item.meta.alarmId, minutes)
      dismiss(item.id)
    } else if (action === 'dismiss') {
      dismiss(item.id)
    }
  }

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -12, scale: 0.96 }}
      animate={{ opacity: 1, y: 0,   scale: 1     }}
      exit={{    opacity: 0, y: -8,  scale: 0.96  }}
      transition={{ duration: 0.18 }}
      className="flex items-start gap-3 w-80 rounded-lg border border-border bg-surface px-4 py-3 shadow-lg"
    >
      <span className="mt-0.5 text-base leading-none select-none">
        {CHANNEL_ICONS[item.channel] ?? <BellRing size={14} />}
      </span>
      <div className="flex-1 min-w-0 flex flex-col gap-2">
        <div>
          <p className="text-sm font-medium text-fg-primary truncate">{item.title}</p>
          {item.body && (
            <p className="text-xs text-fg-secondary mt-0.5 line-clamp-2">{item.body}</p>
          )}
        </div>
        {item.actions && item.actions.length > 0 && (
          <div className="flex items-center gap-2 mt-1">
            {item.actions.map(action => (
              <button
                key={action}
                onClick={() => handleAction(action)}
                className="px-3 py-1.5 text-xs font-medium rounded-md bg-secondary text-fg-primary hover:bg-secondary/80 transition-colors capitalize cursor-pointer pointer-events-auto"
              >
                {action}
              </button>
            ))}
          </div>
        )}
      </div>
      <button
        onClick={() => dismiss(item.id)}
        className="mt-0.5 text-fg-secondary hover:text-fg-primary transition-colors shrink-0"
        aria-label="Dismiss"
      >
        <X size={14} />
      </button>
    </motion.div>
  )
}

/** Mount once at the root layout — listens for IPC notifications and renders toasts. */
export function NotificationToast() {
  const { add, items } = useNotifications()

  useEffect(() => {
    const ipc = notificationsIpc
    if (!ipc) return
    return ipc.onReceived((n) => {
      add(n)
      if (n.sound && n.channel === 'alarm') {
        alarmAudio.play(n.id)
      } else if (n.sound) {
        playAlarmBeep()
      }
    })
  }, [add])

  return (
    <div className="fixed top-14 right-4 z-50 flex flex-col gap-2 pointer-events-none">
      <AnimatePresence initial={false} mode="popLayout">
        {items.map((item) => (
          <div key={item.id} className="pointer-events-auto">
            <Toast item={item} />
          </div>
        ))}
      </AnimatePresence>
    </div>
  )
}
