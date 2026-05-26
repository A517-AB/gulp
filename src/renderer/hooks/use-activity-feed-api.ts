import { useState, useCallback, useEffect, useRef } from "react";
import { useJules } from "@/lib/jules/provider";
import type { Activity, UseActivityFeedApiProps, UseActivityFeedApiReturn } from "@/types/activity-feed";

export function useActivityFeedApi({
  session,
  onActivitiesChange,
}: UseActivityFeedApiProps): UseActivityFeedApiReturn {
  const { client } = useJules();
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [approvingPlan, setApprovingPlan] = useState(false);
  const [newActivityIds, setNewActivityIds] = useState<Set<string>>(new Set());

  const callbackRef = useRef(onActivitiesChange);
  useEffect(() => { callbackRef.current = onActivitiesChange; });
  useEffect(() => { callbackRef.current?.(activities); }, [activities]);

  const loadActivities = useCallback(async (isInitialLoad = true) => {
    if (!client) {
      if (isInitialLoad) setLoading(false);
      return;
    }
    try {
      if (isInitialLoad) setLoading(true);
      setError(null);
      const data = await client.listActivities(session.id);
      setActivities((prev) => {
        if (prev.length === 0 || isInitialLoad) return data;
        const fresh = data.filter((a) => !prev.some((p) => p.id === a.id));
        if (!fresh.length) return prev;
        setNewActivityIds(new Set(fresh.map((a) => a.id)));
        setTimeout(() => setNewActivityIds(new Set()), 500);
        return [...prev, ...fresh];
      });
    } catch (err) {
      if (err instanceof Error && err.message.includes("Resource not found")) {
        setActivities([]);
      } else {
        setError(err instanceof Error ? err.message : "Failed to load activities");
        if (isInitialLoad) setActivities([]);
      }
    } finally {
      if (isInitialLoad) setLoading(false);
    }
  }, [client, session.id]);

  useEffect(() => {
    loadActivities(true);
    if (session.status !== "active") return;
    const interval = setInterval(() => loadActivities(false), 5000);
    return () => clearInterval(interval);
  }, [session.id, session.status, loadActivities]);

  const handleApprovePlan = useCallback(async () => {
    if (!client || approvingPlan) return;
    try {
      setApprovingPlan(true);
      setError(null);
      await client.approvePlan(session.id);
      setTimeout(() => loadActivities(false), 1000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to approve plan");
    } finally {
      setApprovingPlan(false);
    }
  }, [client, session.id, approvingPlan, loadActivities]);

  const handleSendMessage = useCallback(async (message: string) => {
    if (!message.trim() || !client || sending) return;
    try {
      setSending(true);
      setError(null);
      const userMessage = await client.createActivity({ sessionId: session.id, content: message.trim() });
      setActivities((prev) => [...prev, userMessage]);
      setTimeout(() => loadActivities(false), 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send message");
    } finally {
      setSending(false);
    }
  }, [client, session.id, sending, loadActivities]);

  return { activities, loading, error, sending, approvingPlan, newActivityIds, loadActivities, handleApprovePlan, handleSendMessage };
}
