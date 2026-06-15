import {useState, useMemo} from "react";
import {AnimatePresence, motion} from "framer-motion";
import {
    Archive,
    CheckCircle2,
    ChevronDown,
    Download,
    GitBranch,
    Loader2,
} from "lucide-react";
import {formatDistanceToNow} from "date-fns";
import {parse as parseDiff} from "diff2html";
import type {DiffFile} from "diff2html/lib-esm/types";
import {LineType} from "diff2html/lib-esm/types";
import {toast} from "sonner";
import {ScrollArea} from "@/ui/scroll-area";
import {Dropdown} from "@/components/ship/Dropdown";
import {cn} from "@/utils";
import {useStore} from "@/store/app";
import {sdkIpc, filesystem, store} from "@shared/bridge";
import type {ParsedFile} from "@jules";

// ── Types ──────────────────────────────────────────────────────────────────────

type ActionState = "idle" | "busy" | "done";
interface PatchEntry { files: ParsedFile[]; patch: string }

// ── Helpers ────────────────────────────────────────────────────────────────────

const STORE_KEY = "ship.repoPaths";

const STATUS_DOT: Record<ParsedFile["changeType"], string> = {
    created:  "bg-green-500",
    deleted:  "bg-red-500",
    modified: "bg-yellow-500",
};

const ACTIVE_STATES = new Set([
    "queued", "planning", "inProgress",
    "awaitingPlanApproval", "awaitingUserFeedback", "paused",
]);

function toBase64(text: string): string {
    const bytes = new TextEncoder().encode(text);
    let binary = "";
    for (let i = 0; i < bytes.length; i += 8192) {
        binary += String.fromCharCode(...bytes.subarray(i, Math.min(i + 8192, bytes.length)));
    }
    return btoa(binary);
}

function extractFilePatch(unidiff: string, filePath: string): string {
    const sections = unidiff.split(/(?=^diff --git )/m).filter(Boolean);
    return sections.find(s => s.includes(`b/${filePath}`) || s.includes(`/${filePath}`)) ?? "";
}

function fmtAge(createTime: string): string {
    try {
        return formatDistanceToNow(new Date(createTime), {addSuffix: true});
    } catch {
        return "";
    }
}

// ── DiffView ───────────────────────────────────────────────────────────────────

