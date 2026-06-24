import {useCallback, useEffect, useRef, useState} from "react";
import {ScrollArea} from "@/ui/scroll-area.tsx";
import {useStore} from "@/store/app.ts";
import {jules} from "@jules";
import type {Activity, ActivityFeedProps} from "./types";
import {SingleActivity} from "./single-activity.tsx";
import {ActivityFeedHeader} from "./activity-feed-header.tsx";
import {ActivityFeedForm} from "./activity-feed-form.tsx";

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
    const [activities, setActivities] = useState<Activity[]>(EMPTY_ACTIVITIES);
    const [error, setError] = useState<string | null>(null);
    const planApproved = activities.some((a) => a.type === "planApproved");

    useEffect(() => {
        const controller = new AbortController();
        const {signal} = controller;

        void (async () => {
            try {
                const sessionClient = jules.session(session.id);
                const cached = await sessionClient.activities.select();
                if (signal.aborted) return;
                setActivities(cached);

                for await (const act of sessionClient.activities.updates()) {
                    if (signal.aborted) return;
                    setActivities(prev => prev.some(a => a.id === act.id) ? prev : [...prev, act]);
                }
            } catch (err) {
                if (signal.aborted) return;
                console.error('[feed] activities:', err);
                setError(String(err));
            }
        })();

        return () => {
            controller.abort();
        };
    }, [session.id]);

    const scrollRef = useRef<HTMLDivElement>(null);
    const [sending, setSending] = useState(false);
    const [approving, setApproving] = useState(false);
    const [applyState, setApplyState] = useState<{
        status: "idle" | "applying" | "done" | "error";
        message?: string
    }>({status: "idle"});

    const handleApplyLocally = useCallback(async () => {
        setApplyState({ status: "applying" });
        const result = await useStore.getState().applyPatch('', '');
        if (result.ok) {
            setApplyState({
                status: "done",
                message: `Applied to branch: ${'branch' in result ? (result.branch ?? 'unknown') : 'unknown'}`
            });
        } else {
            setApplyState({ status: "error", message: result.error ?? "Unknown error" });
        }
    }, []);

    const handleApprovePlan = useCallback(() => {
        setApproving((prev) => {
            if (prev) return prev;
            jules.session(session.id).approve()
                .catch((err: unknown) => {
                    console.error("Failed to approve plan:", err);
                })
                .finally(() => {
                    setApproving(false);
                });
            return true;
        });
    }, [session.id]);

    const onSubmitMessage = useCallback(
        (msg: string) => {
            if (!msg.trim()) return;
            setSending((prev) => {
                if (prev) return prev;
                jules.session(session.id).send(msg)
                    .catch((err: unknown) => {
                        console.error("Failed to send:", err);
                    })
                    .finally(() => {
                        setSending(false);
                    });
                return true;
            });
        },
        [session.id]
    );

    // god's best creation but should be kicked out at some point by me, don't touch
    const handleQuickReview = useCallback(() => {
        setSending((prev) => {
            if (prev) return prev;
            jules.session(session.id).send(QUICK_REVIEW_PROMPT)
                .catch((err: unknown) => {
                    console.error("Failed to send review:", err);
                })
                .finally(() => {
                    setSending(false);
                });
            return true;
        });
    }, [session.id]);

    return (
        <div className="flex flex-col h-full bg-base">
            <ActivityFeedHeader
                session={session}
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
                </div>
            )}
            {applyState.status === "done" && (
                <div
                    className="border-b border-hair bg-emerald-950/20 px-4 py-2 flex items-center justify-between gap-2">
                    <p className="text-[11px] font-mono text-emerald-400 uppercase">{applyState.message}</p>
                    <button onClick={() => {
                        setApplyState({status: "idle"});
                    }} className="text-[10px] font-mono text-fg-dim hover:text-fg-secondary uppercase">✕
                    </button>
                </div>
            )}
            {applyState.status === "error" && (
                <div className="border-b border-hair bg-red-950/20 px-4 py-2 flex items-center justify-between gap-2">
                    <p className="text-[11px] font-mono text-red-400 uppercase">{applyState.message}</p>
                    <button onClick={() => {
                        setApplyState({status: "idle"});
                    }} className="text-[10px] font-mono text-fg-dim hover:text-fg-secondary uppercase">✕
                    </button>
                </div>
            )}

            <div className="flex-1 overflow-hidden">
                <ScrollArea ref={scrollRef} className="h-full">
                    <div className="p-3 flex flex-col space-y-2.5">
                        {activities.map((activity) => (
                            <SingleActivity
                                key={activity.id}
                                activity={activity}
                                onApprovePlan={handleApprovePlan}
                                approvingPlan={approving}
                                planApproved={planApproved}
                            />
                        ))}
                    </div>
                </ScrollArea>
            </div>

            <ActivityFeedForm onSubmitMessage={onSubmitMessage} sending={sending} />
        </div>
    );
}
export default ActivityFeed;
