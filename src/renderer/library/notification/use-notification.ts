import { useEffect, useEffectEvent } from 'react'
import { uiNotification } from '@shared/bridge'
import type { NotificationPayload, UseNotificationOptions, UseNotificationResult } from './types'

export function useNotification({ onAction }: UseNotificationOptions = {}): UseNotificationResult {
  const handleAction = useEffectEvent((actionId: string, extraData: unknown) => { onAction?.(actionId, extraData) })

  useEffect(() => {
    if (!uiNotification) return
    const off = uiNotification.onAction(handleAction)
    return () => { off() }
  }, [])

  return {
    notify:  (p: NotificationPayload) => { uiNotification?.show({ ...p, type: 'default' }) },
    success: (p: NotificationPayload) => { uiNotification?.show({ ...p, type: 'success' }) },
    error:   (p: NotificationPayload) => { uiNotification?.show({ ...p, type: 'error'   }) },
    info:    (p: NotificationPayload) => { uiNotification?.show({ ...p, type: 'info'    }) },
    warning: (p: NotificationPayload) => { uiNotification?.show({ ...p, type: 'warning' }) },
    dismiss: ()                       => { uiNotification?.destroy() },
  }
}
