import { useState, useCallback, useEffect, useRef } from "react";
import { useJules } from "@/lib/jules/provider";
import { sdkIpc, isElectron } from "@shared/bridge";
import type { Activity, UseActivityFeedApiProps, UseActivityFeedApiReturn } from "@/types/activity-feed";
import type { JulesLocalActivity } from "@shared/electron";

const QUICK_REVIEW_PROMPT =
  "Please perform a comprehensive code review of the repository. Look for bugs, security issues, and opportunities for refactoring. Provide a detailed summary of your findings.";

function mapLocalActivity(a: JulesLocalActivity, sessionId: string): Activity {
  const role = a.originator === "agent" ? "agent" : "user"
  let type: Activity["type"] = "message"
  let content = a.message ?? a.description ?? a.title ?? ""

  if (a.type === "planGenerated")        type = "plan"
  else if (a.type === "progressUpdated") type = "progress"
  else if (a.type === "sessionCompleted") { type = "result"; content = a.message ?? "Session completed" }
  else if (a.type === "sessionFailed")    { type = "error";  content = a.reason  ?? "Session failed" }

  const changeSet = a.artifacts.find(art => art.type === "changeSet")
  const bash      = a.artifacts.find(art => art.type === "bashOutput")

  return {
    id: a.id,
    sessionId,
    type,
    role,
    content,
    createdAt: a.createTime,
    ...(changeSet?.diff ? { diff:       changeSet.diff } : {}),
    ...(bash?.output    ? { bashOutput: bash.output    } : {}),
    metadata: a as unknown as Record<string, unknown>,
  }
}

export function useActivityFeedApi({
  session,
  onActivitiesChange,
}: UseActivityFeedApiProps): UseActivityFeedApiReturn {
  const { client } = useJules();
  const [activities, setActivities] = useState<Activity[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [approvingPlan, setApprovingPlan] = useState(false);
  const [newActivityIds, setNewActivityIds] = useState<Set<string>>(new Set());

  const callbackRef = useRef(onActivitiesChange);
  useEffect(() => { callbackRef.current = onActivitiesChange; });
  useEffect(() => { callbackRef.current?.(activities); }, [activities]);

  const flashNew = useCallback((ids: string[]) => {
    if (!ids.length) return;
    setNewActivityIds(new Set(ids));
    setTimeout(() => { setNewActivityIds(new Set()); }, 500);
  }, []);

  const appendFresh = useCallback((incoming: Activity[]) => {
    setActivities(prev => {
      const fresh = incoming.filter(a => !prev.some(p => p.id === a.id));
      if (!fresh.length) return prev;
      flashNew(fresh.map(a => a.id));
      return [...prev, ...fresh];
    });
  }, [flashNew]);

  const loadActivities = useCallback(async (isInitialLoad = false) => {
    if (!client) return;
    try {
      setError(null);
      const data = await client.listActivities(session.id);
      if (isInitialLoad) {
        setActivities(data);
      } else {
        appendFresh(data);
      }
    } catch (err) {
      if (err instanceof Error && err.message.includes("Resource not found")) {
        if (isInitialLoad) setActivities([]);
      } else {
        setError(err instanceof Error ? err.message : "Failed to load activities");
      }
    }
  }, [client, session.id, appendFresh]);

  // ── Electron: cached history → live stream ───────────────────────────────────
  useEffect(() => {
    if (!isElectron || !sdkIpc) return;
    let cancelled = false;

    sdkIpc.getHistory(session.id).then(history => {
      if (cancelled) return;
      setActivities(history.map(a => mapLocalActivity(a, session.id)));
    }).catch(() => {});

    sdkIpc.startStream(session.id).catch(() => {});

    const unsub = sdkIpc.onActivity(({ sessionId, activity }) => {
      if (sessionId !== session.id) return;
      const mapped = mapLocalActivity(activity, session.id);
      setActivities(prev => {
        if (prev.some(p => p.id === mapped.id)) return prev;
        flashNew([mapped.id]);
        return [...prev, mapped];
      });
    });

    return () => {
      cancelled = true;
      unsub();
      sdkIpc!.stopStream(session.id).catch(() => {});
    };
  }, [session.id, flashNew]);

  // ── Web: initial fetch → 2s poll while live ──────────────────────────────────
  useEffect(() => {
    if (isElectron) return;
    void loadActivities(true);
    const isLive = ["active", "queued", "planning", "awaitingApproval", "awaitingFeedback"].includes(session.status);
    if (!isLive) return;
    const id = setInterval(() => { void loadActivities(false); }, 2000);
    return () => { clearInterval(id); };
  }, [session.id, session.status, loadActivities]);

  const handleApprovePlan = useCallback(async () => {
    if (approvingPlan) return;
    try {
      setApprovingPlan(true);
      setError(null);
      if (isElectron && sdkIpc) {
        await sdkIpc.approve(session.id);
      } else if (client) {
        await client.approvePlan(session.id);
      }
      setTimeout(() => { void loadActivities(false); }, 1000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to approve plan");
    } finally {
      setApprovingPlan(false);
    }
  }, [client, session.id, approvingPlan, loadActivities]);

  const handleSendMessage = useCallback(async (message: string) => {
    if (!message.trim() || sending) return;
    try {
      setSending(true);
      setError(null);
      if (isElectron && sdkIpc) {
        await sdkIpc.sendMessage(session.id, message.trim());
      } else if (client) {
        const userMessage = await client.createActivity({ sessionId: session.id, content: message.trim() });
        setActivities(prev => [...prev, userMessage]);
        setTimeout(() => { void loadActivities(false); }, 2000);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send message");
    } finally {
      setSending(false);
    }
  }, [client, session.id, sending, loadActivities]);

  const handleQuickReview = useCallback(
    () => handleSendMessage(QUICK_REVIEW_PROMPT),
    [handleSendMessage],
  );

  return {
    activities,
    loading: false,
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
