import type { ReactNode } from "react";
import { memo } from "react";
import { motion } from "framer-motion";
import { CheckCircle2, XCircle } from "lucide-react";
import log from "electron-log/renderer";
import type { Activity, ActivityRole, ActivityType, SingleActivityProps } from "./types";
import { Card, CardContent } from "@/ui/card.tsx";
import { Badge } from "@/ui/badge.tsx";
import { Avatar, AvatarFallback } from "@/ui/avatar.tsx";
import { Button } from "@/ui/button.tsx";
import { FlyingJules } from "@/components/workspace/flying-jules.tsx";
import { PlanContent } from "@/components/workspace/plan-content.tsx";
import { formatDistanceToNow, isValid, parseISO } from "date-fns";

const formatDate = (dateString: string): string => {
    if (!dateString) return "Unknown date";
    try {
        const date = parseISO(dateString);
        if (!isValid(date)) return "Unknown date";
        return formatDistanceToNow(date, { addSuffix: true });
    } catch {
        return "Unknown date";
    }
};

const getActivityTypeColor = (type: ActivityType): string => {
    const map: Record<ActivityType, string> = {
        agentMessaged: "bg-blue-500",
        userMessaged: "bg-purple-500",
        planGenerated: "bg-indigo-500",
        planApproved: "bg-indigo-400",
        progressUpdated: "bg-yellow-500",
        sessionCompleted: "bg-green-500",
        sessionFailed: "bg-red-500",
    };
    return map[type];
};
import { Markdown } from "./markdown.tsx";
import { ActivityArtifacts } from "./activity-artifacts.tsx";

const sr = (v: unknown): string => (typeof v === "string" ? v.trim() : "");

function TypeBadge({ type }: { type: ActivityType }) {
    return (
        <Badge
            variant="outline"
            className={`text-3xs h-4 px-1.5 font-mono uppercase tracking-wider ${getActivityTypeColor(
                type
            )} border-transparent text-black font-bold`}
        >
            {type}
        </Badge>
    );
}

function AgentCard({ children }: { children: ReactNode }) {
    return (
        <div className="max-w-[90%] md:max-w-[80%] rounded-lg bg-surface/50">
            <CardContent className="p-3">{children}</CardContent>
        </div>
    );
}

function Av({ role }: { role: ActivityRole }) {
    const isAgent = role !== "user";

    if (isAgent) {
        return (
            <motion.div
                whileHover={{ scale: 1.08 }}
                transition={{ type: "spring", stiffness: 400, damping: 15 }}
                className="h-6 w-6 shrink-0 mt-0.5 flex items-center justify-center cursor-pointer select-none"
            >
                <FlyingJules size={24} state="idle" />
            </motion.div>
        );
    }

    return (
        <motion.div
            whileHover={{ scale: 1.08 }}
            transition={{ type: "spring", stiffness: 400, damping: 15 }}
            className="h-6 w-6 shrink-0 mt-0.5 cursor-pointer select-none"
        >
            <Avatar className="h-full w-full bg-surface border border-hair">
                <AvatarFallback className="text-3xs font-bold uppercase tracking-wider bg-purple-500 text-white">
                    U
                </AvatarFallback>
            </Avatar>
        </motion.div>
    );
}

function renderContent(activity: Activity): ReactNode {
    log.debug("[activity-item] render", activity.type, activity.id);
    switch (activity.type) {
        case "planGenerated":
            return <PlanContent content={activity.plan} />;

        case "agentMessaged":
        case "userMessaged": {
            const msg = sr(activity.message);
            return msg ? <Markdown>{msg}</Markdown> : null;
        }

        case "planApproved":
            return (
                <div className="flex items-center gap-1.5">
                    <CheckCircle2 className="h-3 w-3 text-green-500 shrink-0" />
                    <span className="text-xs font-mono text-fg-muted">Plan approved</span>
                </div>
            );

        case "progressUpdated": {
            const title = sr(activity.title);
            const desc = sr(activity.description);
            if (!title && !desc) return null;
            return (
                <div>
                    {title && <p className="text-sm text-fg-primary">{title}</p>}
                    {desc && <p className="text-xs text-fg-muted mt-0.5">{desc}</p>}
                </div>
            );
        }

        case "sessionCompleted":
            return (
                <div className="flex items-center gap-1.5">
                    <CheckCircle2 className="h-3 w-3 text-green-500 shrink-0" />
                    <span className="text-[10px] font-mono text-green-500">Session completed</span>
                </div>
            );

        case "sessionFailed":
            return (
                <div className="flex items-center gap-1.5">
                    <XCircle className="h-3 w-3 text-red-500 shrink-0" />
                    <span className="text-[10px] font-mono text-red-400">{sr(activity.reason) || "Session failed"}</span>
                </div>
            );

        default: {
            const t = (activity as { type: string }).type;
            log.warn("[activity-item] unknown type:", t, activity);
            return <span className="text-xs font-mono text-fg-ghost">{t}</span>;
        }
    }
}

