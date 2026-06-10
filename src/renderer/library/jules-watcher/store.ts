import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { WatchedSession } from './types'

interface WatcherStore {
  watched:   Record<string, WatchedSession>
  watch:     (session: WatchedSession) => void
  unwatch:   (id: string) => void
  isWatched: (id: string) => boolean
}

export const useWatcherStore = create<WatcherStore>()(
  persist(
    (set, get) => ({
      watched:   {},
      watch:     (session) => set(s => ({ watched: { ...s.watched, [session.id]: session } })),
      unwatch:   (id) => set(s => { const { [id]: _, ...rest } = s.watched; return { watched: rest } }),
      isWatched: (id) => id in get().watched,
    }),
    { name: 'jules-watcher' }
  )
)
