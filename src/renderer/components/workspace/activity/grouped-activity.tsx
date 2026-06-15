import { memo, useState } from "react";
import { cn } from "@/utils";
import type { Activity, BashArtifact, ChangeSetArtifact, MediaArtifact } from "./types";
import { TerminalConsole } from "./terminal-console.tsx";
import { MediaItemDownloader } from "./activity-artifacts.tsx";
import { ChangeSetSummary } from "@/components/workspace/changeset-summary.tsx";
import { ChevronDown } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Markdown } from "./markdown.tsx";

const sr = (v: unknown): string => (typeof v === "string" ? v.trim() : "");

interface GroupedActivityProps {
    item: Activity[];
}

function CollapsibleProgress({ title, desc }: { title: string; desc: string }) {
    const [isOpen, setIsOpen] = useState(false);
    return (
        <div className="w-full max-w-2xl mx-auto border border-hair rounded-lg bg-surface/30 overflow-hidden shadow-sm transition-colors duration-200">
            {/* Header/Toggle */}
            <div
                onClick={() => { setIsOpen(!isOpen); }}
                className={cn(
                    "flex items-center justify-between py-2 px-4 cursor-pointer select-none transition-colors duration-150",
                    isOpen ? "bg-hover" : "hover:bg-hover/50"
                )}
            >
                <div className="flex items-center gap-2">
                    <span className="text-purple-400 text-xs">✦</span>
                    <span className="text-xs font-mono font-medium tracking-wide text-fg-secondary">
                        {title}
                    </span>
                </div>
                <motion.div
                    animate={{ rotate: isOpen ? 180 : 0 }}
                    transition={{ duration: 0.16 }}
                    className="text-fg-ghost shrink-0"
                >
                    <ChevronDown className="h-3.5 w-3.5" />
                </motion.div>
            </div>

            {/* Collapsible Content */}
            <AnimatePresence initial={false}>
                {isOpen && (
                    <motion.div
                        key="body"
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.22, ease: [0.4, 0, 0.2, 1] }}
                        className="overflow-hidden border-t border-hair bg-surface-raised/20"
                    >
                        <div className="p-4 text-[13px] text-fg-secondary leading-relaxed font-sans max-w-none select-text">
                            <Markdown>{desc}</Markdown>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

export const GroupedActivity = memo(
    function GroupedActivity({ item }: GroupedActivityProps) {
        const first = item[0];
        if (!first) return null;

        const segments: (
            | { type: "text"; list: { title: string; desc: string; time: string }[] }
            | { type: "collapsible"; title: string; desc: string; time: string }
            | { type: "bash"; bashOutputs: BashArtifact[] }
            | { type: "changeset"; artifact: ChangeSetArtifact }
            | { type: "media"; artifact: MediaArtifact; activityId: string; index: number }
        )[] = [];

        let lastChangeSet: ChangeSetArtifact | null = null;

        for (const a of item) {
            let title = "";
            let desc = "";
            if (a.type === "progressUpdated") {
                title = sr(a.title);
                desc = sr(a.description);
            }
            if (title || desc) {
                if (desc) {
                    segments.push({ type: "collapsible", title, desc, time: a.createTime });
                } else {
                    const last = segments[segments.length - 1];
                    if (last?.type === "text") {
                        last.list.push({ title, desc, time: a.createTime });
                    } else {
                        segments.push({ type: "text", list: [{ title, desc, time: a.createTime }] });
                    }
                }
            }

            const bashArtifacts = a.artifacts.filter((art): art is BashArtifact => art.type === "bashOutput");
            const mediaItems = a.artifacts.filter((art): art is MediaArtifact => art.type === "media");

            if (bashArtifacts.length > 0) {
                segments.push({ type: "bash", bashOutputs: bashArtifacts });
            }
            for (const med of mediaItems) {
                segments.push({ type: "media", artifact: med, activityId: a.id, index: segments.length });
            }

            const cs = [...a.artifacts].reverse().find((art): art is ChangeSetArtifact => art.type === "changeSet");
            if (cs) lastChangeSet = cs;
        }

        if (lastChangeSet) {
            segments.push({ type: "changeset", artifact: lastChangeSet });
        }

        return (
            <div className="w-full space-y-4">
                {segments.map((seg, idx) => {
                    switch (seg.type) {
                        case "text": {
                            const sentences = seg.list
                                .map((x) => x.title)
                                .filter(Boolean);

                            if (sentences.length === 0) return null;

                            return (
                                <div key={idx} className="w-full flex justify-center py-2 px-6">
                                    <p className="text-[10px] md:text-3xs font-mono font-medium tracking-wide text-fg-dim/80 text-center max-w-2xl leading-relaxed select-none">
                                        <span className="text-purple-400">✦ </span>
                                        {sentences.map((sentence, sIdx) => (
                                            <span key={sIdx}>
                                                {sIdx > 0 && <span className="mx-2 text-purple-500/50">•</span>}
                                                <span className="text-fg-secondary">
                                                    {sentence}
                                                </span>
                                            </span>
                                        ))}
                                    </p>
                                </div>
                            );
                        }
                        case "collapsible":
                            return (
                                <div key={idx} className="w-full max-w-3xl mx-auto py-1 animate-in slide-in-from-bottom-2 duration-500">
                                    <CollapsibleProgress title={seg.title} desc={seg.desc} />
                                </div>
                            );
                        case "bash":
                            return (
                                <div key={idx} className="w-full max-w-3xl mx-auto animate-in zoom-in-95 duration-500">
                                    <TerminalConsole bashOutputs={seg.bashOutputs} />
                                </div>
                            );
                        case "changeset":
                            return (
                                <div
                                    key={idx}
                                    className="w-full max-w-3xl mx-auto animate-in slide-in-from-bottom-2 duration-500"
                                >
                                    <ChangeSetSummary artifact={seg.artifact} />
                                </div>
                            );
                        case "media":
                            return (
                                <div
                                    key={idx}
                                    className="w-full max-w-3xl mx-auto animate-in slide-in-from-bottom-2 duration-500"
                                >
                                    <MediaItemDownloader
                                        media={seg.artifact}
                                        activityId={seg.activityId}
                                        index={seg.index}
                                    />
                                </div>
                            );
                        default:
                            return null;
                    }
                })}
            </div>
        );
    },
    (prevProps, nextProps) => {
        if (prevProps.item.length !== nextProps.item.length) return false;
        return prevProps.item.every((prev, idx) => {
            const next = nextProps.item[idx];
            if (!next) return false;
            return prev.id === next.id && JSON.stringify(prev) === JSON.stringify(next);
        });
    }
);
