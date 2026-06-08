import { useEffect, useEffectEvent } from 'react'
import { uiNotification } from '@shared/bridge'
import type { NotificationPayload, UseNotificationOptions, UseNotificationResult } from './types'

export function useNotification({ onClick, onCancel }: UseNotificationOptions = {}): UseNotificationResult {
  const handleClick  = useEffectEvent((extraData: unknown) => { onClick?.(extraData) })
  const handleCancel = useEffectEvent((extraData: unknown) => { onCancel?.(extraData) })

  useEffect(() => {
    if (!uiNotification) return
    const offClick  = uiNotification.onClicked(handleClick)
    const offCancel = uiNotification.onCancelled(handleCancel)
    return () => { offClick(); offCancel() }
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
