import {useMemo, useState} from "react";
import {useStore} from "@/store/app";
import {getArchivedSessions} from "@/lib/archive";
import type {UseSessionListReturn} from "@/types/activity-feed";

export function useSessionList(): UseSessionListReturn {
  const sessions = useStore(s => s.sessionList)
  const loadSessions = useStore(s => s.loadSessions)
  const [searchQuery, setSearchQuery] = useState("")
  const [archivedIds] = useState(() => getArchivedSessions())

  const visibleSessions = useMemo(() =>
    sessions
      .filter(s => !archivedIds.has(s.id))
      .filter(s => {
        if (!searchQuery) return true
        const q = searchQuery.toLowerCase()
          const sourceStr = s.source?.githubRepo
              ? `${s.source.githubRepo.owner}/${s.source.githubRepo.repo}`
              : ''
          return s.title.toLowerCase().includes(q) || sourceStr.toLowerCase().includes(q)
      }),
    [sessions, archivedIds, searchQuery],
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
