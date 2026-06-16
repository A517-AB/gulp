import { useCallback, useEffect, useRef, useState } from "react";
import { ScrollArea } from "@/ui/scroll-area.tsx";
import { Button } from "@/ui/button.tsx";
import { useActivityGroups } from "@/hooks/use-activity-groups.ts";
import { useStore } from "@/store/app.ts";
import type { Activity, ActivityFeedProps } from "./types";
import { ActivityItem } from "./activity-item.tsx";
import { ActivityFeedHeader } from "./activity-feed-header.tsx";
import { ActivityFeedForm } from "./activity-feed-form.tsx";

const QUICK_REVIEW_PROMPT =
    "Please perform a comprehensive code review of the repository. Look for bugs, security issues, and opportunities for refactoring. Provide a detailed summary of your findings.";

const EMPTY_ACTIVITIES: Activity[] = [];

export function ActivityFeed({
    session,
    onArchive,
    onNewSession,
    showCodeDiffs,
    onToggleCodeDiffs,
}: ActivityFeedProps) {
    const activities = useStore((s) => s.activities[session.id] ?? EMPTY_ACTIVITIES);
    const error = useStore((s) => s.activitiesError[session.id] ?? null);
    const loadActivities = useStore((s) => s.loadActivities);
    const streamActivities = useStore((s) => s.streamActivities);

    const applyPatch = useStore((s) => s.applyPatch);
    const approvePlan = useStore((s) => s.approvePlan);
    const sendMessage = useStore((s) => s.sendMessage);

    const { grouped, latest } = useActivityGroups(activities);

    const latestSummary = useStore((s) => s.activitySummaries[session.id]?.[latest?.id ?? ""] ?? "");

    const [sending, setSending] = useState(false);
    const [approving, setApproving] = useState(false);
    const [applyState, setApplyState] = useState<{ status: "idle" | "applying" | "done" | "error"; message?: string }>({
        status: "idle",
    });

    const [newActivityIds, setNewActivityIds] = useState<Set<string>>(new Set());
    const prevIdsRef = useRef<Set<string>>(new Set());
    const initialLoadDoneRef = useRef(false);
    const bottomRef = useRef<HTMLDivElement>(null);

    const reloadActivities = useCallback(() => {
        void loadActivities(session.id);
    }, [session.id, loadActivities]);

    useEffect(() => {
        void loadActivities(session.id);
        const unsub = streamActivities(session.id);
        return () => {
            unsub();
        };
    }, [session.id, loadActivities, streamActivities]);

    useEffect(() => {
        const newIds = activities.filter((a) => !prevIdsRef.current.has(a.id)).map((a) => a.id);
        prevIdsRef.current = new Set(activities.map((a) => a.id));
        if (!newIds.length) return;
        if (!initialLoadDoneRef.current) {
            initialLoadDoneRef.current = true;
            bottomRef.current?.scrollIntoView();
            return;
        }
        setNewActivityIds(new Set(newIds));
        bottomRef.current?.scrollIntoView({ behavior: "smooth" });
        const t = setTimeout(() => {
            setNewActivityIds(new Set());
        }, 500);
        return () => {
            clearTimeout(t);
        };
    }, [activities]);

    const handleApplyLocally = useCallback(async () => {
        setApplyState({ status: "applying" });
        const result = await applyPatch(session.id);
        if (result.success) {
            setApplyState({ status: "done", message: `Applied to branch: ${result.branch ?? "unknown"}` });
        } else {
            setApplyState({ status: "error", message: result.error ?? "Unknown error" });
        }
    }, [session.id, applyPatch]);

    const handleApprovePlan = useCallback(() => {
        setApproving((prev) => {
            if (prev) return prev;
            void approvePlan(session.id)
                .catch((err: unknown) => {
                    console.error("Failed to approve plan:", err);
                })
                .finally(() => {
                    setApproving(false);
                });
            return true;
        });
    }, [session.id, approvePlan]);

    const onSubmitMessage = useCallback(
        (msg: string) => {
            if (!msg.trim()) return;
            setSending((prev) => {
                if (prev) return prev;
                void sendMessage(session.id, msg)
                    .catch((err: unknown) => {
                        console.error("Failed to send:", err);
                    })
                    .finally(() => {
                        setSending(false);
                    });
                return true;
            });
        },
        [session.id, sendMessage]
    );

    const handleQuickReview = useCallback(() => {
        setSending((prev) => {
            if (prev) return prev;
            void sendMessage(session.id, QUICK_REVIEW_PROMPT)
                .catch((err: unknown) => {
                    console.error("Failed to send review:", err);
                })
                .finally(() => {
                    setSending(false);
                });
            return true;
        });
    }, [session.id, sendMessage]);

    return (
        <div className="flex flex-col h-full bg-base">
            <ActivityFeedHeader
                session={session}
                latest={latest}
                latestSummary={latestSummary}
                showCodeDiffs={showCodeDiffs}
                onToggleCodeDiffs={onToggleCodeDiffs}
                sending={sending}
                applyStateStatus={applyState.status}
                handleQuickReview={handleQuickReview}
                handleApplyLocally={() => {
                    void handleApplyLocally();
                }}
                onNewSession={onNewSession}
                onArchive={onArchive}
            />

            {error && (
                <div className="border-b border-hair bg-red-950/20 px-4 py-3 flex items-center justify-between gap-2">
                    <p className="text-[11px] font-mono text-red-400 uppercase">{error}</p>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={reloadActivities}
                        className="h-7 text-[10px] font-mono uppercase border-hair hover:bg-hover text-fg-secondary"
                    >
                        Retry
                    </Button>
                </div>
            )}
            {applyState.status === "done" && (
                <div className="border-b border-hair bg-green-950/20 px-4 py-2 flex items-center justify-between gap-2">
                    <p className="text-[11px] font-mono text-green-400 uppercase">{applyState.message}</p>
                    <button
                        onClick={() => {
                            setApplyState({ status: "idle" });
                        }}
                        className="text-[10px] font-mono text-fg-dim hover:text-fg-secondary uppercase"
                    >
                        ✕
                    </button>
                </div>
            )}
            {applyState.status === "error" && (
                <div className="border-b border-hair bg-red-950/20 px-4 py-2 flex items-center justify-between gap-2">
                    <p className="text-[11px] font-mono text-red-400 uppercase">{applyState.message}</p>
                    <button
                        onClick={() => {
                            setApplyState({ status: "idle" });
                        }}
                        className="text-[10px] font-mono text-fg-dim hover:text-fg-secondary uppercase"
                    >
                        ✕
                    </button>
                </div>
            )}

            <div className="flex-1 overflow-hidden">
                <ScrollArea className="h-full">
                    <div className="p-3 flex flex-col space-y-2.5">
                        {grouped.map((item, i) => (
                            <ActivityItem
                                key={Array.isArray(item) ? `group-${String(i)}` : item.id}
                                item={item}
                                onApprovePlan={handleApprovePlan}
                                approvingPlan={approving}
                                isNew={!Array.isArray(item) && newActivityIds.has(item.id)}
                            />
                        ))}
                        <div ref={bottomRef} />
                    </div>
                </ScrollArea>
            </div>

            <ActivityFeedForm onSubmitMessage={onSubmitMessage} sending={sending} />
        </div>
    );
}
export default ActivityFeed;
