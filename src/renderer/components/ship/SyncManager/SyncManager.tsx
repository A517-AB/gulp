import {useEffect, useMemo} from 'react';
import {motion, AnimatePresence} from 'framer-motion';
import {
    RefreshCw,
    CheckCircle2,
    ArrowUpRight,
    Search,
    X,
    FileText,
    Download
} from 'lucide-react';
import {useSyncStore} from '@/store/sync';
import type {SyncManagerProps} from './types';
import {cn} from '@/utils';

export function SyncManager({repoPath, repoName, onSyncComplete}: SyncManagerProps) {
    const {
        statusFiles,
        currentBranch,
        lastCommit,
        syncState,
        syncStage,
        fetchState,
        trackedFiles,
        showSearchModal,
        searchQuery,
        setShowSearchModal,
        setSearchQuery,
        checkGitStatus,
        syncRepo,
        fetchRepo,
        loadTrackedFiles,
        downloadFile
    } = useSyncStore();

    // Check git status when repoPath changes
    useEffect(() => {
        if (repoPath) {
            void checkGitStatus(repoPath);
        }
    }, [repoPath, checkGitStatus]);

    // Local filter of tracked files
    const filteredFiles = useMemo(() => {
        if (!searchQuery) return trackedFiles;
        const query = searchQuery.toLowerCase();
        return trackedFiles.filter(f => f.toLowerCase().includes(query));
    }, [searchQuery, trackedFiles]);

    const stats = useMemo(() => {
        const untracked = statusFiles.filter(f => f.status === 'untracked').length;
        const modified = statusFiles.filter(f => f.status === 'modified').length;
        const added = statusFiles.filter(f => f.status === 'added').length;
        const deleted = statusFiles.filter(f => f.status === 'deleted').length;
        return {untracked, modified, added, deleted, total: statusFiles.length};
    }, [statusFiles]);

    return (
        <div className="bg-surface/30 border border-hair rounded-lg p-5 flex flex-col gap-4 shadow-sm backdrop-blur-sm">
            {/* Header info */}
            <div className="flex justify-between items-start gap-4">
                <div className="min-w-0">
                    <h3 className="text-xxs font-bold uppercase tracking-wider text-fg-primary flex items-center gap-2">
                        <span>{repoName}</span>
                        <span className="px-1.5 py-0.5 rounded bg-purple-500/10 text-purple-400 text-[9px] font-mono font-medium">
                            Git Direct
                        </span>
                    </h3>
                    <p className="text-3xs font-mono text-fg-ghost truncate mt-1 select-all">{repoPath}</p>
                </div>
                
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => { void fetchRepo(repoPath); }}
                        disabled={fetchState === 'busy' || syncState === 'busy'}
                        className="flex items-center gap-1.5 px-2.5 py-1 rounded border border-hair text-3xs font-mono font-semibold hover:bg-hover transition-colors text-fg-secondary disabled:opacity-40"
                    >
                        <RefreshCw className={cn("h-3 w-3", fetchState === 'busy' && "animate-spin")} />
                        <span>Fetch</span>
                    </button>
                    
                    <button
                        onClick={() => { void loadTrackedFiles(repoPath); }}
                        className="flex items-center gap-1.5 px-2.5 py-1 rounded border border-hair text-3xs font-mono font-semibold hover:bg-hover transition-colors text-fg-secondary"
                    >
                        <Search className="h-3 w-3" />
                        <span>Get File</span>
                    </button>
                </div>
            </div>

            {/* Sync Card Details */}
            <div className="grid grid-cols-2 gap-4 border-y border-hair py-3.5 my-1">
                <div>
                    <span className="text-[10px] uppercase font-mono tracking-wider text-fg-ghost">Last Synced</span>
                    <div className="text-2xs font-semibold text-fg-primary mt-0.5 flex flex-col">
                        <span>{lastCommit.age}</span>
                        {lastCommit.message && (
                            <span className="text-[10px] font-mono text-fg-ghost/75 truncate max-w-[200px] mt-0.5 font-normal">
                                {lastCommit.message}
                            </span>
                        )}
                    </div>
                </div>
                <div>
                    <span className="text-[10px] uppercase font-mono tracking-wider text-fg-ghost">Branch</span>
                    <p className="text-2xs font-semibold text-fg-primary mt-0.5">{currentBranch}</p>
                </div>
            </div>

            {/* Status overview */}
            <div className="flex flex-col gap-2">
                <div className="flex justify-between items-center text-3xs font-mono">
                    <span className="text-fg-ghost">STATUS CHECK</span>
                    {stats.total > 0 ? (
                        <span className="text-yellow-400 font-semibold uppercase tracking-wider">
                            {stats.total} pending changes
                        </span>
                    ) : (
                        <span className="text-green-400 font-semibold uppercase tracking-wider">
                            Synced & Clean
                        </span>
                    )}
                </div>

                {stats.total > 0 ? (
                    <div className="max-h-[130px] overflow-y-auto border border-hair/60 bg-base/20 rounded p-2.5 space-y-1.5 scrollbar-thin">
                        {statusFiles.map(file => (
                            <div key={file.path} className="flex justify-between items-center text-3xs font-mono">
                                <span className="text-fg-secondary truncate max-w-[340px]">{file.path}</span>
                                <span className={cn(
                                    "px-1 py-0.2 rounded text-[8px] font-bold uppercase shrink-0",
                                    file.status === 'untracked' && "bg-blue-500/10 text-blue-400",
                                    file.status === 'modified' && "bg-yellow-500/10 text-yellow-400",
                                    file.status === 'added' && "bg-green-500/10 text-green-400",
                                    file.status === 'deleted' && "bg-red-500/10 text-red-400",
                                )}>
                                    {file.status}
                                </span>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="flex items-center gap-2 p-3 rounded bg-green-500/5 border border-green-500/10 text-green-400/90 text-3xs">
                        <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                        <span>Ready to go. Everything has been pushed up to the origin.</span>
                    </div>
                )}
            </div>

            {/* Main Sync Button */}
            <motion.button
                whileTap={{scale: 0.98}}
                onClick={() => { void syncRepo(repoPath).then(onSyncComplete); }}
                disabled={syncState === 'busy' || syncState === 'done'}
                className={cn(
                    "w-full py-2.5 rounded-md font-mono text-2xs font-bold transition-all border flex items-center justify-center gap-2",
                    syncState === 'done'
                        ? "bg-green-500/10 text-green-400 border-green-500/30"
                        : "bg-purple-600 text-white border-purple-500 hover:bg-purple-700 shadow-md shadow-purple-900/10 hover:shadow-purple-900/20 disabled:opacity-50"
                )}
            >
                {syncState === 'busy' ? (
                    <>
                        <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                        <span>{syncStage}</span>
                    </>
                ) : syncState === 'done' ? (
                    <>
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        <span>Synced</span>
                    </>
                ) : (
                    <>
                        <ArrowUpRight className="h-3.5 w-3.5" />
                        <span>Sync Now</span>
                    </>
                )}
            </motion.button>

            {/* File Search Modal */}
            <AnimatePresence>
                {showSearchModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                        <motion.div
                            initial={{opacity: 0, scale: 0.95}}
                            animate={{opacity: 1, scale: 1}}
                            exit={{opacity: 0, scale: 0.95}}
                            className="bg-overlay border border-subtle w-full max-w-[480px] rounded-lg shadow-2xl overflow-hidden flex flex-col h-[380px]"
                        >
                            {/* Search Header */}
                            <div className="p-3 border-b border-hair flex items-center gap-2.5 bg-surface/50">
                                <Search className="h-4 w-4 text-fg-ghost shrink-0" />
                                <input
                                    type="text"
                                    placeholder="Search backed up files..."
                                    value={searchQuery}
                                    onChange={e => { setSearchQuery(e.target.value); }}
                                    className="flex-1 bg-transparent border-none outline-none text-2xs font-mono text-fg-primary placeholder-fg-ghost"
                                    autoFocus
                                />
                                <button
                                    onClick={() => { setShowSearchModal(false); setSearchQuery(''); }}
                                    className="p-1 rounded hover:bg-hover text-fg-ghost hover:text-fg-primary transition-colors shrink-0"
                                >
                                    <X className="h-3.5 w-3.5" />
                                </button>
                            </div>

                            {/* Files list */}
                            <div className="flex-1 overflow-y-auto p-2 space-y-0.5 scrollbar-thin">
                                {filteredFiles.length === 0 ? (
                                    <p className="text-3xs font-mono text-fg-ghost text-center py-12 uppercase tracking-widest">
                                        No files found
                                    </p>
                                ) : (
                                    filteredFiles.map(file => (
                                        <div
                                            key={file}
                                            className="flex justify-between items-center px-3 py-2 rounded hover:bg-hover/60 transition-colors group"
                                        >
                                            <div className="flex items-center gap-2.5 min-w-0">
                                                <FileText className="h-3.5 w-3.5 text-fg-ghost shrink-0" />
                                                <span className="text-3xs font-mono text-fg-primary truncate max-w-[340px]">
                                                    {file}
                                                </span>
                                            </div>
                                            
                                            <button
                                                onClick={() => { void downloadFile(repoPath, file); }}
                                                className="opacity-0 group-hover:opacity-100 p-1 rounded border border-hair text-3xs font-mono text-fg-ghost hover:text-cyan-400 hover:border-cyan-500/30 transition-all shrink-0 flex items-center gap-1"
                                                title="Get File"
                                            >
                                                <Download className="h-2.5 w-2.5" />
                                                <span>Get</span>
                                            </button>
                                        </div>
                                    ))
                                )}
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}
