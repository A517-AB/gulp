import { useEffect, useRef } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { X, Info, CheckCircle, AlertCircle, AlertTriangle } from 'lucide-react'
import { useNotifications, notify, type AppNotification } from '@/store/notifications'
import { notifications as notificationsIpc } from '@/shared/bridge'
import { cn } from '@/utils'

const ICONS = {
  info:    <Info className="h-4 w-4 shrink-0" />,
  success: <CheckCircle className="h-4 w-4 shrink-0" />,
  error:   <AlertCircle className="h-4 w-4 shrink-0" />,
  warning: <AlertTriangle className="h-4 w-4 shrink-0" />,
}

const COLORS = {
  info:    'text-blue-400',
  success: 'text-green-400',
  error:   'text-red-400',
  warning: 'text-yellow-400',
}

function Toast({ n }: { n: AppNotification }) {
  const dismiss = useNotifications((s) => s.dismiss)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (n.duration <= 0) return
    timerRef.current = setTimeout(() => { dismiss(n.id) }, n.duration)
    return () => { if (timerRef.current) clearTimeout(timerRef.current) }
  }, [n.id, n.duration, dismiss])

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 16, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 8, scale: 0.95 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
      className="w-80 rounded-lg bg-overlay border border-subtle shadow-xl overflow-hidden"
    >
      {n.duration > 0 && (
        <motion.div
          className={cn('h-[2px]', {
            'bg-blue-500':   n.type === 'info',
            'bg-green-500':  n.type === 'success',
            'bg-red-500':    n.type === 'error',
            'bg-yellow-500': n.type === 'warning',
          })}
          initial={{ scaleX: 1, originX: 0 }}
          animate={{ scaleX: 0 }}
          transition={{ duration: n.duration / 1000, ease: 'linear' }}
        />
      )}

      <div className="p-3 flex gap-3">
        <span className={cn('mt-0.5', COLORS[n.type])}>
          {ICONS[n.type]}
        </span>

        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-fg-primary leading-snug">{n.title}</p>
          {n.body && (
            <p className="text-[11px] text-fg-muted mt-0.5 leading-relaxed">{n.body}</p>
          )}
          {n.actions && n.actions.length > 0 && (
            <div className="flex gap-2 mt-2">
              {n.actions.map((action) => (
                <button
                  key={action.label}
                  onClick={() => { action.onClick(); dismiss(n.id) }}
                  className="text-[11px] font-mono uppercase tracking-wider px-2 py-1 rounded bg-raised border border-subtle text-fg-secondary hover:text-fg-primary hover:bg-hover transition-colors"
                >
                  {action.label}
                </button>
              ))}
            </div>
          )}
        </div>

        <button
          onClick={() => { dismiss(n.id) }}
          className="shrink-0 text-fg-ghost hover:text-fg-muted transition-colors mt-0.5"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    </motion.div>
  )
}

export function Notifications() {
  const notifications = useNotifications((s) => s.notifications)

  useEffect(() => {
    const ipc = notificationsIpc
    if (!ipc) return
    return ipc.onReceived((n) => {
      notify({
        type: 'info',
        title: n.title,
        ...(n.body     !== undefined ? { body:    n.body    } : {}),
        ...(n.sound    !== undefined ? { sound:   n.sound   } : {}),
        ...(n.channel  !== undefined ? { channel: n.channel } : {}),
        duration: 8000,
      })
    })
  }, [])

  return (
    <div className="fixed bottom-4 right-4 z-[9999] flex flex-col gap-2 items-end pointer-events-none">
      <AnimatePresence mode="sync">
        {notifications.map((n) => (
          <div key={n.id} className="pointer-events-auto">
            <Toast n={n} />
          </div>
        ))}
      </AnimatePresence>
    </div>
  )
}
