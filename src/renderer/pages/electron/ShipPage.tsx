import {useMemo} from "react";
import {AnimatePresence, motion} from "framer-motion";
import {Dropdown} from "@/components/ship/Dropdown";
import {cn} from "@/utils";
import {useStore} from "@/store/app";
import {useShipStore} from "@/store/ship";
import {PatchView} from "@/components/ship/PatchView";
import {ACTIVE_STATES} from "@/components/ship/constants";
import {SyncView} from "@/components/ship/SyncView";

export default function ShipPage() {
    const sources     = useStore(s => s.sources);
    const sessionList = useStore(s => s.sessionList);

    const {sourceId, viewMode, patchData, favoriteSourceIds, setSourceId, setViewMode, toggleFavoriteSource} = useShipStore();

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

    const loadedStats = useMemo(() => {
        let add = 0, del = 0;
        for (const s of sessions) {
            const d = patchData[s.id];
            if (d) { for (const f of d.files) { add += f.additions; del += f.deletions; } }
        }
        return {add, del};
    }, [sessions, patchData]);

    const activeCount = sessions.filter(s => ACTIVE_STATES.has(s.state)).length;

    const repoName = selectedSource
        ? `${selectedSource.githubRepo.owner}/${selectedSource.githubRepo.repo}`
        : "Local Repository";

    return (
        <div className="flex flex-col h-full overflow-hidden">

            {/* ── Toolbar ───────────────────────────────────────────────────── */}
            <motion.div
                initial={{opacity: 0, y: -6}}
                animate={{opacity: 1, y: 0}}
                transition={{duration: 0.18}}
                className="flex items-center gap-3 px-6 pt-5 pb-4 shrink-0 relative z-10"
            >
                <Dropdown
                    items={[...sources]
                        .sort((a, b) => {
                            const af = favoriteSourceIds.includes(a.id) ? 0 : 1;
                            const bf = favoriteSourceIds.includes(b.id) ? 0 : 1;
                            return af - bf;
                        })
                        .map(s => ({
                            id: s.id,
                            label: `${s.githubRepo.owner}/${s.githubRepo.repo}`,
                            starred: favoriteSourceIds.includes(s.id),
                            ...(s.githubRepo.defaultBranch ? {meta: s.githubRepo.defaultBranch} : {}),
                        }))}
                    value={effectiveSourceId}
                    onChange={setSourceId}
                    onToggleStar={toggleFavoriteSource}
                    placeholder="select repo"
                    emptyMessage="No repos found"
                />

                <div className="flex items-center bg-hover/80 p-0.5 rounded-md border border-hair shrink-0">
                    <button
                        onClick={() => { setViewMode('jules'); }}
                        className={cn(
                            "px-2.5 py-0.5 rounded text-[9px] font-mono font-bold transition-all uppercase tracking-wider",
                            viewMode === 'jules'
                                ? "bg-purple-500/10 text-purple-400 border border-purple-500/20"
                                : "text-fg-ghost hover:text-fg-secondary"
                        )}
                    >
                        Jules Sessions
                    </button>
                    <button
                        onClick={() => { setViewMode('sync'); }}
                        className={cn(
                            "px-2.5 py-0.5 rounded text-[9px] font-mono font-bold transition-all uppercase tracking-wider",
                            viewMode === 'sync'
                                ? "bg-purple-500/10 text-purple-400 border border-purple-500/20"
                                : "text-fg-ghost hover:text-fg-secondary"
                        )}
                    >
                        Sync & Backup
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

            {/* ── Page Content ──────────────────────────────────────────────── */}
            {viewMode === 'jules' ? (
                <PatchView sessions={sessions} effectiveSourceId={effectiveSourceId}/>
            ) : (
                <SyncView effectiveSourceId={effectiveSourceId} repoName={repoName}/>
            )}
        </div>
    );
}
