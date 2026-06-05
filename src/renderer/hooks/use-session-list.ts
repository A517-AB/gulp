import { useState, useCallback, useEffect, useMemo } from "react";
import { useJules } from "@/lib/jules/provider";
import { getArchivedSessions } from "@/lib/archive";
import type { Session, UseSessionListReturn } from "@/types/activity-feed";

export function useSessionList(): UseSessionListReturn {
  const { client } = useJules();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [archivedIds, setArchivedIds] = useState<Set<string>>(new Set());

  useEffect(() => { setArchivedIds(getArchivedSessions()); }, []);

  const loadSessions = useCallback(async (isInitial = false) => {
    if (!client) { if (isInitial) setLoading(false); return; }
    try {
      setError(null);
      const data = await client.listSessions();
      setSessions(data);
    } catch (err) {
      if (err instanceof Error && err.message.includes("Resource not found")) {
        setSessions([]);
      } else {
        setError(err instanceof Error ? err.message : "Failed to load sessions");
      }
    } finally {
    }
  }, [client]);

  useEffect(() => { void loadSessions(true); }, [loadSessions]);

  // Background refresh every 10s — no loading flash
  useEffect(() => {
    const id = setInterval(() => { void loadSessions(false); }, 10_000);
    return () => { clearInterval(id); };
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

  return { sessions: visibleSessions, allSessions: sessions, loading, error, searchQuery, setSearchQuery, loadSessions: () => loadSessions(false) };
}
