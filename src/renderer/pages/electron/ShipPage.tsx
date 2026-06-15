import {useState} from "react";
import {AnimatePresence, motion} from "framer-motion";
import {
    Archive,
    CheckCircle2,
    ChevronDown,
    Download,
    GitBranch,
    GitMerge,
    Loader2,
} from "lucide-react";
import {ScrollArea} from "@/ui/scroll-area";
import {Dropdown} from "@/components/ship/Dropdown";
import {cn} from "@/utils";

// ── Types ──────────────────────────────────────────────────────────────────────

type FileStatus = "modified" | "added" | "deleted";
type ActionState = "idle" | "busy" | "done";

interface MockFile {
    id: string;
    path: string;
    additions: number;
    deletions: number;
    status: FileStatus;
}

interface MockPatch {
    id: string;
    session: string;
    branch: string;
    isNew: boolean;
    age: string;
    files: MockFile[];
}

interface MockRepo {
    id: string;
    label: string;
    path: string;
    branch: string;
    patches: MockPatch[];
}

// ── Mock Data ──────────────────────────────────────────────────────────────────

const REPOS: MockRepo[] = [
    {
        id: "1",
        label: "LAST",
        path: "D:/LAST",
        branch: "master",
        patches: [
            {
                id: "p1",
                session: "Fix login button bug",
                branch: "jules-patch-1718000001",
                isNew: true,
                age: "2h",
                files: [
                    {id: "f1", path: "src/auth/LoginButton.tsx",  additions: 18, deletions: 5,  status: "modified"},
                    {id: "f2", path: "src/auth/useLogin.ts",      additions: 20, deletions: 6,  status: "modified"},
                    {id: "f3", path: "src/auth/types.ts",         additions: 4,  deletions: 1,  status: "modified"},
                ],
            },
            {
                id: "p2",
                session: "Refactor auth middleware",
                branch: "jules-patch-1718000002",
                isNew: true,
                age: "4h",
                files: [
                    {id: "f4",  path: "electron/auth.ts",           additions: 45, deletions: 22, status: "modified"},
                    {id: "f5",  path: "electron/rate-limit.ts",     additions: 55, deletions: 0,  status: "added"},
                    {id: "f6",  path: "electron/session.ts",        additions: 30, deletions: 66, status: "modified"},
                    {id: "f7",  path: "electron/types.ts",          additions: 8,  deletions: 3,  status: "modified"},
                    {id: "f8",  path: "src/shared/auth.d.ts",       additions: 4,  deletions: 0,  status: "added"},
                    {id: "f9",  path: "src/shared/bridge.ts",       additions: 12, deletions: 8,  status: "modified"},
                    {id: "f10", path: "electron/legacy-auth.ts",    additions: 0,  deletions: 87, status: "deleted"},
                ],
            },
            {
                id: "p3",
                session: "Dark mode toggle animation",
                branch: "jules-patch-1718000005",
                isNew: false,
                age: "1d",
                files: [
                    {id: "f11", path: "src/renderer/ui/theme-toggle.tsx",       additions: 42, deletions: 18, status: "modified"},
                    {id: "f12", path: "src/renderer/styles/animations.css",     additions: 15, deletions: 0,  status: "added"},
                ],
            },
        ],
    },
    {
        id: "2",
        label: "jules-sdk-main",
        path: "D:/jules rest/jules-sdk-main",
        branch: "main",
        patches: [
            {
                id: "p4",
                session: "Add rate limiting",
                branch: "jules-patch-1718000003",
                isNew: false,
                age: "2d",
                files: [
                    {id: "f13", path: "src/client.ts",      additions: 28, deletions: 3, status: "modified"},
                    {id: "f14", path: "src/rate-limit.ts",  additions: 27, deletions: 0, status: "added"},
                ],
            },
        ],
    },
    {id: "3", label: "some-other-repo",  path: "D:/projects/some-other-repo", branch: "dev",  patches: []},
    {id: "4", label: "personal-notes",   path: "D:/notes",                    branch: "main", patches: []},
];

const EMPTY_REPO: MockRepo = {id: "", label: "", path: "", branch: "", patches: []};

// ── Sub-components ─────────────────────────────────────────────────────────────

const STATUS_DOT: Record<FileStatus, string> = {
    added:    "bg-green-500",
    deleted:  "bg-red-500",
    modified: "bg-yellow-500",
};

function ActionBtn({
    state, icon, busyIcon, label, busyLabel, doneLabel, hoverCls,
    onClick,
}: {
    state: ActionState;
    icon: React.ReactNode;
    busyIcon?: React.ReactNode;
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
            {isBusy  ? (busyIcon ?? <Loader2 className="h-2.5 w-2.5 animate-spin"/>) : isDone ? <CheckCircle2 className="h-2.5 w-2.5"/> : icon}
            <span>{isBusy ? (busyLabel ?? label) : isDone ? (doneLabel ?? "Done") : label}</span>
        </motion.button>
    );
}

