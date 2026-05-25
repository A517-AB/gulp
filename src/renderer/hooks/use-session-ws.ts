import { useStore, type AppStore } from '@/store/app'
import { useEffect } from 'react'
import type { Activity, Outcome } from '@/types/jules-sdk'

export type WsActivity = Activity
export type WsOutcome = Outcome
export type WsStatus = 'connecting' | 'connected' | 'disconnected' | 'idle'

export function useSessionWs(id: string | null) {
  const watch = useStore((s: AppStore) => s.watch)
  const session = useStore((s: AppStore) => id ? s.sessions[id] : null)

  useEffect(() => {
    if (!id) return
    const unsub = watch(id)
    return unsub
  }, [id, watch])

  if (!session) {
    return { activities: [], status: 'idle' as WsStatus, outcome: null, error: null }
  }

  return session
}
