import { useEffect, useEffectEvent } from 'react'
import { uiNotification } from '@shared/bridge'
import type { NotificationPayload, UseNotificationOptions, UseNotificationResult } from './types'
import { getDefaults } from './defaults'

function withDefaults(p: NotificationPayload): NotificationPayload {
  const d = getDefaults()
  return {
    sound:    d.sound,
    duration: d.duration,
    ...p,
  }
}

export function useNotification({ onAction }: UseNotificationOptions = {}): UseNotificationResult {
  const handleAction = useEffectEvent((actionId: string, extraData: unknown) => { onAction?.(actionId, extraData) })

  useEffect(() => {
    if (!uiNotification) return
    const off = uiNotification.onAction(handleAction)
    return () => { off() }
  }, [])

  return {
    notify:  (p: NotificationPayload) => { uiNotification?.show({ ...withDefaults(p), type: 'default' }) },
    success: (p: NotificationPayload) => { uiNotification?.show({ ...withDefaults(p), type: 'success' }) },
    error:   (p: NotificationPayload) => { uiNotification?.show({ ...withDefaults(p), type: 'error'   }) },
    info:    (p: NotificationPayload) => { uiNotification?.show({ ...withDefaults(p), type: 'info'    }) },
    warning: (p: NotificationPayload) => { uiNotification?.show({ ...withDefaults(p), type: 'warning' }) },
    dismiss: ()                       => { uiNotification?.destroy() },
  }
}