// ── Main Page ──────────────────────────────────────────────────────────────────

export default function ShipPage() {
    const [repoId,      setRepoId]      = useState("1");
    const [openPatch,   setOpenPatch]   = useState("");
    const [fileActions, setFileActions] = useState<Record<string, {merge: ActionState; get: ActionState}>>({});
    const [snapshots,   setSnapshots]   = useState<Record<string, ActionState>>({});

    const repo = REPOS.find(r => r.id === repoId) ?? EMPTY_REPO;

    function triggerFile(fileId: string, action: "merge" | "get") {
        setFileActions(p => ({...p, [fileId]: {...(p[fileId] ?? {merge: "idle", get: "idle"}), [action]: "busy"}}));
        setTimeout(() => {
            setFileActions(p => ({...p, [fileId]: {...(p[fileId] ?? {merge: "idle", get: "idle"}), [action]: "done"}}));
            setTimeout(() => {
                setFileActions(p => ({...p, [fileId]: {...(p[fileId] ?? {merge: "idle", get: "idle"}), [action]: "idle"}}));
            }, 1800);
        }, 900);
    }

    function triggerSnapshot(patchId: string) {
        setSnapshots(p => ({...p, [patchId]: "busy"}));
        setTimeout(() => {
            setSnapshots(p => ({...p, [patchId]: "done"}));
            setTimeout(() => { setSnapshots(p => ({...p, [patchId]: "idle"})); }, 2500);
        }, 1100);
    }

    const totalAdd = repo.patches.reduce((s, p) => s + p.files.reduce((s2, f) => s2 + f.additions, 0), 0);
    const totalDel = repo.patches.reduce((s, p) => s + p.files.reduce((s2, f) => s2 + f.deletions, 0), 0);

    const newCount = repo.patches.filter(p => p.isNew).length;

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
                    items={REPOS.map(r => ({id: r.id, label: r.label, meta: r.branch}))}
                    value={repoId}
                    onChange={id => { setRepoId(id); setOpenPatch(""); }}
                />

                <AnimatePresence>
                    {newCount > 0 && (
                        <motion.div
                            key="newdot"
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
                            <span className="text-3xs font-mono text-purple-400 uppercase tracking-widest">{newCount} new</span>
                        </motion.div>
                    )}
                </AnimatePresence>

                <div className="flex-1"/>

                {repo.patches.length > 0 && (
                    <div className="flex items-center gap-3 text-[10px] font-mono">
                        <span className="text-fg-dim">{repo.patches.length} patches</span>
                        <span className="text-green-400">+{totalAdd}</span>
                        <span className="text-red-400">-{totalDel}</span>
                    </div>
                )}
            </motion.div>

            {/* ── Patch list ────────────────────────────────────────────────── */}
            <AnimatePresence mode="wait">
                <motion.div
                    key={repoId}
                    initial={{opacity: 0}}
                    animate={{opacity: 1}}
                    exit={{opacity: 0}}
                    transition={{duration: 0.15}}
                    className="flex-1 overflow-hidden"
                >

                    <ScrollArea className="h-full">
                        <div className="px-6 py-4">
                            {repo.patches.length === 0 ? (
                                <motion.p
                                    initial={{opacity: 0}}
                                    animate={{opacity: 1}}
                                    transition={{delay: 0.1}}
                                    className="text-[10px] font-mono text-fg-ghost uppercase tracking-widest text-center py-16"
                                >
                                    No patches
                                </motion.p>
                            ) : (
                                <div className="space-y-px">
                                    {repo.patches.map((patch, pi) => {
                                        const isOpen        = openPatch === patch.id;
                                        const snapshotState = snapshots[patch.id] ?? "idle";
                                        const patchAdd      = patch.files.reduce((s, f) => s + f.additions, 0);
                                        const patchDel      = patch.files.reduce((s, f) => s + f.deletions, 0);

                                        return (
                                            <motion.div
                                                key={patch.id}
                                                initial={{opacity: 0, y: 8}}
                                                animate={{opacity: 1, y: 0}}
                                                transition={{duration: 0.18, delay: pi * 0.06}}
                                            >
                                                {/* Patch row */}
                                                <div
                                                    onClick={() => { setOpenPatch(isOpen ? "" : patch.id); }}
                                                    className={cn(
                                                        "flex items-center gap-3 py-3 px-3 rounded-md cursor-pointer transition-colors select-none",
                                                        isOpen ? "bg-hover" : "hover:bg-hover/50",
                                                    )}
                                                >
                                                    {/* Pulse dot */}
                                                    <div className="w-2 shrink-0 flex items-center justify-center">
                                                        {patch.isNew ? (
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
                                                            {patch.session}
                                                        </span>
                                                        <div className="flex items-center gap-1.5 mt-0.5">
                                                            <GitBranch className="h-2.5 w-2.5 text-fg-ghost shrink-0"/>
                                                            <span className="text-3xs font-mono text-fg-ghost truncate">
                                                                {patch.branch}
                                                            </span>
                                                        </div>
                                                    </div>

                                                    <div className="flex items-center gap-2.5 shrink-0 text-[10px] font-mono">
                                                        <span className="text-fg-ghost">{patch.files.length}f</span>
                                                        <span className="text-green-400">+{patchAdd}</span>
                                                        <span className="text-red-400">-{patchDel}</span>
                                                        <span className="text-fg-dim">{patch.age}</span>
                                                    </div>

                                                    <motion.div
                                                        animate={{rotate: isOpen ? 180 : 0}}
                                                        transition={{duration: 0.16}}
                                                        className="text-fg-ghost shrink-0"
                                                    >
                                                        <ChevronDown className="h-3.5 w-3.5"/>
                                                    </motion.div>
                                                </div>

                                                {/* Expanded: files */}
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
                                                                {patch.files.map((file, fi) => {
                                                                    const fa      = fileActions[file.id] ?? {merge: "idle" as ActionState, get: "idle" as ActionState};
                                                                    const slashIdx = file.path.lastIndexOf("/");
                                                                    const dir      = slashIdx >= 0 ? file.path.slice(0, slashIdx + 1) : "";
                                                                    const name     = slashIdx >= 0 ? file.path.slice(slashIdx + 1) : file.path;

                                                                    return (
                                                                        <motion.div
                                                                            key={file.id}
                                                                            initial={{opacity: 0, x: -5}}
                                                                            animate={{opacity: 1, x: 0}}
                                                                            transition={{duration: 0.14, delay: fi * 0.045}}
                                                                            className={cn(
                                                                                "flex items-center gap-3 px-4 py-2.5 group/file transition-colors hover:bg-hover/60",
                                                                                fi > 0 && "border-t border-hair",
                                                                            )}
                                                                        >
                                                                            <span className={cn("h-1.5 w-1.5 rounded-full shrink-0 mt-px", STATUS_DOT[file.status])}/>

                                                                            <span className="flex-1 min-w-0 text-[11px] font-mono truncate">
                                                                                <span className="text-fg-ghost">{dir}</span>
                                                                                <span className="text-fg-primary font-semibold">{name}</span>
                                                                            </span>

                                                                            <div className="flex items-center gap-2 shrink-0 text-[10px] font-mono">
                                                                                {file.status !== "deleted" && (
                                                                                    <span className="text-green-400">+{file.additions}</span>
                                                                                )}
                                                                                {file.status !== "added" && (
                                                                                    <span className="text-red-400">-{file.deletions}</span>
                                                                                )}
                                                                            </div>

                                                                            {/* Per-file actions (visible on hover) */}
                                                                            <div className="flex items-center gap-1 opacity-0 group-hover/file:opacity-100 transition-opacity shrink-0">
                                                                                {file.status !== "deleted" && (
                                                                                    <ActionBtn
                                                                                        state={fa.merge}
                                                                                        icon={<GitMerge className="h-2.5 w-2.5"/>}
                                                                                        label="Merge"
                                                                                        busyLabel="Merging"
                                                                                        doneLabel="Merged"
                                                                                        hoverCls="hover:text-purple-400 hover:border-purple-500/30"
                                                                                        onClick={(e) => { e.stopPropagation(); triggerFile(file.id, "merge"); }}
                                                                                    />
                                                                                )}
                                                                                <ActionBtn
                                                                                    state={fa.get}
                                                                                    icon={<Download className="h-2.5 w-2.5"/>}
                                                                                    label="Get"
                                                                                    busyLabel="Saving"
                                                                                    doneLabel="Saved"
                                                                                    hoverCls="hover:text-cyan-400 hover:border-cyan-500/30"
                                                                                    onClick={(e) => { e.stopPropagation(); triggerFile(file.id, "get"); }}
                                                                                />
                                                                            </div>
                                                                        </motion.div>
                                                                    );
                                                                })}

                                                                {/* Patch footer */}
                                                                <motion.div
                                                                    initial={{opacity: 0}}
                                                                    animate={{opacity: 1}}
                                                                    transition={{delay: patch.files.length * 0.045 + 0.05}}
                                                                    className="border-t border-hair px-4 py-2.5 flex items-center justify-between"
                                                                >
                                                                    <span className="text-3xs font-mono text-fg-ghost uppercase tracking-widest">
                                                                        {patch.files.length} file{patch.files.length !== 1 ? "s" : ""} changed
                                                                    </span>

                                                                    <ActionBtn
                                                                        state={snapshotState}
                                                                        icon={<Archive className="h-2.5 w-2.5"/>}
                                                                        label="Snapshot"
                                                                        busyLabel="Saving..."
                                                                        doneLabel="Saved to folder"
                                                                        hoverCls="hover:text-fg-primary hover:border-subtle"
                                                                        onClick={(e) => { e.stopPropagation(); triggerSnapshot(patch.id); }}
                                                                    />
                                                                </motion.div>
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

