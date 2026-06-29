import {memo} from "react";
import {Archive, Code, GitBranch, MoreVertical, Play, Plus} from "lucide-react";
import type {SessionResource} from "@jules";
import {Button} from "@/ui/button.tsx";
import {DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger} from "@/ui/dropdown-menu.tsx";
import {FlyingJules} from "@/components/workspace/flying-jules.tsx";
import {getSessionDuration, getStatusInfo} from "../session-status.ts";
import {formatDistanceToNow, isValid, parseISO} from "date-fns";
import {useStore} from "@/store/app.ts";

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

interface ActivityFeedHeaderProps {
    session: SessionResource;
    showCodeDiffs: boolean;
    onToggleCodeDiffs: (show: boolean) => void;
    sending: boolean;
    applyStateStatus: "idle" | "applying" | "done" | "error";
    handleQuickReview: () => void;
    handleApplyLocally: () => void;
    onNewSession?: (() => void) | undefined;
    onArchive?: (() => void) | undefined;
}

const mapSessionStateToJulesState = (s: SessionResource["state"]): "idle" | "inProgress" | "completed" | "failed" => {
    if (s === "inProgress") return "inProgress";
    if (s === "completed") return "completed";
    if (s === "failed") return "failed";
    return "idle";
};

export const ActivityFeedHeader = memo(
    function ActivityFeedHeader({
        session,
        showCodeDiffs,
        onToggleCodeDiffs,
        sending,
        applyStateStatus,
        handleQuickReview,
        handleApplyLocally,
        onNewSession,
        onArchive,
    }: ActivityFeedHeaderProps) {
        const archiveSessions = useStore((s) => s.archiveSessions);
        const sourceContext = session.sourceContext as typeof session.sourceContext | undefined | null;
        const outputs = session.outputs as typeof session.outputs | undefined | null;

        const branch =
            sourceContext?.githubRepoContext?.startingBranch ??
            "main";

        const statusInfo = getStatusInfo(session.state);
        const hasDiffs = outputs?.some((o) => o.type === "changeSet") ?? false;
        const canApplyLocally = session.state === "completed" && hasDiffs;

        return (
            <div className="border-b border-hair bg-surface px-4 py-3">
                <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                        <FlyingJules size={36} state={mapSessionStateToJulesState(session.state)} className="shrink-0" />
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1.5">
                                <h2 className="text-sm font-bold uppercase tracking-wide truncate text-fg-primary">
                                    {session.title}
                                </h2>
                                <div
                                    className={`flex items-center gap-1 px-2 py-0.5 text-3xs font-mono font-bold uppercase tracking-wider rounded ${statusInfo.bgColor} ${statusInfo.color}`}
                                >
                                    <span>{statusInfo.icon}</span>
                                    <span>{statusInfo.label}</span>
                                </div>
                            </div>
                            <div className="flex items-center gap-3 text-3xs font-mono text-fg-dim uppercase tracking-wide">
                                <span>Started {formatDate(session.createTime)}</span>
                                <span>•</span>
                                <span>{branch}</span>
                                {session.state === "inProgress" && (
                                    <>
                                        <span>•</span>
                                        <span>Running {String(getSessionDuration(session.createTime))}m</span>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                        {hasDiffs && (
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => {
                                    onToggleCodeDiffs(!showCodeDiffs);
                                }}
                                className={`h-7 w-7 hover:bg-hover ${
                                    showCodeDiffs ? "bg-purple-500/20 text-purple-400" : "text-fg-muted"
                                }`}
                            >
                                <Code className="h-3.5 w-3.5" />
                            </Button>
                        )}
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-7 w-7 hover:bg-hover text-fg-muted">
                                    <MoreVertical className="h-3.5 w-3.5" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-48 bg-surface border-hair text-fg-secondary">
                                {session.state === "inProgress" && (
                                    <DropdownMenuItem
                                        onClick={handleQuickReview}
                                        disabled={sending}
                                        className="focus:bg-hover text-xs cursor-pointer"
                                    >
                                        <Play className="mr-2 h-3.5 w-3.5" />
                                        <span>Start Code Review</span>
                                    </DropdownMenuItem>
                                )}
                                {canApplyLocally && (
                                    <DropdownMenuItem
                                        onClick={handleApplyLocally}
                                        disabled={applyStateStatus === "applying"}
                                        className="focus:bg-hover text-xs cursor-pointer"
                                    >
                                        <GitBranch className="mr-2 h-3.5 w-3.5" />
                                        <span>{applyStateStatus === "applying" ? "Applying…" : "Apply locally"}</span>
                                    </DropdownMenuItem>
                                )}
                                {onNewSession && (
                                    <DropdownMenuItem
                                        onClick={() => {
                                            setTimeout(onNewSession, 0);
                                        }}
                                        className="focus:bg-hover text-xs cursor-pointer"
                                    >
                                        <Plus className="mr-2 h-3.5 w-3.5" />
                                        <span>New Session</span>
                                    </DropdownMenuItem>
                                )}
                                <DropdownMenuItem
                                    onClick={() => {
                                        archiveSessions(session.id);
                                        onArchive?.();
                                    }}
                                    className="focus:bg-hover text-xs cursor-pointer text-red-400 focus:text-red-400"
                                >
                                    <Archive className="mr-2 h-3.5 w-3.5" />
                                    <span>Archive Session</span>
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                </div>
            </div>
        );
    },
    (prevProps, nextProps) => {
        // Only rerender header if these specific visual states / contents change
        return (
            prevProps.session.id === nextProps.session.id &&
            prevProps.session.state === nextProps.session.state &&
            prevProps.session.title === nextProps.session.title &&
            prevProps.showCodeDiffs === nextProps.showCodeDiffs &&
            prevProps.sending === nextProps.sending &&
            prevProps.applyStateStatus === nextProps.applyStateStatus &&
            prevProps.onNewSession === nextProps.onNewSession &&
            prevProps.onArchive === nextProps.onArchive
        );
    }
);
export default ActivityFeedHeader;
