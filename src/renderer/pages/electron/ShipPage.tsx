import {useState} from "react";
import {AnimatePresence, motion} from "framer-motion";
import {ChevronDown, Download, FolderSearch, GitBranch, GitMerge, Plus, Trash2, Upload} from "lucide-react";
import {Dropdown} from "@/components/ship/Dropdown";

const FAKE_REPOS = [
    {id: "1", label: "LAST",             path: "D:/LAST",                        branch: "jules-watcher", patches: [
        {id: "p1", session: "Fix login button bug",     files: 3,  additions: 42,  deletions: 12, branch: "jules-patch-1718000001", isNew: true,  diff: `@@ -12,7 +12,7 @@ export function LoginButton() {
-  const handleClick = () => login();
+  const handleClick = async () => { await login(); refresh(); };
-  return <button onClick={handleClick}>Login</button>;
+  return <button onClick={handleClick} disabled={loading}>Login</button>;`},
        {id: "p2", session: "Refactor auth middleware", files: 7,  additions: 130, deletions: 88, branch: "jules-patch-1718000002", isNew: true,  diff: `@@ -1,6 +1,8 @@
+import { rateLimit } from './rate-limit';
+
 export function authMiddleware(req, res, next) {
-  if (!req.headers.authorization) return res.status(401).end();
-  next();
+  if (!req.headers.authorization) return res.status(401).json({ error: 'Unauthorized' });
+  rateLimit(req);
+  next();
 }`},
    ]},
    {id: "2", label: "jules-sdk-main",   path: "D:/jules rest/jules-sdk-main",   branch: "main",          patches: [
        {id: "p3", session: "Add rate limiting",        files: 2,  additions: 55,  deletions: 3,  branch: "jules-patch-1718000003", isNew: false, diff: `@@ -44,3 +44,8 @@ export class Client {
+  async rateLimit(config: RateLimitConfig) {
+    await this.request('/rate-limit', { method: 'POST', body: config });
+  }
 }`},
    ]},
    {id: "3", label: "some-other-repo",  path: "D:/projects/some-other-repo",    branch: "dev",           patches: []},
];

const ACTIONS = [
    {id: "apply",  icon: GitBranch, label: "Apply",   cls: "hover:text-purple-400 hover:border-purple-500/30"},
    {id: "merge",  icon: GitMerge,  label: "Merge",   cls: "hover:text-blue-400   hover:border-blue-500/30"},
    {id: "push",   icon: Upload,    label: "Push",    cls: "hover:text-cyan-400   hover:border-cyan-500/30"},
    {id: "files",  icon: Download,  label: "Files",   cls: "hover:text-green-400  hover:border-green-500/30"},
    {id: "delete", icon: Trash2,    label: "Delete",  cls: "hover:text-red-400    hover:border-red-500/30"},
];

