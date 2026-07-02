import {useEffect, useMemo, useState} from "react";
import {AnimatePresence, motion} from "framer-motion";
import {Archive, CheckCircle2, ChevronDown, Download, GitBranch, Loader2,} from "lucide-react";
import {formatDistanceToNow} from "date-fns";
import type {DiffFile} from "diff2html/lib-esm/types";
import {LineType} from "diff2html/lib-esm/types";
import {ScrollArea} from "@/ui/scroll-area";
import type {RepoPaletteItem} from "@/components/ship/RepoCommandPalette";
import {RepoCommandPalette} from "@/components/ship/RepoCommandPalette";
import {cn} from "@/utils";
import {useStore} from "@/store/app";
import {SyncManager} from "@/components/ship/SyncManager";
import {useSyncStore} from "@/store/sync";
import type {ActionState, ShipFile} from "@/store/ship";
import {useShipStore} from "@/store/ship";
import {useNotification} from "@/library/notification/use-notification";
import type {SessionResource} from "@jules";
import {jules} from "@jules";

// ── Types ──────────────────────────────────────────────────────────────────────

// ── Helpers ────────────────────────────────────────────────────────────────────

const STATUS_DOT: Record<ShipFile["changeType"], string> = {
    created: "bg-green-500",
    deleted: "bg-red-500",
    modified: "bg-yellow-500",
};

const ACTIVE_STATES = new Set([
    "queued", "planning", "inProgress",
    "awaitingPlanApproval", "awaitingUserFeedback", "paused",
]);

function fmtAge(createTime: string): string {
    try {
        return formatDistanceToNow(new Date(createTime), {addSuffix: true});
    } catch {
        return "";
    }
}

// ── DiffView ───────────────────────────────────────────────────────────────────

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

// ── ActionBtn ──────────────────────────────────────────────────────────────────

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

// ── Main Page ──────────────────────────────────────────────────────────────────

