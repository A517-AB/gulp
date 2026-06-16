export interface SyncFileEntry {
    path: string;
    status: 'added' | 'modified' | 'deleted' | 'untracked';
}

export interface SyncRepository {
    id: string;
    name: string;
    path: string;
    lastSyncedAt?: string;
    currentBranch?: string;
}

export interface SyncManagerProps {
    repoPath: string;
    repoName: string;
    onSyncComplete?: () => void;
}
