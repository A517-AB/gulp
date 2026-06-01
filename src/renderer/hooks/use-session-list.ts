import { useState, useCallback, useEffect, useMemo } from "react";
import { useJules } from "@/lib/jules/provider";
import { getArchivedSessions } from "@/lib/archive";
import type { Session, UseSessionListReturn } from "@/types/activity-feed";

export function useSessionList(): UseSessionListReturn {
  const { client } = useJules();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [archivedIds] = useState<Set<string>>(() => getArchivedSessions());

  const loadSessions = useCallback(async () => {
    if (!client) { setLoading(false); return; }
    try {
      setLoading(true);
      setError(null);
      setSessions(await client.listSessions());
    } catch (err) {
      if (err instanceof Error && err.message.includes("Resource not found")) {
        setSessions([]);
      } else {
        setError(err instanceof Error ? err.message : "Failed to load sessions");
        setSessions([]);
      }
    } finally {
      setLoading(false);
    }
  }, [client]);

  useEffect(() => {
    const initialLoad = window.setTimeout(() => {
      void loadSessions();
    }, 0);

    return () => {
      window.clearTimeout(initialLoad);
    };
  }, [loadSessions]);

  const visibleSessions = useMemo(() =>
    sessions
      .filter((s) => !archivedIds.has(s.id))
      .filter((s) => {
        if (!searchQuery) return true;
        const q = searchQuery.toLowerCase();
        return s.title.toLowerCase().includes(q) || s.sourceId.toLowerCase().includes(q);
      }),
    [sessions, archivedIds, searchQuery],
  );

  return { sessions: visibleSessions, allSessions: sessions, loading, error, searchQuery, setSearchQuery, loadSessions };
}
