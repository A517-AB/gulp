// Ship page store — Jules session patch viewer (diff, apply, snapshot). NOT for Explorer or Sync.
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { useStore } from './app';
import { parse as parseDiff } from 'diff2html';
import type { DiffFile } from 'diff2html/lib-esm/types';
import { toast } from 'sonner';

export type ActionState = "idle" | "busy" | "done";

export interface ShipFile {
    path: string;
    changeType: "created" | "deleted" | "modified";
    additions: number;
    deletions: number;
}

export interface PatchEntry {
    files: ShipFile[];
    patch: string;
}

export interface ShipState {
    sourceId: string;
    openPatchId: string;
    openFileKey: string;
    patchData: Record<string, PatchEntry | null>;
    patchLoading: Record<string, boolean>;
    parsedDiffs: Record<string, DiffFile[]>;
    fileStates: Record<string, ActionState>;
    snapshotStates: Record<string, ActionState>;
    viewMode: 'jules' | 'sync';

    setSourceId: (id: string) => void;
    setOpenPatchId: (id: string) => void;
    setOpenFileKey: (key: string) => void;
    setViewMode: (mode: 'jules' | 'sync') => void;
    loadPatch: (sessionId: string) => Promise<void>;
    handlePatchClick: (sessionId: string) => void;
    handleFileClick: (sessionId: string, file: ShipFile, patch: string) => void;
    handleGetFile: (sessionId: string, file: ShipFile) => Promise<void>;
    handleSnapshot: (sessionId: string, effectiveSourceId?: string) => Promise<void>;
}

function extractFilePatch(unidiff: string, filePath: string): string {
    const sections = unidiff.split(/(?=^diff --git )/m).filter(Boolean);
    return sections.find(s => s.includes(`b/${filePath}`) || s.includes(`/${filePath}`)) ?? "";
}

export const useShipStore = create<ShipState>()(persist((set, get) => ({
    sourceId: "",
    openPatchId: "",
    openFileKey: "",
    patchData: {},
    patchLoading: {},
    parsedDiffs: {},
    fileStates: {},
    snapshotStates: {},
    viewMode: 'jules',

    setSourceId: (sourceId) => {
        set({ sourceId, openPatchId: "", openFileKey: "" });
    },
    setOpenPatchId: (openPatchId) => { set({ openPatchId }); },
    setOpenFileKey: (openFileKey) => { set({ openFileKey }); },
    setViewMode: (viewMode) => { set({ viewMode }); },

    loadPatch: async (sessionId) => {
        const { patchData, patchLoading } = get();
        if (patchData[sessionId] !== undefined || patchLoading[sessionId]) return;

        set(state => ({ patchLoading: { ...state.patchLoading, [sessionId]: true } }));

        try {
            const loadSessionPatch = useStore.getState().loadSessionPatch;
            const result = await loadSessionPatch(sessionId);
            set(state => ({ patchData: { ...state.patchData, [sessionId]: result } }));
        } catch {
            set(state => ({ patchData: { ...state.patchData, [sessionId]: null } }));
        } finally {
            set(state => ({ patchLoading: { ...state.patchLoading, [sessionId]: false } }));
        }
    },

    handlePatchClick: (sessionId) => {
        const { openPatchId } = get();
        if (openPatchId === sessionId) {
            set({ openPatchId: "", openFileKey: "" });
        } else {
            set({ openPatchId: sessionId, openFileKey: "" });
            void get().loadPatch(sessionId);
        }
    },

    handleFileClick: (sessionId, file, patch) => {
        const key = `${sessionId}/${file.path}`;
        const { openFileKey, parsedDiffs } = get();
        if (openFileKey === key) {
            set({ openFileKey: "" });
            return;
        }
        set({ openFileKey: key });
        if (!parsedDiffs[key]) {
            const section = extractFilePatch(patch, file.path) || patch;
            const parsed = parseDiff(section, { drawFileList: false, outputFormat: "line-by-line" });
            if (parsed.length > 0) {
                set(state => ({ parsedDiffs: { ...state.parsedDiffs, [key]: parsed } }));
            }
        }
    },

    handleGetFile: async (sessionId, file) => {
        const key = `${sessionId}/${file.path}`;
        const data = get().patchData[sessionId];
        if (!data) return;

        set(state => ({ fileStates: { ...state.fileStates, [key]: "busy" } }));
        const toastId = `get-${key}`;
        const name = file.path.split("/").pop() ?? "file";
        toast.loading(`Saving ${name}…`, { id: toastId });

        try {
            const saveFilePatch = useStore.getState().saveFilePatch;
            await saveFilePatch(sessionId, file.path, data.patch);
            toast.success("Saved", { id: toastId });
            set(state => ({ fileStates: { ...state.fileStates, [key]: "done" } }));
            setTimeout(() => {
                set(state => ({ fileStates: { ...state.fileStates, [key]: "idle" } }));
            }, 1800);
        } catch {
            toast.error("Save failed", { id: toastId });
            set(state => ({ fileStates: { ...state.fileStates, [key]: "idle" } }));
        }
    },

    handleSnapshot: async (sessionId, effectiveSourceId) => {
        const resolvedSourceId = (effectiveSourceId !== undefined && effectiveSourceId !== "")
            ? effectiveSourceId
            : (get().sourceId !== "")
            ? get().sourceId
            : (useStore.getState().sources[0]?.id ?? "");
        if (!resolvedSourceId) return;

        const toastId = `snap-${sessionId}`;
        toast.loading("Applying patch…", { id: toastId });
        set(state => ({ snapshotStates: { ...state.snapshotStates, [sessionId]: "busy" } }));

        try {
            const applyPatch = useStore.getState().applyPatch;
            const result = await applyPatch(sessionId, resolvedSourceId);
            if (result.success) {
                toast.success(result.branch ? `Applied → ${result.branch}` : "Patch applied", { id: toastId });
                set(state => ({ snapshotStates: { ...state.snapshotStates, [sessionId]: "done" } }));
                setTimeout(() => {
                    set(state => ({ snapshotStates: { ...state.snapshotStates, [sessionId]: "idle" } }));
                }, 2500);
            } else {
                toast.error(result.error ?? "Patch failed", { id: toastId });
                set(state => ({ snapshotStates: { ...state.snapshotStates, [sessionId]: "idle" } }));
            }
        } catch {
            toast.error("Snapshot failed", { id: toastId });
            set(state => ({ snapshotStates: { ...state.snapshotStates, [sessionId]: "idle" } }));
        }
    }
}), { name: 'ship-store', partialize: (s) => ({ patchData: s.patchData, parsedDiffs: s.parsedDiffs, openPatchId: s.openPatchId }) }));