export default function ShipPage() {
    const [repoId,       setRepoId]       = useState("1");
    const [selectedPatch, setSelectedPatch] = useState("");
    const [status,       setStatus]       = useState<"idle"|"scanning"|"done">("idle");

    const repo    = FAKE_REPOS.find(r => r.id === repoId) ?? FAKE_REPOS[0] ?? {id:"", label:"", path:"", branch:"", patches:[]};
    const newCount = repo.patches.filter(p => p.isNew).length;

    const handleScan = () => {
        setStatus("scanning");
        setTimeout(() => { setStatus("done"); setTimeout(() => { setStatus("idle"); }, 1800); }, 1400);
    };

    return (
        <div className="flex flex-col h-full overflow-hidden">

            {/* ── toolbar ── */}
            <motion.div
                initial={{opacity: 0, y: -8}}
                animate={{opacity: 1, y: 0}}
                transition={{duration: 0.2}}
                className="flex items-center gap-2 px-6 pt-5 pb-4 shrink-0"
            >
                <Dropdown
                    items={FAKE_REPOS.map(r => ({id: r.id, label: r.label, meta: r.branch}))}
                    value={repoId}
                    onChange={id => { setRepoId(id); setSelectedPatch(""); return; }}
                />

                {/* new indicator */}
                <AnimatePresence>
                    {newCount > 0 && (
                        <motion.div
                            key="dot"
                            initial={{opacity: 0, scale: 0.5}}
                            animate={{opacity: 1, scale: 1}}
                            exit={{opacity: 0, scale: 0.5}}
                            transition={{type: "spring", stiffness: 300, damping: 20}}
                            className="flex items-center gap-1.5"
                        >
                            <span className="relative flex h-1.5 w-1.5">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-purple-400 opacity-60"/>
                                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-purple-500"/>
                            </span>
                            <span className="text-[9px] font-mono text-purple-400 uppercase tracking-widest">{newCount} new</span>
                        </motion.div>
                    )}
                </AnimatePresence>

                <div className="flex-1"/>

                {/* scan spinner */}
                <AnimatePresence>
                    {status !== "idle" && (
                        <motion.svg
                            key="spin"
                            width="14" height="14" viewBox="0 0 14 14"
                            initial={{opacity: 0, scale: 0.5}}
                            animate={{opacity: 1, scale: status === "done" ? [1, 1.18, 1] : 1}}
                            exit={{opacity: 0, scale: 0.5}}
                            transition={{
                                opacity: {duration: 0.2},
                                scale: status === "done"
                                    ? {duration: 0.45, times: [0, 0.4, 1], ease: "easeInOut"}
                                    : {duration: 0.2},
                            }}
                            className={status === "scanning" ? "animate-spin" : ""}
                        >
                            <motion.circle
                                cx="7" cy="7" r="5.5"
                                fill="none"
                                strokeWidth="1"
                                strokeLinecap="round"
                                animate={{
                                    pathLength: status === "done" ? 1 : 0.32,
                                    stroke: status === "done" ? "#4ade80" : "#a855f7",
                                    filter: status === "done"
                                        ? "drop-shadow(0 0 3px rgba(74,222,128,0.55))"
                                        : "drop-shadow(0 0 2px rgba(168,85,247,0.35))",
                                }}
                                transition={{
                                    pathLength: {duration: 0.55, ease: [0.34, 1.2, 0.64, 1]},
                                    stroke:     {duration: 0.45, ease: "easeInOut"},
                                    filter:     {duration: 0.45},
                                }}
                            />
                        </motion.svg>
                    )}
                </AnimatePresence>

                <button
                    onClick={handleScan}
                    className="flex items-center gap-1.5 text-[10px] font-mono text-fg-dim hover:text-fg-secondary uppercase tracking-widest transition-colors"
                >
                    <FolderSearch className="h-3 w-3"/>Scan
                </button>
                <button className="flex items-center gap-1.5 text-[10px] font-mono text-fg-dim hover:text-fg-secondary uppercase tracking-widest transition-colors">
                    <Plus className="h-3 w-3"/>Add
                </button>
            </motion.div>

            {/* ── patch list ── */}
            <div className="flex-1 overflow-auto px-6 pb-8">
                {repo.patches.length === 0 && (
                    <p className="text-[10px] font-mono text-fg-ghost uppercase tracking-widest pt-8 text-center">No patches</p>
                )}

                <div className="space-y-px">
                    {repo.patches.map((patch, i) => {
                        const isOpen = selectedPatch === patch.id;
                        return (
                            <motion.div
                                key={patch.id}
                                initial={{opacity: 0, y: 8}}
                                animate={{opacity: 1, y: 0}}
                                transition={{duration: 0.16, delay: i * 0.04}}
                            >
                                {/* row */}
                                <div
                                    onClick={() => { setSelectedPatch(isOpen ? "" : patch.id); }}
                                    className={`flex items-center gap-3 py-2.5 px-3 rounded-md cursor-pointer group transition-colors ${
                                        isOpen ? "bg-hover" : "hover:bg-hover/60"
                                    }`}
                                >
                                    {patch.isNew && (
                                        <span className="w-1 h-1 rounded-full bg-purple-500 shrink-0"/>
                                    )}
                                    {!patch.isNew && <span className="w-1 h-1 shrink-0"/>}

                                    <GitBranch className="h-3 w-3 text-fg-ghost shrink-0"/>

                                    <div className="flex-1 min-w-0">
                                        <span className="text-[11px] font-semibold text-fg-primary truncate block">{patch.session}</span>
                                        <span className="text-[9px] font-mono text-fg-ghost">{patch.branch}</span>
                                    </div>

                                    <div className="flex items-center gap-2 text-[9px] font-mono shrink-0">
                                        <span className="text-fg-ghost">{patch.files}f</span>
                                        <span className="text-green-400">+{patch.additions}</span>
                                        <span className="text-red-400">-{patch.deletions}</span>
                                    </div>

                                    <motion.div
                                        animate={{rotate: isOpen ? 180 : 0}}
                                        transition={{duration: 0.15}}
                                        className="text-fg-ghost"
                                    >
                                        <ChevronDown className="h-3 w-3"/>
                                    </motion.div>
                                </div>

                                {/* expanded */}
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
                                            <div className="px-3 pb-4 pt-1 space-y-3">

                                                {/* action buttons */}
                                                <motion.div
                                                    initial={{opacity: 0, y: -4}}
                                                    animate={{opacity: 1, y: 0}}
                                                    transition={{duration: 0.15, delay: 0.06}}
                                                    className="flex items-center gap-1.5 flex-wrap"
                                                >
                                                    {ACTIONS.map(a => (
                                                        <button
                                                            key={a.id}
                                                            onClick={e => { e.stopPropagation(); }}
                                                            className={`flex items-center gap-1.5 px-2.5 py-1 rounded border border-hair text-[10px] font-mono text-fg-ghost transition-all ${a.cls}`}
                                                        >
                                                            <a.icon className="h-2.5 w-2.5"/>
                                                            {a.label}
                                                        </button>
                                                    ))}
                                                </motion.div>

                                                {/* diff */}
                                                <motion.pre
                                                    initial={{opacity: 0}}
                                                    animate={{opacity: 1}}
                                                    transition={{duration: 0.2, delay: 0.1}}
                                                    className="text-[10px] font-mono leading-relaxed rounded-md bg-raised p-3 overflow-x-auto"
                                                >
                                                    {patch.diff.split("\n").map((line, li) => (
                                                        <div
                                                            key={li}
                                                            className={
                                                                line.startsWith("+") ? "text-green-400" :
                                                                line.startsWith("-") ? "text-red-400" :
                                                                line.startsWith("@") ? "text-blue-400 opacity-60" :
                                                                "text-fg-dim"
                                                            }
                                                        >{line || " "}</div>
                                                    ))}
                                                </motion.pre>

                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </motion.div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