export default function ShipPage() {
    const sources = useStore(s => s.sources);
    const archivedSessionIds = useStore(s => s.archivedSessionIds);
    const [sessionList, setSessionList] = useState<SessionResource[]>([]);

    useEffect(() => {
        let active = true;
        const load = async () => {
            try {
                const list = await jules.sessions().all();
                if (active) {
                    setSessionList(list);
                }
            } catch (err) {
                console.error("Failed to load sessions:", err);
            }
        };
        void load();
        return () => {
            active = false;
        };
    }, []);

    const {
        sourceId,
        openPatchId,
        openFileKey,
        patchData,
        parsedDiffs,
        fileStates,
        snapshotStates,
        viewMode,
        lastSessionId,
        setSourceId,
        setViewMode,
        handlePatchClick,
        handleFileClick,
        handleGetFile,
        handleSnapshot,
    } = useShipStore();

    const {
        localRepoPath,
        loadLocalRepoPath,
        selectLocalFolder,
    } = useSyncStore();

    const notification = useNotification({
        onAction: (actionId, extraData) => {
            if (actionId === 'retry') {
                const {sessionId} = extraData as { sessionId: string };
                void applyPatch(sessionId);
            }
        },
    });

    const applyPatch = async (sessionId: string) => {
        const result = await handleSnapshot(sessionId, effectiveSourceId);
        if (!result) return;
        if (result.success) {
            notification.success({
                title: 'Patch applied',
                ...(result.branch ? {body: `\u2192 ${result.branch}`} : {}),
            });
        } else {
            notification.error({
                title: 'Patch failed',
                ...(result.error ? { body: result.error } : {}),
                actions: [{ id: 'retry', label: 'Retry', style: 'primary' as const }],
                extraData: {sessionId},
            });
        }
    };

    const effectiveSourceId = sourceId !== "" ? sourceId : (sources[0]?.id ?? "");

    // Load local repo path when sourceId changes
    useEffect(() => {
        if (effectiveSourceId) {
            void loadLocalRepoPath(effectiveSourceId);
        }
    }, [effectiveSourceId, loadLocalRepoPath]);

    // Spacebar reopens last session when nothing is open
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if (e.key !== " " || e.target !== document.body) return;
            if (openPatchId === "" && lastSessionId !== "") {
                e.preventDefault();
                handlePatchClick(lastSessionId);
            }
        };
        document.addEventListener("keydown", onKey);
        return () => { document.removeEventListener("keydown", onKey); };
    }, [openPatchId, lastSessionId, handlePatchClick]);

    const selectedSource = useMemo(
        () => sources.find(s => s.id === effectiveSourceId),
        [sources, effectiveSourceId],
    );

    const sessions = useMemo(() => {
        if (!selectedSource) return [];
        return sessionList
            .filter(s => {
                if (archivedSessionIds.includes(s.id)) return false;
                const sc = s.sourceContext as { source?: string } | undefined;
                return s.source.id === selectedSource.id
                    || sc?.source === selectedSource.name;
            })
            .sort((a, b) => new Date(b.createTime).getTime() - new Date(a.createTime).getTime());
    }, [sessionList, selectedSource, archivedSessionIds]);

    const loadedStats = useMemo(() => {
        let add = 0, del = 0;
        for (const s of sessions) {
            const d = patchData[s.id];
            if (d) {
                for (const f of d.files) {
                    add += f.additions;
                    del += f.deletions;
                }
            }
        }
        return {add, del};
    }, [sessions, patchData]);

    const activeCount = sessions.filter(s => ACTIVE_STATES.has(s.state)).length;

    const repoPaletteItems: RepoPaletteItem[] = sources.map(s => ({
        id: s.id,
        repo: s.githubRepo.repo,
    }));

    return (
        <div className="relative flex flex-col h-full overflow-hidden">

            <RepoCommandPalette
                items={repoPaletteItems}
                value={effectiveSourceId}
                onChange={setSourceId}
            />

            {/* ── Toolbar ───────────────────────────────────────────────────── */}
            <motion.div
                initial={{opacity: 0, y: -6}}
                animate={{opacity: 1, y: 0}}
                transition={{duration: 0.18}}
                className="flex items-center gap-3 px-6 pt-5 pb-4 shrink-0 relative z-10"
            >

                <div className="relative flex items-center shrink-0 rounded-full overflow-hidden">
                    <motion.div
                        className="absolute inset-y-0 w-1/2 rounded-full"
                        animate={{
                            x: viewMode === 'jules' ? '0%' : '100%',
                            backgroundColor: viewMode === 'jules'
                                ? 'rgba(168,85,247,0.18)'
                                : 'rgba(239,68,68,0.18)',
                        }}
                        transition={{type: "spring", stiffness: 380, damping: 32}}
                    />
                    <button
                        onClick={() => {
                            setViewMode('jules');
                        }}
                        className="relative z-10 px-3 py-1 text-[9px] font-mono font-bold uppercase tracking-wider transition-colors duration-200"
                        style={{color: viewMode === 'jules' ? 'rgb(216,180,254)' : 'var(--color-fg-ghost)'}}
                    >
                        Jules
                    </button>
                    <button
                        onClick={() => {
                            setViewMode('sync');
                        }}
                        className="relative z-10 px-3 py-1 text-[9px] font-mono font-bold uppercase tracking-wider transition-colors duration-200"
                        style={{color: viewMode === 'sync' ? 'rgb(252,165,165)' : 'var(--color-fg-ghost)'}}
                    >
                        Sync
                    </button>
                </div>

                <AnimatePresence>
                    {activeCount > 0 && (
                        <motion.div
                            key="activedot"
                            initial={{opacity: 0, scale: 0.6}}
                            animate={{opacity: 1, scale: 1}}
                            exit={{opacity: 0, scale: 0.6}}
                            transition={{type: "spring", stiffness: 300, damping: 22}}
                            className="flex items-center gap-1.5"
                        >
                            <span className="relative flex h-1.5 w-1.5">
                                <span
                                    className="animate-ping absolute inline-flex h-full w-full rounded-full bg-purple-400 opacity-60"/>
                                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-purple-500"/>
                            </span>
                            <span className="text-3xs font-mono text-purple-400 uppercase tracking-widest">
                                {activeCount} active
                            </span>
                        </motion.div>
                    )}
                </AnimatePresence>

                <div className="flex-1"/>

                {sessions.length > 0 && (
                    <div className="flex items-center gap-3 text-[10px] font-mono">
                        <span className="text-fg-dim">{sessions.length} sessions</span>
                        {loadedStats.add > 0 && <span className="text-green-400">+{loadedStats.add}</span>}
                        {loadedStats.del > 0 && <span className="text-red-400">-{loadedStats.del}</span>}
                    </div>
                )}
            </motion.div>

            {/* ── Page Content ──────────────────────────────────────────────── */}
            {viewMode === 'jules' ? (
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

                                            const prOutput = session.outputs.find(o => o.type === "pullRequest");
                                            const branch = prOutput?.type === "pullRequest"
                                                ? ((prOutput.pullRequest as { headRef?: string }).headRef ?? "")
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
                                                                <span
                                                                    className="h-1.5 w-1.5 rounded-full bg-fg-ghost/20"/>
                                                            )}
                                                        </div>

                                                        <div className="flex-1 min-w-0">
                                                        <span className="text-[12px] text-fg-primary block truncate">
                                                            {session.title || session.prompt.slice(0, 80)}
                                                        </span>
                                                            {branch && (
                                                                <div className="flex items-center gap-1.5 mt-0.5">
                                                                    <GitBranch
                                                                        className="h-2.5 w-2.5 text-fg-ghost shrink-0"/>
                                                                    <span
                                                                        className="text-3xs font-mono text-fg-ghost truncate">{branch}</span>
                                                                </div>
                                                            )}
                                                        </div>

                                                        <div
                                                            className="flex items-center gap-2.5 shrink-0 text-[10px] font-mono">
                                                            {data !== undefined && data !== null && (
                                                                <span
                                                                    className="text-fg-ghost">{data.files.length}f</span>
                                                            )}
                                                            {data && patchAdd > 0 &&
                                                                <span className="text-green-400">+{patchAdd}</span>}
                                                            {data && patchDel > 0 &&
                                                                <span className="text-red-400">-{patchDel}</span>}
                                                            <span
                                                                className="text-fg-dim">{fmtAge(session.createTime)}</span>
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
                                                                                        <AnimatePresence
                                                                                            initial={false}>
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
                                                                                    icon={<Archive
                                                                                        className="h-2.5 w-2.5"/>}
                                                                                    label="Snapshot"
                                                                                    busyLabel="Applying…"
                                                                                    doneLabel="Applied"
                                                                                    hoverCls="hover:text-fg-primary hover:border-subtle"
                                                                                    onClick={e => {
                                                                                        e.stopPropagation();
                                                                                        void applyPatch(session.id);
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
            ) : (
                <div className="flex-1 px-6 py-4 overflow-y-auto min-h-0">
                    {localRepoPath ? (
                        <SyncManager
                            repoPath={localRepoPath}
                            repoName={selectedSource ? `${selectedSource.githubRepo.owner}/${selectedSource.githubRepo.repo}` : 'Local Repository'}
                        />
                    ) : (
                        <div
                            className="bg-surface/30 border border-hair rounded-lg p-8 text-center flex flex-col items-center justify-center gap-4 max-w-sm mx-auto mt-8 backdrop-blur-sm">
                            <Archive className="h-8 w-8 text-fg-ghost opacity-60"/>
                            <div>
                                <h4 className="text-xxs font-bold uppercase tracking-wider text-fg-primary">
                                    Link Local Folder
                                </h4>
                                <p className="text-3xs text-fg-ghost mt-1.5 leading-relaxed">
                                    To use local git sync and backups, you must link this repository to its local
                                    directory on your device.
                                </p>
                            </div>
                            <button
                                onClick={() => {
                                    void selectLocalFolder(effectiveSourceId)
                                }}
                                className="px-4 py-1.5 bg-purple-600 text-white rounded border border-purple-500 text-3xs font-mono font-bold hover:bg-purple-700 transition-colors cursor-pointer"
                            >
                                Select Local Folder
                            </button>
                        </div>
                    )}
                </div>
            )}

            {selectedSource && (
                <span
                    className="absolute bottom-3 right-4 text-2xs font-mono text-fg-ghost/40 select-none pointer-events-none">
                    {selectedSource.githubRepo.repo}
                </span>
            )}
        </div>
    );
}
