import { useState, useCallback, useEffect, useRef } from "react";
import { useJules } from "@/lib/jules/provider";
import { useStore } from "@/store/app";
import type { Activity, UseActivityFeedApiProps, UseActivityFeedApiReturn } from "@/types/activity-feed";

const QUICK_REVIEW_PROMPT =
  "Please perform a comprehensive code review of the repository. Look for bugs, security issues, and opportunities for refactoring. Provide a detailed summary of your findings.";

export function useActivityFeedApi({
  session,
  onActivitiesChange,
}: UseActivityFeedApiProps): UseActivityFeedApiReturn {
  const { client } = useJules();
  const slice = useStore(s => s.sessions[session.id]);
  const watch = useStore(s => s.watch);

  const activities: Activity[] = slice?.activities ?? [];
  const error = slice?.error?.message ?? null;

  const [sending, setSending] = useState(false);
  const [approvingPlan, setApprovingPlan] = useState(false);
  const [newActivityIds, setNewActivityIds] = useState<Set<string>>(new Set());

  const prevIdsRef = useRef<Set<string>>(new Set());
  useEffect(() => {
    const newIds = activities.filter(a => !prevIdsRef.current.has(a.id)).map(a => a.id);
    prevIdsRef.current = new Set(activities.map(a => a.id));
    if (!newIds.length) return;
    setNewActivityIds(new Set(newIds));
    setTimeout(() => { setNewActivityIds(new Set()); }, 500);
  }, [activities]);

  const callbackRef = useRef(onActivitiesChange);
  useEffect(() => { callbackRef.current = onActivitiesChange; });
  useEffect(() => { callbackRef.current?.(activities); }, [activities]);

  useEffect(() => {
    if (!client) return;
    return watch(session.id, client);
  }, [session.id, client, watch]);

  const loadActivities = useCallback(async () => {
    if (!client) return;
    watch(session.id, client);
  }, [client, session.id, watch]);

  const handleApprovePlan = useCallback(async () => {
    if (!client || approvingPlan) return;
    try {
      setApprovingPlan(true);
      await client.approvePlan(session.id);
      setTimeout(() => { watch(session.id, client); }, 1000);
    } catch (err) {
      console.error('[useActivityFeedApi] approve error', err);
    } finally {
      setApprovingPlan(false);
    }
  }, [client, session.id, approvingPlan, watch]);

  const handleSendMessage = useCallback(async (message: string) => {
    if (!client || !message.trim() || sending) return;
    try {
      setSending(true);
      await client.createActivity({ sessionId: session.id, content: message.trim() });
      setTimeout(() => { watch(session.id, client); }, 2000);
    } catch (err) {
      console.error('[useActivityFeedApi] send error', err);
    } finally {
      setSending(false);
    }
  }, [client, session.id, sending, watch]);

  const handleQuickReview = useCallback(
    () => handleSendMessage(QUICK_REVIEW_PROMPT),
    [handleSendMessage],
  );

  return {
    activities,
    error,
    sending,
    approvingPlan,
    newActivityIds,
    loadActivities,
    handleApprovePlan,
    handleSendMessage,
    handleQuickReview,
  };
}
