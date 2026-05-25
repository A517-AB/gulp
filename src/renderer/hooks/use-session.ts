import { useEffect } from 'react'
import { useStore, type AppStore, type SessionSlice } from '@/store/app'

const idle: SessionSlice = { activities: [], status: 'connecting', outcome: null, error: null }

export function useSession(id: string | null): SessionSlice {
  const watch = useStore((s: AppStore) => s.watch)
  const session = useStore((s: AppStore) => (id ? s.sessions[id] : null))

  useEffect(() => {
    if (id) watch(id)
  }, [id, watch])

  return session ?? idle
}
