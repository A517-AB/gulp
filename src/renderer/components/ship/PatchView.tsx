import {AnimatePresence, motion} from "framer-motion";
import {Archive, CheckCircle2, ChevronDown, Download, GitBranch, Loader2,} from "lucide-react";
import {formatDistanceToNow} from "date-fns";
import type {DiffFile} from "diff2html/lib-esm/types";
import {LineType} from "diff2html/lib-esm/types";
import type {SessionResource} from "@jules";
import {ScrollArea} from "@/ui/scroll-area";
import {cn} from "@/utils";
import type {ActionState, ShipFile} from "@/store/ship";
import {useShipStore} from "@/store/ship";

import {ACTIVE_STATES} from "./constants";

const STATUS_DOT: Record<ShipFile["changeType"], string> = {
    created: "bg-green-500",
    deleted: "bg-red-500",
    modified: "bg-yellow-500",
};

function fmtAge(createTime: string): string {
    try {
        return formatDistanceToNow(new Date(createTime), {addSuffix: true});
    } catch {
        return "";
    }
}

function DiffView({diffFile}: { diffFile: DiffFile }) {
    return (
        <div className="overflow-x-auto bg-base/60 border-t border-hair">
            {diffFile.blocks.map((block, bi) => (
                <div key={bi}>
                    <div
                        className="px-3 py-1 text-3xs font-mono text-purple-400/70 bg-purple-500/5 border-b border-hair select-none">
                        {block.header}
                    </div>
                    {block.lines.map((line, li) => (
                        <div
                            key={li}
                            className={cn(
                                "flex text-3xs font-mono leading-5",
                                line.type === LineType.INSERT && "bg-green-500/8",
                                line.type === LineType.DELETE && "bg-red-500/8",
                            )}
                        >
                            <span
                                className="w-9 shrink-0 pr-2 py-0.5 text-right text-fg-ghost/30 border-r border-hair select-none tabular-nums">
                                {line.type !== LineType.INSERT ? line.oldNumber : ""}
                            </span>
                            <span
                                className="w-9 shrink-0 pr-2 py-0.5 text-right text-fg-ghost/30 border-r border-hair select-none tabular-nums">
                                {line.type !== LineType.DELETE ? line.newNumber : ""}
                            </span>
                            <span className={cn(
                                "w-5 shrink-0 text-center py-0.5 select-none border-r border-hair",
                                line.type === LineType.INSERT && "text-green-400",
                                line.type === LineType.DELETE && "text-red-400",
                                line.type === LineType.CONTEXT && "text-fg-ghost/30",
                            )}>
                                {line.type === LineType.INSERT ? "+" : line.type === LineType.DELETE ? "-" : ""}
                            </span>
                            <span className={cn(
                                "flex-1 px-3 py-0.5 whitespace-pre",
                                line.type === LineType.INSERT && "text-green-300",
                                line.type === LineType.DELETE && "text-red-300",
                                line.type === LineType.CONTEXT && "text-fg-dim",
                            )}>
                                {line.content.slice(1)}
                            </span>
                        </div>
                    ))}
                </div>
            ))}
        </div>
    );
}

function ActionBtn({
                       state, icon, label, busyLabel, doneLabel, hoverCls, onClick,
                   }: {
    state: ActionState;
    icon: React.ReactNode;
    label: string;
    busyLabel?: string;
    doneLabel?: string;
    hoverCls: string;
    onClick: (e: React.MouseEvent) => void;
}) {
    const isDone = state === "done";
    const isBusy = state === "busy";
    return (
        <motion.button
            whileTap={{scale: 0.93}}
            onClick={onClick}
            disabled={isBusy || isDone}
            className={cn(
                "flex items-center gap-1 px-2 py-0.5 rounded border text-[10px] font-mono transition-all",
                isDone
                    ? "text-green-400 border-green-500/30 bg-green-500/5"
                    : cn("text-fg-ghost border-hair", hoverCls),
            )}
        >
            {isBusy
                ? <Loader2 className="h-2.5 w-2.5 animate-spin"/>
                : isDone
                    ? <CheckCircle2 className="h-2.5 w-2.5"/>
                    : icon}
            <span>{isBusy ? (busyLabel ?? label) : isDone ? (doneLabel ?? "Done") : label}</span>
        </motion.button>
    );
}