/**
 * `SingleActivity` renders a major, standalone activity item in the feed.
 * This includes user messages, AI responses, execution plans, or terminal outputs
 * that shouldn't be grouped. It delegates specific rendering to subcomponents
 * (like `Markdown`, `TerminalConsole`, `ActivityArtifacts`).
 *
 * Props:
 * - `activity`: The single `Activity` object to render.
 * - `onApprovePlan`: Callback fired when a user approves a proposed plan.
 * - `approvingPlan`: Boolean state indicating if a plan approval request is in flight.
 * - `planApproved`: Boolean state indicating if the current plan has already been approved.
 */
export const SingleActivity = memo(
    function SingleActivity({ activity, onApprovePlan, approvingPlan, planApproved }: SingleActivityProps) {
        const isUser = activity.originator === "user";
        const isPlanPending = activity.type === "planGenerated" && !planApproved;
        const content = renderContent(activity);

        return (
            <div
                className={`flex gap-2.5 w-full ${isUser ? "flex-row-reverse" : ""}`}
            >
                <Av role={activity.originator} />
                {isUser ? (
                    <div
                        className="max-w-[85%] md:max-w-[70%]"
                    >
                        <Card className="py-2.5 border-purple-500/15 dark:border-purple-500/20 bg-purple-500/5 dark:bg-purple-950/20 shadow-sm backdrop-blur-sm">
                            <CardContent className="p-3">
                                <div className="flex items-center gap-2 mb-2">
                                    <TypeBadge type={activity.type} />
                                    <span className="text-xs font-mono text-fg-muted">{formatDate(activity.createTime)}</span>
                                </div>
                                {content && <div className="text-sm leading-relaxed text-fg-primary break-words">{content}</div>}
                                <ActivityArtifacts activity={activity} />
                            </CardContent>
                        </Card>
                    </div>
                ) : (
                    <AgentCard>
                        <div className="flex items-center gap-2 mb-2">
                            <TypeBadge type={activity.type} />
                            <span className="text-xs font-mono text-fg-muted">{formatDate(activity.createTime)}</span>
                        </div>
                        {content && <div className="text-sm leading-relaxed text-fg-primary break-words">{content}</div>}
                        <ActivityArtifacts activity={activity} />
                        {isPlanPending && (
                            <div className="mt-3 pt-3 border-t border-hair">
                                <Button
                                    onClick={onApprovePlan}
                                    disabled={approvingPlan}
                                    size="sm"
                                    className="h-7 px-3 text-3xs font-mono uppercase tracking-widest border-0"
                                >
                                    Approve Plan
                                </Button>
                            </div>
                        )}
                    </AgentCard>
                )}
            </div>
        );
    },
    (prevProps, nextProps) => {
        if (prevProps.isNew !== nextProps.isNew) return false;
        if (prevProps.approvingPlan !== nextProps.approvingPlan) return false;
        if (prevProps.planApproved !== nextProps.planApproved) return false;
        if (prevProps.onApprovePlan !== nextProps.onApprovePlan) return false;
        if (prevProps.activity.id !== nextProps.activity.id) return false;

        return (
            prevProps.activity.createTime === nextProps.activity.createTime &&
            JSON.stringify(prevProps.activity) === JSON.stringify(nextProps.activity)
        );
    }
);
