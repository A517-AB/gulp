// Sync page store — Jules backup git sync (push/pull to remote). NOT for Explorer or Ship.
import { create } from 'zustand';
import { git, filesystem, store } from '@shared/bridge';
import { toast } from 'sonner';

export interface SyncFileEntry {
    path: string;
    status: 'added' | 'modified' | 'deleted' | 'untracked';
}

export interface SyncState {
    statusFiles: SyncFileEntry[];
    currentBranch: string;
    lastCommit: { age: string; message: string };
    syncState: 'idle' | 'busy' | 'done';
    syncStage: string;
    fetchState: 'idle' | 'busy';
    trackedFiles: string[];
    showSearchModal: boolean;
    searchQuery: string;
    localRepoPath: string | null;

    setLocalRepoPath: (path: string | null) => void;
    setShowSearchModal: (show: boolean) => void;
    setSearchQuery: (query: string) => void;
    
    loadLocalRepoPath: (sourceId: string) => Promise<void>;
    selectLocalFolder: (sourceId: string) => Promise<void>;
    
    checkGitStatus: (repoPath: string) => Promise<void>;
    syncRepo: (repoPath: string) => Promise<void>;
    fetchRepo: (repoPath: string) => Promise<void>;
    commitRepo: (repoPath: string, message: string) => Promise<void>;
    pushRepo: (repoPath: string) => Promise<void>;
    loadTrackedFiles: (repoPath: string) => Promise<void>;
    downloadFile: (repoPath: string, fileSubPath: string) => Promise<void>;
}

const STORE_KEY = 'ship.repoPaths';