interface PatchViewProps {
    sessions: SessionResource[];
    effectiveSourceId: string;
}

export function PatchView({sessions, effectiveSourceId}: PatchViewProps) {
    const {
        openPatchId,
        openFileKey,
        patchData,
        parsedDiffs,
        fileStates,
        snapshotStates,
        handlePatchClick,
        handleFileClick,
        handleGetFile,
        handleSnapshot,
    } = useShipStore();

    return (
        <AnimatePresence mode="wait">
            <motion.div
                key={effectiveSourceId}
                initial={{opacity: 0}}
                animate={{opacity: 1}}
                exit={{opacity: 0}}
                transition={{duration: 0.15}}
                className="flex-1 overflow-hidden"
            >
                <ScrollArea className="h-full">
                    <div className="px-6 py-4">
                        {sessions.length === 0 ? (
                            <motion.p
                                initial={{opacity: 0}}
                                animate={{opacity: 1}}
                                transition={{delay: 0.1}}
                                className="text-[10px] font-mono text-fg-ghost uppercase tracking-widest text-center py-16"
                            >
                                No sessions
                            </motion.p>
                        ) : (
                            <div className="space-y-px">
                                {sessions.map((session, si) => {
                                    const isOpen = openPatchId === session.id;
                                    const isActive = ACTIVE_STATES.has(session.state);
                                    const data = patchData[session.id];
                                    const snapshotState = snapshotStates[session.id] ?? "idle";
                                    const files = data?.files ?? [];
                                    const patchAdd = files.reduce((s, f) => s + f.additions, 0);
                                    const patchDel = files.reduce((s, f) => s + f.deletions, 0);

                                    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
                                    const prOutput = session.outputs?.find(o => o.type === "pullRequest");
                                    const branch = prOutput?.type === "pullRequest"
                                        // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
                                        ? (prOutput.pullRequest?.headRef ?? "")
                                        : "";

                                    return (
                                        <motion.div
                                            key={session.id}
                                            initial={{opacity: 0, y: 8}}
                                            animate={{opacity: 1, y: 0}}
                                            transition={{duration: 0.18, delay: si * 0.06}}
                                        >
                                            {/* Session row */}
                                            <div
                                                onClick={() => {
                                                    handlePatchClick(session.id);
                                                }}
                                                className={cn(
                                                    "flex items-center gap-3 py-3 px-3 rounded-md cursor-pointer transition-colors select-none",
                                                    isOpen ? "bg-hover" : "hover:bg-hover/50",
                                                )}
                                            >
                                                <div className="w-2 shrink-0 flex items-center justify-center">
                                                    {isActive ? (
                                                        <span className="relative flex h-1.5 w-1.5">
                                                            <span
                                                                className="animate-ping absolute inline-flex h-full w-full rounded-full bg-purple-400 opacity-60"/>
                                                            <span
                                                                className="relative inline-flex h-1.5 w-1.5 rounded-full bg-purple-500"/>
                                                        </span>
                                                    ) : (
                                                        <span className="h-1.5 w-1.5 rounded-full bg-fg-ghost/20"/>
                                                    )}
                                                </div>

                                                <div className="flex-1 min-w-0">
                                                    <span
                                                        className="text-[12px] font-semibold text-fg-primary block truncate">
                                                        {/* eslint-disable-next-line @typescript-eslint/no-unnecessary-condition */}
                                                        {session.title || session.prompt?.slice(0, 80) || ""}
                                                    </span>
                                                    {branch && (
                                                        <div className="flex items-center gap-1.5 mt-0.5">
                                                            <GitBranch className="h-2.5 w-2.5 text-fg-ghost shrink-0"/>
                                                            <span
                                                                className="text-3xs font-mono text-fg-ghost truncate">{branch}</span>
                                                        </div>
                                                    )}
                                                </div>

                                                <div
                                                    className="flex items-center gap-2.5 shrink-0 text-[10px] font-mono">
                                                    {data !== undefined && data !== null && (
                                                        <span className="text-fg-ghost">{data.files.length}f</span>
                                                    )}
                                                    {data && patchAdd > 0 &&
                                                        <span className="text-green-400">+{patchAdd}</span>}
                                                    {data && patchDel > 0 &&
                                                        <span className="text-red-400">-{patchDel}</span>}
                                                    <span className="text-fg-dim">{fmtAge(session.createTime)}</span>
                                                    <span className={cn(
                                                        "text-3xs uppercase tracking-widest",
                                                        isActive ? "text-purple-400"
                                                            : session.state === "failed" ? "text-red-400"
                                                                : session.state === "completed" ? "text-fg-ghost"
                                                                    : "text-fg-dim",
                                                    )}>
                                                        {session.state}
                                                    </span>
                                                </div>

                                                <motion.div
                                                    animate={{rotate: isOpen ? 180 : 0}}
                                                    transition={{duration: 0.16}}
                                                    className="text-fg-ghost shrink-0"
                                                >
                                                    <ChevronDown className="h-3.5 w-3.5"/>
                                                </motion.div>
                                            </div>

                                            {/* Expanded: files + inline diffs */}
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
                                                        <div className="overflow-hidden">
                                                            {data === null ? (
                                                                <p className="text-[10px] font-mono text-fg-ghost text-center py-6">
                                                                    No changeset
                                                                </p>
                                                            ) : data && data.files.length > 0 ? (
                                                                <>
                                                                    {data.files.map((file, fi) => {
                                                                        const key = `${session.id}/${file.path}`;
                                                                        const getState = fileStates[key] ?? "idle";
                                                                        const isFileOpen = openFileKey === key;
                                                                        const firstDiff = parsedDiffs[key]?.[0];
                                                                        const slashIdx = file.path.lastIndexOf("/");
                                                                        const dir = slashIdx >= 0 ? file.path.slice(0, slashIdx + 1) : "";
                                                                        const name = slashIdx >= 0 ? file.path.slice(slashIdx + 1) : file.path;

                                                                        return (
                                                                            <motion.div
                                                                                key={file.path}
                                                                                initial={{opacity: 0, x: -5}}
                                                                                animate={{opacity: 1, x: 0}}
                                                                                transition={{
                                                                                    duration: 0.14,
                                                                                    delay: fi * 0.045
                                                                                }}
                                                                                className={fi > 0 ? "border-t border-hair" : ""}
                                                                            >
                                                                                {/* File row */}
                                                                                <div
                                                                                    onClick={e => {
                                                                                        e.stopPropagation();
                                                                                        handleFileClick(session.id, file, data.patch);
                                                                                    }}
                                                                                    className="flex items-center gap-3 px-4 py-2.5 group/file transition-colors hover:bg-hover/60 cursor-pointer"
                                                                                >
                                                                                    <motion.div
                                                                                        animate={{rotate: isFileOpen ? 90 : 0}}
                                                                                        transition={{duration: 0.14}}
                                                                                        className="text-fg-ghost/40 shrink-0"
                                                                                    >
                                                                                        <ChevronDown
                                                                                            className="h-3 w-3 -rotate-90"/>
                                                                                    </motion.div>

                                                                                    <span
                                                                                        className={cn("h-1.5 w-1.5 rounded-full shrink-0 mt-px", STATUS_DOT[file.changeType])}/>

                                                                                    <span
                                                                                        className="flex-1 min-w-0 text-[11px] font-mono truncate">
                                                                                        <span
                                                                                            className="text-fg-ghost">{dir}</span>
                                                                                        <span
                                                                                            className="text-fg-primary font-semibold">{name}</span>
                                                                                    </span>

                                                                                    <div
                                                                                        className="flex items-center gap-2 shrink-0 text-[10px] font-mono">
                                                                                        {file.changeType !== "deleted" && (
                                                                                            <span
                                                                                                className="text-green-400">+{file.additions}</span>
                                                                                        )}
                                                                                        {file.changeType !== "created" && (
                                                                                            <span
                                                                                                className="text-red-400">-{file.deletions}</span>
                                                                                        )}
                                                                                    </div>

                                                                                    <div
                                                                                        className="flex items-center gap-1 opacity-0 group-hover/file:opacity-100 transition-opacity shrink-0"
                                                                                        onClick={e => {
                                                                                            e.stopPropagation();
                                                                                        }}
                                                                                    >
                                                                                        <ActionBtn
                                                                                            state={getState}
                                                                                            icon={<Download
                                                                                                className="h-2.5 w-2.5"/>}
                                                                                            label="Get"
                                                                                            busyLabel="Saving"
                                                                                            doneLabel="Saved"
                                                                                            hoverCls="hover:text-cyan-400 hover:border-cyan-500/30"
                                                                                            onClick={e => {
                                                                                                e.stopPropagation();
                                                                                                void handleGetFile(session.id, file);
                                                                                            }}
                                                                                        />
                                                                                    </div>
                                                                                </div>

                                                                                {/* Inline diff */}
                                                                                <AnimatePresence initial={false}>
                                                                                    {isFileOpen && firstDiff && (
                                                                                        <motion.div
                                                                                            key="diff"
                                                                                            initial={{
                                                                                                height: 0,
                                                                                                opacity: 0
                                                                                            }}
                                                                                            animate={{
                                                                                                height: "auto",
                                                                                                opacity: 1
                                                                                            }}
                                                                                            exit={{
                                                                                                height: 0,
                                                                                                opacity: 0
                                                                                            }}
                                                                                            transition={{
                                                                                                duration: 0.18,
                                                                                                ease: [0.4, 0, 0.2, 1]
                                                                                            }}
                                                                                            className="overflow-hidden"
                                                                                        >
                                                                                            <DiffView
                                                                                                diffFile={firstDiff}/>
                                                                                        </motion.div>
                                                                                    )}
                                                                                </AnimatePresence>
                                                                            </motion.div>
                                                                        );
                                                                    })}

                                                                    {/* Patch footer */}
                                                                    <motion.div
                                                                        initial={{opacity: 0}}
                                                                        animate={{opacity: 1}}
                                                                        transition={{delay: data.files.length * 0.045 + 0.05}}
                                                                        className="border-t border-hair px-4 py-2.5 flex items-center justify-between"
                                                                    >
                                                                        <span
                                                                            className="text-3xs font-mono text-fg-ghost uppercase tracking-widest">
                                                                            {data.files.length} file{data.files.length !== 1 ? "s" : ""} changed
                                                                        </span>

                                                                        <ActionBtn
                                                                            state={snapshotState}
                                                                            icon={<Archive className="h-2.5 w-2.5"/>}
                                                                            label="Snapshot"
                                                                            busyLabel="Applying…"
                                                                            doneLabel="Applied"
                                                                            hoverCls="hover:text-fg-primary hover:border-subtle"
                                                                            onClick={e => {
                                                                                e.stopPropagation();
                                                                                void handleSnapshot(session.id, effectiveSourceId);
                                                                            }}
                                                                        />
                                                                    </motion.div>
                                                                </>
                                                            ) : null}
                                                        </div>
                                                    </motion.div>
                                                )}
                                            </AnimatePresence>
                                        </motion.div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </ScrollArea>
            </motion.div>
        </AnimatePresence>
    );
}
