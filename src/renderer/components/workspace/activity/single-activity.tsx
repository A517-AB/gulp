import type {ReactNode} from "react";
import {memo} from "react";
import {motion} from "framer-motion";
import {CheckCircle2, XCircle} from "lucide-react";
import type {Activity} from "@jules";
import type {ActivityType, SingleActivityProps} from "./types";
import {CardContent} from "@/ui/card.tsx";
import {Badge} from "@/ui/badge.tsx";
import {Avatar, AvatarFallback} from "@/ui/avatar.tsx";
import {Button} from "@/ui/button.tsx";
import {FlyingJules} from "@/components/workspace/flying-jules.tsx";
import {PlanContent} from "@/components/workspace/plan-content.tsx";
import {Markdown} from "./markdown.tsx";
import {ActivityArtifacts} from "./activity-artifacts.tsx";
import {formatDistanceToNow, isValid, parseISO} from "date-fns";

const fmt = (d: string) => {
    try {
        const date = parseISO(d);
        return isValid(date) ? formatDistanceToNow(date, {addSuffix: true}) : "";
    } catch {
        return "";
    }
};

const getActivityTypeColor = (type: ActivityType): string => {
    const map: Record<ActivityType, string> = {
    agentMessaged: "bg-blue-500",
    userMessaged: "bg-purple-500",
    planGenerated: "bg-indigo-500",
    planApproved: "bg-indigo-400",
    progressUpdated: "bg-amber-500",
    sessionCompleted: "bg-emerald-500",
    sessionFailed: "bg-red-500",
    };
    return map[type] ?? "";
};

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

function Av({originator}: { originator: Activity['originator'] }) {
    const isAgent = originator !== "user";

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
            <Avatar className="h-full w-full">
                <AvatarFallback className="text-3xs font-bold uppercase tracking-wider bg-purple-500 text-white">
                    U
                </AvatarFallback>
            </Avatar>
        </motion.div>
    );
}

function renderContent(activity: Activity, onApprovePlan: () => void, approvingPlan: boolean, planApproved: boolean): ReactNode {
    switch (activity.type) {
        case "agentMessaged": {
            const msg = activity.message?.trim() ?? '';
            return msg ? <Markdown>{msg}</Markdown> : null;
        }

        case "userMessaged": {
            const msg = activity.message?.trim() ?? '';
            return msg ? <Markdown>{msg}</Markdown> : null;
        }

        case "planGenerated":
            return (
                <>
                    <PlanContent content={activity.plan}/>
                    {!planApproved && (
                        <div className="mt-3 pt-3 border-t border-indigo-500/20">
                            <Button
                                onClick={onApprovePlan}
                                disabled={approvingPlan}
                                size="sm"
                                className="h-7 px-3 text-3xs font-mono uppercase tracking-widest bg-indigo-600 hover:bg-indigo-500 text-white border-0 gap-1.5"
                            >
                                Approve Plan
                            </Button>
                        </div>
                    )}
                </>
            );

        case "planApproved":
            return (
                <div className="flex items-center gap-1.5">
                    <CheckCircle2 className="h-3 w-3 text-indigo-400 shrink-0"/>
                    <span className="text-xs font-mono text-indigo-400">Plan approved</span>
                </div>
            );

        case "progressUpdated": {
            const title = activity.title?.trim() ?? '';
            const desc = activity.description?.trim() ?? '';
            if (!title && !desc) return null;
            return (
                <div className="flex items-start gap-2">
                    <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-amber-400 shrink-0"/>
                    <div>
                        {title && <p className="text-sm text-amber-200/90 leading-snug">{title}</p>}
                        {desc && <p className="text-xs text-amber-400/60 mt-0.5 leading-snug">{desc}</p>}
                    </div>
                </div>
            );
        }

        case "sessionCompleted":
            return (
                <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0"/>
                    <span className="text-xs font-mono text-emerald-400 tracking-wide">Session completed</span>
                </div>
            );

        case "sessionFailed":
            return (
                <div className="flex items-center gap-2">
                    <XCircle className="h-4 w-4 text-red-400 shrink-0"/>
                    <span
                        className="text-xs font-mono text-red-400">{activity.reason?.trim() || "Session failed"}</span>
                </div>
            );

        default: {
            const t = (activity as { type: string }).type;
            console.warn("[single-activity] unknown type:", t);
            return <span className="text-xs font-mono text-fg-ghost">{t}</span>;
        }
    }
}

const BUBBLE_STYLES: Partial<Record<ActivityType, string>> = {
    progressUpdated: "bg-amber-950/20 border-amber-500/10",
    planGenerated: "bg-indigo-950/20 border-indigo-500/15",
    planApproved: "bg-indigo-950/10 border-indigo-500/10",
    sessionCompleted: "bg-emerald-950/20 border-emerald-500/15",
    sessionFailed: "bg-red-950/20 border-red-500/15",
};

const USER_BUBBLE = "bg-purple-500/8 border-purple-500/20";
const AGENT_BUBBLE = "bg-blue-500/5 border-blue-500/10";

export const SingleActivity = memo(
    function SingleActivity({ activity, onApprovePlan, approvingPlan, planApproved }: SingleActivityProps) {
        const isUser = activity.originator === "user";
        const content = renderContent(activity, onApprovePlan, approvingPlan, planApproved);
        if (content === null) return null;

        const bubbleClass = isUser
            ? USER_BUBBLE
            : (BUBBLE_STYLES[activity.type] ?? AGENT_BUBBLE);

        return (
            <div className={`flex gap-2.5 w-full ${isUser ? "flex-row-reverse" : ""}`}>
                <Av originator={activity.originator}/>
                <div
                    className={`${isUser ? "max-w-[85%] md:max-w-[70%]" : "max-w-[90%] md:max-w-[80%]"} rounded-lg border ${bubbleClass}`}>
                    <CardContent className="p-3">
                        <div className="flex items-center gap-2 mb-2">
                            <TypeBadge type={activity.type}/>
                            <span className="text-3xs font-mono text-fg-ghost">{fmt(activity.createTime)}</span>
                        </div>
                        <div className="text-sm leading-relaxed text-fg-primary break-words">
                            {content}
                        </div>
                        <ActivityArtifacts activity={activity} />
                    </CardContent>
                </div>
            </div>
        );
    },
    (prev, next) => {
        if (prev.approvingPlan !== next.approvingPlan) return false;
        if (prev.planApproved !== next.planApproved) return false;
        if (prev.onApprovePlan !== next.onApprovePlan) return false;
        if (prev.activity.id !== next.activity.id) return false;
        return JSON.stringify(prev.activity) === JSON.stringify(next.activity);
    }
);
