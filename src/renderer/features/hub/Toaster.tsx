import { useEffect } from 'react'
import { Toaster } from 'sonner'
import { useTheme } from '@renderer/providers/theme'
import { notifications as notificationsIpc } from '@shared/bridge'
import { dispatch } from './bus'

/** Mount once at the root. Listens for IPC notifications and drives Sonner. */
export function HubToaster() {
  const { theme } = useTheme()

  useEffect(() => {
    const ipc = notificationsIpc
    if (!ipc) return
    return ipc.onReceived((n) => { dispatch(n) })
  }, [])

  // dev-only: Ctrl+Shift+T fires a test notification
  useEffect(() => {
    if (import.meta.env.PROD) return
    const handler = (e: KeyboardEvent) => {
      if (e.repeat || !e.ctrlKey || !e.shiftKey || e.key !== 'T') return
      dispatch({
        id:        crypto.randomUUID(),
        channel:   'alarm',
        title:     'Test alarm',
        body:      'Ctrl+Shift+T',
        sound:     'chime',
        actions:   ['dismiss', 'snooze'],
        meta:      { alarmId: 'test', snoozeMinutes: '1' },
        timestamp: new Date().toISOString(),
      })
    }
    window.addEventListener('keydown', handler)
    return () => { window.removeEventListener('keydown', handler) }
  }, [])

  return (
    <Toaster
      theme={theme as 'light' | 'dark'}
      position="top-right"
      visibleToasts={5}
      toastOptions={{ unstyled: true, classNames: { toast: '' } }}
      gap={8}
    />
  )
}