function DiffView({diffFile}: {diffFile: DiffFile}) {
    return (
        <div className="overflow-x-auto bg-base/60 border-t border-hair">
            {diffFile.blocks.map((block, bi) => (
                <div key={bi}>
                    <div className="px-3 py-1 text-3xs font-mono text-purple-400/70 bg-purple-500/5 border-b border-hair select-none">
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
                            <span className="w-9 shrink-0 pr-2 py-0.5 text-right text-fg-ghost/30 border-r border-hair select-none tabular-nums">
                                {line.type !== LineType.INSERT ? line.oldNumber : ""}
                            </span>
                            <span className="w-9 shrink-0 pr-2 py-0.5 text-right text-fg-ghost/30 border-r border-hair select-none tabular-nums">
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
    const sources     = useStore(s => s.sources);
    const sessionList = useStore(s => s.sessionList);

    const [sourceId,       setSourceId]       = useState("");
    const [openPatchId,    setOpenPatchId]    = useState("");
    const [openFileKey,    setOpenFileKey]    = useState("");
    const [patchData,      setPatchData]      = useState<Record<string, PatchEntry | null>>({});
    const [patchLoading,   setPatchLoading]   = useState<Record<string, boolean>>({});
    const [parsedDiffs,    setParsedDiffs]    = useState<Record<string, DiffFile[]>>({});
    const [fileStates,     setFileStates]     = useState<Record<string, ActionState>>({});
    const [snapshotStates, setSnapshotStates] = useState<Record<string, ActionState>>({});

    const effectiveSourceId = sourceId !== "" ? sourceId : (sources[0]?.id ?? "");

    const selectedSource = useMemo(
        () => sources.find(s => s.id === effectiveSourceId),
        [sources, effectiveSourceId],
    );

    const sessions = useMemo(() => {
        if (!selectedSource) return [];
        return sessionList
            .filter(s => {
                if (s.archived) return false;
                const sc = s.sourceContext as { source?: string } | undefined;
                return s.source?.id === selectedSource.id
                    || sc?.source === selectedSource.name;
            })
            .sort((a, b) => new Date(b.createTime).getTime() - new Date(a.createTime).getTime());
    }, [sessionList, selectedSource]);

    async function loadPatch(sessionId: string) {
        if (patchData[sessionId] !== undefined || patchLoading[sessionId] || !sdkIpc) return;
        setPatchLoading(p => ({...p, [sessionId]: true}));
        try {
            await sdkIpc.activities.hydrate(sessionId);
            const activities = await sdkIpc.activities.select(sessionId);

            let patch: string | null = null;
            outer: for (const act of [...activities].reverse()) {
                for (const art of [...act.artifacts].reverse()) {
                    if (art.type === "changeSet") {
                        if (art.gitPatch.unidiffPatch) {
                            patch = art.gitPatch.unidiffPatch;
                            break outer;
                        }
                    }
                }
            }

            if (patch) {
                const files = await sdkIpc.artifact.parseUnidiff(patch);
                setPatchData(p => ({...p, [sessionId]: {files, patch}}));
            } else {
                setPatchData(p => ({...p, [sessionId]: null}));
            }
        } catch {
            setPatchData(p => ({...p, [sessionId]: null}));
        } finally {
            setPatchLoading(p => ({...p, [sessionId]: false}));
        }
    }

    function handlePatchClick(sessionId: string) {
        if (openPatchId === sessionId) {
            setOpenPatchId("");
            setOpenFileKey("");
        } else {
            setOpenPatchId(sessionId);
            setOpenFileKey("");
            void loadPatch(sessionId);
        }
    }

    function handleFileClick(sessionId: string, file: ParsedFile, patch: string) {
        const key = `${sessionId}/${file.path}`;
        if (openFileKey === key) {
            setOpenFileKey("");
            return;
        }
        setOpenFileKey(key);
        if (!parsedDiffs[key]) {
            const section = extractFilePatch(patch, file.path) || patch;
            const parsed  = parseDiff(section, {drawFileList: false, outputFormat: "line-by-line"});
            if (parsed.length > 0) {
                setParsedDiffs(p => ({...p, [key]: parsed}));
            }
        }
    }

    async function handleGetFile(sessionId: string, file: ParsedFile) {
        const key  = `${sessionId}/${file.path}`;
        const data = patchData[sessionId];
        if (!data || !filesystem || !sdkIpc) return;
        setFileStates(p => ({...p, [key]: "busy"}));
        const toastId = `get-${key}`;
        const name    = file.path.split("/").pop() ?? "file";
        toast.loading(`Saving ${name}…`, {id: toastId});
        try {
            const savePath = await filesystem.showSaveDialog(`${name}.patch`);
            if (!savePath) {
                toast.dismiss(toastId);
                setFileStates(p => ({...p, [key]: "idle"}));
                return;
            }
            const filePatch = extractFilePatch(data.patch, file.path) || data.patch;
            await sdkIpc.artifact.save(toBase64(filePatch), savePath);
            toast.success("Saved", {id: toastId});
            setFileStates(p => ({...p, [key]: "done"}));
            setTimeout(() => { setFileStates(p => ({...p, [key]: "idle"})); }, 1800);
        } catch {
            toast.error("Save failed", {id: toastId});
            setFileStates(p => ({...p, [key]: "idle"}));
        }
    }

    async function handleSnapshot(sessionId: string) {
        if (!sdkIpc || !filesystem) return;

        const storeKey = `${STORE_KEY}.${effectiveSourceId}`;
        let cwd: string | null = null;

        if (store) {
            const stored = await store.get(storeKey);
            if (typeof stored === "string" && stored) cwd = stored;
        }

        if (!cwd) {
            cwd = await filesystem.showOpenDialog();
            if (!cwd) return;
            if (store) await store.set(storeKey, cwd);
        }

        const toastId = `snap-${sessionId}`;
        toast.loading("Applying patch…", {id: toastId});
        setSnapshotStates(p => ({...p, [sessionId]: "busy"}));
        try {
            const result = await sdkIpc.session.applyPatch(sessionId, {cwd});
            if (result.success) {
                toast.success(result.branch ? `Applied → ${result.branch}` : "Patch applied", {id: toastId});
                setSnapshotStates(p => ({...p, [sessionId]: "done"}));
                setTimeout(() => { setSnapshotStates(p => ({...p, [sessionId]: "idle"})); }, 2500);
            } else {
                toast.error(result.error ?? "Patch failed", {id: toastId});
                setSnapshotStates(p => ({...p, [sessionId]: "idle"}));
            }
        } catch {
            toast.error("Snapshot failed", {id: toastId});
            setSnapshotStates(p => ({...p, [sessionId]: "idle"}));
        }
    }

    const loadedStats = useMemo(() => {
        let add = 0, del = 0;
        for (const s of sessions) {
            const d = patchData[s.id];
            if (d) { for (const f of d.files) { add += f.additions; del += f.deletions; } }
        }
        return {add, del};
    }, [sessions, patchData]);

    const activeCount = sessions.filter(s => ACTIVE_STATES.has(s.state)).length;

    return (
        <div className="flex flex-col h-full overflow-hidden">

            {/* ── Toolbar ───────────────────────────────────────────────────── */}
            <motion.div
                initial={{opacity: 0, y: -6}}
                animate={{opacity: 1, y: 0}}
                transition={{duration: 0.18}}
                className="flex items-center gap-3 px-6 pt-5 pb-4 shrink-0"
            >
                <Dropdown
                    items={sources.map(s => ({
                        id: s.id,
                        label: `${s.githubRepo.owner}/${s.githubRepo.repo}`,
                        ...(s.githubRepo.defaultBranch ? {meta: s.githubRepo.defaultBranch} : {}),
                    }))}
                    value={effectiveSourceId}
                    onChange={id => { setSourceId(id); setOpenPatchId(""); setOpenFileKey(""); }}
                    placeholder="select repo"
                    emptyMessage="No repos found"
                />

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
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-purple-400 opacity-60"/>
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

            {/* ── Session list ──────────────────────────────────────────────── */}
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
                                        const isOpen        = openPatchId === session.id;
                                        const isActive      = ACTIVE_STATES.has(session.state);
                                        const data          = patchData[session.id];
                                        const isLoading     = patchLoading[session.id] ?? false;
                                        const snapshotState = snapshotStates[session.id] ?? "idle";
                                        const files         = data?.files ?? [];
                                        const patchAdd      = files.reduce((s, f) => s + f.additions, 0);
                                        const patchDel      = files.reduce((s, f) => s + f.deletions, 0);

                                        const prOutput = session.outputs.find(o => o.type === "pullRequest");
                                        const branch   = prOutput?.type === "pullRequest"
                                            ? (prOutput.pullRequest.headRef ?? "")
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
                                                    onClick={() => { handlePatchClick(session.id); }}
                                                    className={cn(
                                                        "flex items-center gap-3 py-3 px-3 rounded-md cursor-pointer transition-colors select-none",
                                                        isOpen ? "bg-hover" : "hover:bg-hover/50",
                                                    )}
                                                >
                                                    <div className="w-2 shrink-0 flex items-center justify-center">
                                                        {isActive ? (
                                                            <span className="relative flex h-1.5 w-1.5">
                                                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-purple-400 opacity-60"/>
                                                                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-purple-500"/>
                                                            </span>
                                                        ) : (
                                                            <span className="h-1.5 w-1.5 rounded-full bg-fg-ghost/20"/>
                                                        )}
                                                    </div>

                                                    <div className="flex-1 min-w-0">
                                                        <span className="text-[12px] font-semibold text-fg-primary block truncate">
                                                            {session.title || session.prompt.slice(0, 80)}
                                                        </span>
                                                        {branch && (
                                                            <div className="flex items-center gap-1.5 mt-0.5">
                                                                <GitBranch className="h-2.5 w-2.5 text-fg-ghost shrink-0"/>
                                                                <span className="text-3xs font-mono text-fg-ghost truncate">{branch}</span>
                                                            </div>
                                                        )}
                                                    </div>

                                                    <div className="flex items-center gap-2.5 shrink-0 text-[10px] font-mono">
                                                        {data !== undefined && data !== null && (
                                                            <span className="text-fg-ghost">{data.files.length}f</span>
                                                        )}
                                                        {data && patchAdd > 0 && <span className="text-green-400">+{patchAdd}</span>}
                                                        {data && patchDel > 0 && <span className="text-red-400">-{patchDel}</span>}
                                                        <span className="text-fg-dim">{fmtAge(session.createTime)}</span>
                                                        <span className={cn(
                                                            "text-3xs uppercase tracking-widest",
                                                            isActive          ? "text-purple-400"
                                                            : session.state === "failed"    ? "text-red-400"
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
                                                            <div className="mx-3 mb-4 rounded-md border border-hair bg-raised overflow-hidden">
                                                                {isLoading ? (
                                                                    <div className="flex items-center justify-center py-6">
                                                                        <Loader2 className="h-3.5 w-3.5 animate-spin text-fg-ghost"/>
                                                                    </div>
                                                                ) : data === null ? (
                                                                    <p className="text-[10px] font-mono text-fg-ghost text-center py-6">
                                                                        No changeset
                                                                    </p>
                                                                ) : data && data.files.length > 0 ? (
                                                                    <>
                                                                        {data.files.map((file, fi) => {
                                                                            const key        = `${session.id}/${file.path}`;
                                                                            const getState   = fileStates[key] ?? "idle";
                                                                            const isFileOpen = openFileKey === key;
                                                                            const firstDiff  = parsedDiffs[key]?.[0];
                                                                            const slashIdx   = file.path.lastIndexOf("/");
                                                                            const dir        = slashIdx >= 0 ? file.path.slice(0, slashIdx + 1) : "";
                                                                            const name       = slashIdx >= 0 ? file.path.slice(slashIdx + 1) : file.path;

                                                                            return (
                                                                                <motion.div
                                                                                    key={file.path}
                                                                                    initial={{opacity: 0, x: -5}}
                                                                                    animate={{opacity: 1, x: 0}}
                                                                                    transition={{duration: 0.14, delay: fi * 0.045}}
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
                                                                                            <ChevronDown className="h-3 w-3 -rotate-90"/>
                                                                                        </motion.div>

                                                                                        <span className={cn("h-1.5 w-1.5 rounded-full shrink-0 mt-px", STATUS_DOT[file.changeType])}/>

                                                                                        <span className="flex-1 min-w-0 text-[11px] font-mono truncate">
                                                                                            <span className="text-fg-ghost">{dir}</span>
                                                                                            <span className="text-fg-primary font-semibold">{name}</span>
                                                                                        </span>

                                                                                        <div className="flex items-center gap-2 shrink-0 text-[10px] font-mono">
                                                                                            {file.changeType !== "deleted" && (
                                                                                                <span className="text-green-400">+{file.additions}</span>
                                                                                            )}
                                                                                            {file.changeType !== "created" && (
                                                                                                <span className="text-red-400">-{file.deletions}</span>
                                                                                            )}
                                                                                        </div>

                                                                                        <div
                                                                                            className="flex items-center gap-1 opacity-0 group-hover/file:opacity-100 transition-opacity shrink-0"
                                                                                            onClick={e => { e.stopPropagation(); }}
                                                                                        >
                                                                                            <ActionBtn
                                                                                                state={getState}
                                                                                                icon={<Download className="h-2.5 w-2.5"/>}
                                                                                                label="Get"
                                                                                                busyLabel="Saving"
                                                                                                doneLabel="Saved"
                                                                                                hoverCls="hover:text-cyan-400 hover:border-cyan-500/30"
                                                                                                onClick={e => { e.stopPropagation(); void handleGetFile(session.id, file); }}
                                                                                            />
                                                                                        </div>
                                                                                    </div>

                                                                                    {/* Inline diff */}
                                                                                    <AnimatePresence initial={false}>
                                                                                        {isFileOpen && firstDiff && (
                                                                                            <motion.div
                                                                                                key="diff"
                                                                                                initial={{height: 0, opacity: 0}}
                                                                                                animate={{height: "auto", opacity: 1}}
                                                                                                exit={{height: 0, opacity: 0}}
                                                                                                transition={{duration: 0.18, ease: [0.4, 0, 0.2, 1]}}
                                                                                                className="overflow-hidden"
                                                                                            >
                                                                                                <DiffView diffFile={firstDiff}/>
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
                                                                            <span className="text-3xs font-mono text-fg-ghost uppercase tracking-widest">
                                                                                {data.files.length} file{data.files.length !== 1 ? "s" : ""} changed
                                                                            </span>

                                                                            <ActionBtn
                                                                                state={snapshotState}
                                                                                icon={<Archive className="h-2.5 w-2.5"/>}
                                                                                label="Snapshot"
                                                                                busyLabel="Applying…"
                                                                                doneLabel="Applied"
                                                                                hoverCls="hover:text-fg-primary hover:border-subtle"
                                                                                onClick={e => { e.stopPropagation(); void handleSnapshot(session.id); }}
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
        </div>
    );
}
