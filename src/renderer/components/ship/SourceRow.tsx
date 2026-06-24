import {useEffect, useState} from "react";
import {AnimatePresence, motion} from "framer-motion";
import {ChevronDown, GitPullRequest, CircleX} from "lucide-react";
import {formatDistanceToNow} from "date-fns";
import {cn} from "@/utils";
import {JulesSection} from "./JulesSection";
import {ACTIVE_STATES} from "./active-states";
import type {SessionResource, SessionOutput, Source} from "@jules";
import type {JulesPrInfo, JulesChecksResponse} from "@shared/jules-ipc";

function fmtAge(t: string): string {
    try {
        return formatDistanceToNow(new Date(t), {addSuffix: true})
    } catch {
        return ""
    }
}

interface SourceRowProps {
    source: Source;
    sessions: SessionResource[];
    isOpen: boolean;
    onToggle: () => void;
    onApplyPatch: (sessionId: string, sourceId: string) => void;
}

export function SourceRow({source, sessions, isOpen, onToggle, onApplyPatch}: SourceRowProps) {
    const [prLit, setPrLit] = useState(false);
    const [ciFailLit, setCiFailLit] = useState(false);

    const activeCount = sessions.filter(s => ACTIVE_STATES.has(s.state)).length;
    const lastSession = sessions[0];
    const repoName = source.githubRepo?.repo ?? source.id;

    useEffect(() => {
        let cancelled = false;
        void (async () => {
            const TWO_DAYS = 2 * 24 * 60 * 60 * 1000;

            const recentWithPr = sessions.filter(s => {
                if (Date.now() - new Date(s.createTime).getTime() > TWO_DAYS) return false;
                const outputs = (s.outputs as unknown as SessionOutput[] | undefined) ?? [];
                return outputs.some(o => o.type === 'pullRequest');
            });

            if (recentWithPr.length === 0) {
                if (!cancelled) {
                    setPrLit(false);
                    setCiFailLit(false);
                }
                return;
            }
            if (!cancelled) setPrLit(true);

            const newest = recentWithPr[0];
            if (!newest) return;
            const outputs = (newest.outputs as unknown as SessionOutput[] | undefined) ?? [];
            const prOutput = outputs.find(o => o.type === 'pullRequest');
            if (prOutput?.type !== 'pullRequest') return;

            try {
                const parsed = await window.jules?.github.parsePrUrl(prOutput.pullRequest.url);
                if (!parsed || cancelled) return;
                const pr = await window.jules?.github.getPr(parsed.owner, parsed.repo, parsed.number) as JulesPrInfo | null | undefined;
                if (!pr || cancelled) return;
                const checks = await window.jules?.github.getChecks(parsed.owner, parsed.repo, pr.head.sha) as JulesChecksResponse | null | undefined;
                if (!cancelled && checks?.check_runs.some(r => r.conclusion === 'failure')) setCiFailLit(true);
            } catch { /* ignore */
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [sessions]);

    return (
        <div>
            <div
                onClick={onToggle}
                className={cn(
                    "flex items-center gap-3 py-3 px-3 mx-3 rounded-md cursor-pointer transition-colors select-none",
                    isOpen ? "bg-hover" : "hover:bg-hover/50",
                )}
            >
                <div className="w-2 shrink-0 flex items-center justify-center">
                    {activeCount > 0 ? (
                        <span className="relative flex h-1.5 w-1.5">
                            <span
                                className="animate-ping absolute inline-flex h-full w-full rounded-full bg-purple-400 opacity-60"/>
                            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-purple-500"/>
                        </span>
                    ) : (
                        <span className="h-1.5 w-1.5 rounded-full bg-fg-ghost/20"/>
                    )}
                </div>

                <span className="flex-1 text-[12px] text-fg-primary truncate">{repoName}</span>

                <div className="flex items-center gap-2.5 shrink-0 text-[10px] font-mono">
                    {sessions.length > 0 && <span className="text-fg-ghost">{sessions.length}s</span>}
                    {lastSession && <span className="text-fg-dim">{fmtAge(lastSession.createTime)}</span>}
                    {lastSession && (
                        <span className={cn(
                            "text-3xs uppercase tracking-widest",
                            ACTIVE_STATES.has(lastSession.state) ? "text-purple-400"
                                : lastSession.state === "failed" ? "text-red-400"
                                    : lastSession.state === "completed" ? "text-fg-ghost"
                                        : "text-fg-dim",
                        )}>
                            {lastSession.state}
                        </span>
                    )}
                    <GitPullRequest className={cn("h-3 w-3 shrink-0", prLit ? "text-purple-400" : "text-fg-ghost/20")}/>
                    <CircleX className={cn("h-3 w-3 shrink-0", ciFailLit ? "text-red-400" : "text-fg-ghost/20")}/>
                </div>

                <motion.div
                    animate={{rotate: isOpen ? 180 : 0}}
                    transition={{duration: 0.16}}
                    className="text-fg-ghost shrink-0"
                >
                    <ChevronDown className="h-3.5 w-3.5"/>
                </motion.div>
            </div>

            <AnimatePresence initial={false}>
                {isOpen && (
                    <motion.div
                        key="body"
                        initial={{height: 0, opacity: 0}}
                        animate={{height: "auto", opacity: 1}}
                        exit={{height: 0, opacity: 0}}
                        transition={{duration: 0.22, ease: [0.4, 0, 0.2, 1]}}
                        className="overflow-hidden"
                    >
                        <JulesSection
                            sessions={sessions}
                            onApplyPatch={(sessionId) => {
                                onApplyPatch(sessionId, source.id);
                            }}
                        />
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
