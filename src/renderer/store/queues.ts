import {create} from 'zustand';
import {persist} from 'zustand/middleware';
import {queues as electronQueues} from '@shared/bridge';

export interface TaskAction {
    type: 'jules';
    prompt: string;
    folder?: string;
}

export interface FleetTask {
    topic: string;
    action: TaskAction;
    usedCount?: number;
    followUps?: { topic: string; action: TaskAction }[];
}

export interface FleetTaskGroup {
    group: string;
    repo: string;
    baseBranch: string;
    concurrency?: number;
    tasks: FleetTask[];
}

function readBrowserTasks(): unknown[] {
    if (typeof window === 'undefined') return [];
    try {
        const raw = window.localStorage.getItem('workspace:fleet-tasks');
        return raw ? (JSON.parse(raw) as unknown[]) : [];
    } catch {
        return [];
    }
}

function writeBrowserTasks(tasks: FleetTaskGroup[]): void {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem('workspace:fleet-tasks', JSON.stringify(tasks));
}

function isRecord(v: unknown): v is Record<string, unknown> {
    return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function migrateFollowUp(v: unknown): { topic: string; action: TaskAction } {
    if (!isRecord(v)) return {topic: '', action: {type: 'jules', prompt: ''}};
    if ('action' in v) return v as { topic: string; action: TaskAction };
    return {
        topic: typeof v['topic'] === 'string' ? v['topic'] : '',
        action: {type: 'jules', prompt: typeof v['task'] === 'string' ? v['task'] : ''},
    };
}

function migrateTask(v: unknown): FleetTask | null {
    if (!isRecord(v)) return null;
    if ('action' in v) return v as unknown as FleetTask;
    return {
        topic: typeof v['topic'] === 'string' ? v['topic'] : 'Task',
        action: {
            type: 'jules',
            prompt: typeof v['task'] === 'string' ? v['task'] : '',
            ...(typeof v['folder'] === 'string' && v['folder'] ? {folder: v['folder']} : {}),
        },
        ...(typeof v['usedCount'] === 'number' ? {usedCount: v['usedCount']} : {}),
        ...(Array.isArray(v['followUps']) ? {followUps: (v['followUps'] as unknown[]).map(migrateFollowUp)} : {}),
    };
}

function normalizeTasks(raw: unknown): FleetTaskGroup[] {
    const arr = Array.isArray(raw) ? raw
        : (isRecord(raw) && Array.isArray(raw['pipelines'])) ? raw['pipelines'] as unknown[]
            : [];
    const groups: FleetTaskGroup[] = [];
    for (const item of arr) {
        if (!isRecord(item) || typeof item['group'] !== 'string' || !Array.isArray(item['tasks'])) continue;
        groups.push({
            ...(item as unknown as FleetTaskGroup),
            tasks: (item['tasks'] as unknown[]).map(migrateTask).filter((t): t is FleetTask => t !== null),
        });
    }
    return groups;
}

export interface QueuesState {
    tasks: FleetTaskGroup[];
    expandedGroups: Set<string>;
    sending: Set<string>;

    loadTasks: () => Promise<void>;
    saveTasks: (tasks: FleetTaskGroup[]) => Promise<void>;
    updateGroup: (gIdx: number, patch: Partial<FleetTaskGroup>) => void;
    updateTask: (gIdx: number, tIdx: number, patch: Partial<FleetTask>) => void;
    addGroup: () => void;
    addTask: (gIdx: number, defaults?: Partial<FleetTask>) => void;
    removeTask: (gIdx: number, tIdx: number) => void;
    toggleGroup: (name: string) => void;
    setSending: (key: string, value: boolean) => void;
}

export const useQueuesStore = create<QueuesState>()(persist((set, get) => ({
    tasks: [],
    expandedGroups: new Set(),
    sending: new Set(),

    loadTasks: async () => {
        try {
            const fetched = await (electronQueues?.getTasks() ?? Promise.resolve(readBrowserTasks()));
            set({tasks: normalizeTasks(fetched)});
        } catch (err) {
            console.error('[queues] loadTasks error:', err);
        }
    },

    saveTasks: async (tasks) => {
        set({tasks});
        try {
            if (!electronQueues) {
                writeBrowserTasks(tasks);
                return;
            }
            await electronQueues.saveTasks(tasks);
        } catch (err) {
            console.error('[queues] saveTasks error:', err);
        }
    },

    updateGroup: (gIdx, patch) => {
        const tasks = get().tasks.map((g, i) => i === gIdx ? {...g, ...patch} : g);
        void get().saveTasks(tasks);
    },

    updateTask: (gIdx, tIdx, patch) => {
        const tasks = get().tasks.map((g, i) =>
            i === gIdx ? {...g, tasks: g.tasks.map((t, j) => j === tIdx ? {...t, ...patch} : t)} : g
        );
        void get().saveTasks(tasks);
    },

    addGroup: () => {
        const g: FleetTaskGroup = {group: 'New Group', repo: '', baseBranch: '', tasks: []};
        const tasks = [g, ...get().tasks];
        void get().saveTasks(tasks);
        set(s => ({expandedGroups: new Set(s.expandedGroups).add(g.group)}));
    },

    addTask: (gIdx, defaults) => {
        const task: FleetTask = {
            topic: 'New Task',
            action: {type: 'jules', prompt: 'Description...', folder: 'new/folder'},
            ...defaults,
        };
        const tasks = get().tasks.map((g, i) =>
            i === gIdx ? {...g, tasks: [...g.tasks, task]} : g
        );
        void get().saveTasks(tasks);
    },

    removeTask: (gIdx, tIdx) => {
        const tasks = get().tasks.map((g, i) =>
            i === gIdx ? {...g, tasks: g.tasks.filter((_, j) => j !== tIdx)} : g
        );
        void get().saveTasks(tasks);
    },

    toggleGroup: (name) => {
        set(s => {
            const next = new Set(s.expandedGroups);
            if (next.has(name)) {
                next.delete(name);
            } else {
                next.add(name);
            }
            return {expandedGroups: next};
        });
    },

    setSending: (key, value) => {
        set(s => {
            const next = new Set(s.sending);
            if (value) {
                next.add(key);
            } else {
                next.delete(key);
            }
            return {sending: next};
        });
    },
}), {
    name: 'queues-store',
    partialize: s => ({tasks: s.tasks}),
}));