export const useSyncStore = create<SyncState>((set, get) => ({
    statusFiles: [],
    currentBranch: 'main',
    lastCommit: { age: 'Never', message: '' },
    syncState: 'idle',
    syncStage: '',
    fetchState: 'idle',
    trackedFiles: [],
    showSearchModal: false,
    searchQuery: '',
    localRepoPath: null,

    setLocalRepoPath: (localRepoPath) => { set({ localRepoPath }); },
    setShowSearchModal: (showSearchModal) => { set({ showSearchModal }); },
    setSearchQuery: (searchQuery) => { set({ searchQuery }); },

    loadLocalRepoPath: async (sourceId) => {
        if (!store || !sourceId) {
            set({ localRepoPath: null });
            return;
        }
        const storeKey = `${STORE_KEY}.${sourceId}`;
        try {
            const path = await store.get(storeKey);
            if (typeof path === 'string' && path) {
                set({ localRepoPath: path });
            } else {
                set({ localRepoPath: null });
            }
        } catch {
            set({ localRepoPath: null });
        }
    },

    selectLocalFolder: async (sourceId) => {
        if (!filesystem || !store || !sourceId) return;
        try {
            const path = await filesystem.showOpenDialog();
            if (path) {
                const storeKey = `${STORE_KEY}.${sourceId}`;
                await store.set(storeKey, path);
                set({ localRepoPath: path });
            }
        } catch (err) {
            console.error('[SyncStore] failed to select local folder:', err);
        }
    },

    checkGitStatus: async (repoPath) => {
        if (!git) return;
        try {
            // Get current branch name
            const branchRes = await git.run(repoPath, ['rev-parse', '--abbrev-ref', 'HEAD']);
            if (branchRes.ok) {
                set({ currentBranch: branchRes.stdout.trim() });
            }

            // Get status --porcelain
            const statusRes = await git.status(repoPath);
            if (statusRes.ok) {
                const lines = statusRes.stdout.split('\n').filter(Boolean);
                const parsed: SyncFileEntry[] = lines.map(line => {
                    const code = line.slice(0, 2);
                    const path = line.slice(3).trim();
                    let status: SyncFileEntry['status'] = 'modified';
                    if (code.includes('??')) status = 'untracked';
                    else if (code.includes('A')) status = 'added';
                    else if (code.includes('D')) status = 'deleted';
                    return { path, status };
                });
                set({ statusFiles: parsed });
            }

            // Get last commit log info
            const logRes = await git.run(repoPath, ['log', '-1', '--pretty=format:%ar|%s']);
            if (logRes.ok && logRes.stdout.trim()) {
                const [age, message] = logRes.stdout.split('|');
                set({
                    lastCommit: {
                        age: age ?? 'Unknown',
                        message: message ?? 'No backup message'
                    }
                });
            } else {
                set({ lastCommit: { age: 'No commits yet', message: '' } });
            }
        } catch (err) {
            console.error('[SyncStore] checkGitStatus failed:', err);
        }
    },

    syncRepo: async (repoPath) => {
        if (!git || get().syncState === 'busy') return;
        set({ syncState: 'busy' });
        const toastId = 'sync-backup';
        toast.loading('Initializing sync…', { id: toastId });

        try {
            set({ syncStage: 'Staging files…' });
            await git.add(repoPath, ['.']);

            set({ syncStage: 'Creating snapshot…' });
            const timestamp = new Date().toLocaleString();
            const commitMsg = `Backup: ${timestamp}`;
            const commitRes = await git.commit(repoPath, commitMsg, true);

            if (!commitRes.ok && !commitRes.stderr.includes('nothing to commit')) {
                throw new Error(commitRes.stderr || 'Commit failed');
            }

            const branch = get().currentBranch;
            set({ syncStage: `Pushing to ${branch}…` });
            const pushRes = await git.push(repoPath, 'origin', branch);
            if (!pushRes.ok) {
                throw new Error(pushRes.stderr || 'Push failed');
            }

            toast.success('Backup synchronized successfully!', { id: toastId });
            set({ syncState: 'done' });
            setTimeout(() => {
                set({ syncState: 'idle', syncStage: '' });
            }, 2000);

            await get().checkGitStatus(repoPath);
        } catch (err) {
            toast.error(err instanceof Error ? err.message : 'Sync failed', { id: toastId });
            set({ syncState: 'idle', syncStage: '' });
        }
    },

    fetchRepo: async (repoPath) => {
        if (!git || get().fetchState === 'busy' || get().syncState === 'busy') return;
        set({ fetchState: 'busy' });
        const toastId = 'fetch-backup';
        toast.loading('Fetching latest changes…', { id: toastId });

        try {
            const branch = get().currentBranch;
            const pullRes = await git.pull(repoPath, 'origin', branch, false);
            if (!pullRes.ok) {
                throw new Error(pullRes.stderr || 'Fetch failed');
            }
            toast.success('Latest changes retrieved!', { id: toastId });
            set({ fetchState: 'idle' });
            await get().checkGitStatus(repoPath);
        } catch (err) {
            toast.error(err instanceof Error ? err.message : 'Fetch failed', { id: toastId });
            set({ fetchState: 'idle' });
        }
    },

    commitRepo: async (repoPath, message) => {
        if (!git) return;
        const toastId = 'commit-repo';
        toast.loading('Staging & committing…', { id: toastId });
        try {
            await git.add(repoPath, ['.']);
            const msg = message.trim() || `snapshot ${new Date().toLocaleString()}`;
            const res = await git.commit(repoPath, msg, true);
            if (!res.ok && !res.stderr.includes('nothing to commit')) throw new Error(res.stderr);
            toast.success('Committed', { id: toastId });
            await get().checkGitStatus(repoPath);
        } catch (err) {
            toast.error(err instanceof Error ? err.message : 'Commit failed', { id: toastId });
        }
    },

    pushRepo: async (repoPath) => {
        if (!git) return;
        const toastId = 'push-repo';
        toast.loading('Pushing…', { id: toastId });
        try {
            const branch = get().currentBranch;
            const res = await git.push(repoPath, 'origin', branch);
            if (!res.ok) throw new Error(res.stderr);
            toast.success('Pushed', { id: toastId });
        } catch (err) {
            toast.error(err instanceof Error ? err.message : 'Push failed', { id: toastId });
        }
    },

    loadTrackedFiles: async (repoPath) => {
        if (!git) return;
        try {
            const res = await git.run(repoPath, ['ls-files']);
            if (res.ok) {
                const files = res.stdout.split('\n').filter(Boolean);
                set({
                    trackedFiles: files,
                    showSearchModal: true,
                    searchQuery: ''
                });
            }
        } catch {
            toast.error('Failed to load tracked files');
        }
    },

    downloadFile: async (repoPath, fileSubPath) => {
        if (!filesystem) return;
        const name = fileSubPath.split('/').pop() ?? 'file';
        const sourceFilePath = `${repoPath}/${fileSubPath}`;
        try {
            const destPath = await filesystem.showSaveDialog(name);
            if (!destPath) return;

            const content = await filesystem.readFile(sourceFilePath);
            await filesystem.writeFile(destPath, content);
            toast.success(`Exported ${name} successfully!`);
        } catch {
            toast.error('Failed to export file');
        }
    }
}));
