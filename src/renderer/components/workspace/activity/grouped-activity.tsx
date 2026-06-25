import {memo, useState} from "react";
import {cn} from "@/utils";
import type {Activity, BashArtifact, ChangeSetArtifact, MediaArtifact} from "./types";
import {TerminalConsole} from "./terminal-console.tsx";
import {MediaItemDownloader} from "./activity-artifacts.tsx";
import {ChangeSetSummary} from "@/components/workspace/changeset-summary.tsx";
import {ChevronDown, Terminal} from "lucide-react";
import {AnimatePresence, motion} from "framer-motion";
import {Markdown} from "./markdown.tsx";

type UnifiedLine =
    | { kind: "progress"; text: string }
    | { kind: "bash"; command: string; stdout: string; exitCode: number | null }

function buildUnifiedLines(items: Activity[]): UnifiedLine[] {
    const lines: UnifiedLine[] = []
    for (const a of items) {
        if (a.type === "progressUpdated") {
            const text = typeof a.title === "string" ? a.title.trim() : ""
            if (text) lines.push({ kind: "progress", text })
        }
        for (const art of a.artifacts) {
            if (art.type === "bashOutput") {
                const b = art as unknown as BashArtifact
                lines.push({kind: "bash", command: b.command, stdout: b.stdout, exitCode: b.exitCode ?? null})
            }
        }
    }
    return lines
}

function UnifiedTerminal({ items }: { items: Activity[] }) {
    const [open, setOpen] = useState(true)
    const lines = buildUnifiedLines(items)
    if (lines.length === 0) return null

    return (
        <div className="w-full max-w-3xl mx-auto mt-2">
            <button
                onClick={() => { setOpen(o => !o) }}
                className="flex items-center gap-1.5 text-2xs font-mono text-fg-ghost hover:text-fg-muted transition-colors py-1"
            >
                <Terminal className="h-3 w-3" />
                <span>{open ? "hide" : "full terminal"}</span>
                <motion.span animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.15 }}>
                    <ChevronDown className="h-3 w-3" />
                </motion.span>
            </button>
            <AnimatePresence initial={false}>
                {open && (
                    <motion.div
                        key="unified"
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.18 }}
                        className="overflow-hidden"
                    >
                        <div className="rounded-lg border border-zinc-800/60 bg-zinc-950/95 font-mono text-[11px] overflow-hidden shadow-xl">
                            <div className="flex items-center gap-1.5 px-3 py-2 bg-zinc-900/80 border-b border-zinc-800/30 select-none">
                                <span className="w-2.5 h-2.5 rounded-full bg-red-500/60" />
                                <span className="w-2.5 h-2.5 rounded-full bg-yellow-500/60" />
                                <span className="w-2.5 h-2.5 rounded-full bg-green-500/60" />
                                <span className="text-zinc-500 text-[10px] ml-2">jules@vm: ~</span>
                            </div>
                            <div className="p-4 max-h-[480px] overflow-y-auto space-y-1.5 scrollbar-thin bg-zinc-950/85">
                                {lines.map((line, idx) =>
                                    line.kind === "progress" ? (
                                        <div key={idx} className="text-zinc-600 leading-relaxed">
                                            <span className="text-zinc-700"># </span>{line.text}
                                        </div>
                                    ) : (
                                        <div key={idx} className="mt-2">
                                            <div className="flex items-start gap-1">
                                                <span className="text-purple-400 font-bold shrink-0">$</span>
                                                <span className="text-zinc-100 font-bold break-all">{line.command}</span>
                                            </div>
                                            {line.stdout && (
                                                <div className="text-green-400/90 mt-1 pl-3 border-l border-zinc-800 whitespace-pre-wrap break-all leading-relaxed">
                                                    {line.stdout.trim()}
                                                </div>
                                            )}
                                            {line.exitCode !== null && (
                                                <div className={`mt-1 pl-3 text-[10px] font-bold ${line.exitCode === 0 ? "text-green-500/60" : "text-red-500/70"}`}>
                                                    {line.exitCode === 0 ? "✔ exit 0" : `✘ exit ${line.exitCode}`}
                                                </div>
                                            )}
                                        </div>
                                    )
                                )}
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    )
}

const sr = (v: unknown): string => (typeof v === "string" ? v.trim() : "");

interface GroupedActivityProps {
    item: Activity[];
}

function CollapsibleProgress({ title, desc }: { title: string; desc: string }) {
    const [isOpen, setIsOpen] = useState(false);
    return (
        <div className="w-full">
            <div
                onClick={() => { setIsOpen(!isOpen); }}
                className={cn("flex items-center justify-between py-2 px-3 cursor-pointer select-none transition-colors duration-150 rounded-md", isOpen ? "bg-hover/40" : "hover:bg-hover/20")}
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
                    className="text-fg-ghost shrink-0 ml-8"
                >
                    <ChevronDown className="h-3.5 w-3.5" />
                </motion.div>
            </div>
            <AnimatePresence initial={false}>
                {isOpen && (
                    <motion.div
                        key="body"
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.22, ease: [0.4, 0, 0.2, 1] }}
                        className="overflow-hidden"
                    >
                        <div className="pl-6 pr-3 py-3 border-l-2 border-purple-500/20 ml-3 mt-1 text-[13px] text-fg-secondary leading-relaxed font-sans max-w-none select-text">
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
                <UnifiedTerminal items={item} />
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
                                <div key={idx} className="w-full max-w-3xl mx-auto py-1">
                                    <CollapsibleProgress title={seg.title} desc={seg.desc} />
                                </div>
                            );
                        case "bash":
                            return (
                                <div key={idx} className="w-full max-w-3xl mx-auto">
                                    <TerminalConsole bashOutputs={seg.bashOutputs} />
                                </div>
                            );
                        case "changeset":
                            return (
                                <div key={idx} className="w-full max-w-3xl mx-auto">
                                    <ChangeSetSummary artifact={seg.artifact} />
                                </div>
                            );
                        case "media":
                            return (
                                <div key={idx} className="w-full max-w-3xl mx-auto">
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
