import { useEffect } from 'react'
import { sdkIpc, uiNotification } from '@shared/bridge'
import type { WatchedSession } from './types'

export function JulesWatcher({ id, title }: WatchedSession) {
  useEffect(() => {
    if (!sdkIpc) return
    return sdkIpc.activities.updates(id, (activity) => {
      if (activity.type !== 'agentMessaged') return
      uiNotification?.show({
        title,
        body: activity.message.slice(0, 120),
        type: 'info',
      })
    })
  }, [id, title])

  return null
}
