import {useMemo, useState} from "react";
import {useStore} from "@/store/app";
import type {UseSessionListReturn} from "@/types/activity-feed";

export function useSessionList(): UseSessionListReturn {
  const sessions = useStore(s => s.sessionList)
    const sources = useStore(s => s.sources)
  const loadSessions = useStore(s => s.loadSessions)
  const [searchQuery, setSearchQuery] = useState("")

  const visibleSessions = useMemo(() =>
    sessions
        .filter(s => !s.archived)
      .filter(s => {
        if (!searchQuery) return true
        const q = searchQuery.toLowerCase()
          // sourceContext is typed required by the SDK but is absent on old/cached sessions —
          // the SDK itself uses sourceContext?.source in its own storage layer (index.mjs:3088)
          const sc = s.sourceContext as { source?: string } | undefined
          const githubRepo = s.source?.githubRepo
              ?? sources.find(src => src.name === sc?.source || src.id === sc?.source)?.githubRepo
          const sourceStr = githubRepo ? `${githubRepo.owner}/${githubRepo.repo}` : ''
          return s.title.toLowerCase().includes(q) || sourceStr.toLowerCase().includes(q)
      }),
      [sessions, sources, searchQuery],
  )

  return {
    sessions: visibleSessions,
    allSessions: sessions,
    error: null,
    searchQuery,
    setSearchQuery,
      loadSessions,
  }
}
