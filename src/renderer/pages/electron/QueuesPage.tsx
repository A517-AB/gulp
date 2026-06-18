"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
    ChevronDown,
    ChevronRight,
    Folder,
    ListTree,
    Plus,
    Send,
    Trash2,
} from "lucide-react";
import { queues as electronQueues } from "@shared/bridge";
import { useStore } from "@/store/app";
import { InlineEdit } from "@renderer/ui/inline-edit";
import type { Source } from "@google/jules-sdk/types";
import type { FleetTask, FleetTaskGroup } from "@jules";

const TASKS_STORAGE_KEY = "workspace:fleet-tasks";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isTaskGroup(value: unknown): value is FleetTaskGroup {
  return isRecord(value)
    && typeof value["group"] === "string"
    && Array.isArray(value["tasks"]);
}

function normalizeTasks(raw: unknown): FleetTaskGroup[] {
  if (Array.isArray(raw)) return raw.filter(isTaskGroup);
  if (isRecord(raw) && Array.isArray(raw["pipelines"])) {
    return (raw["pipelines"] as unknown[]).filter(isTaskGroup);
  }
  return [];
}

function readBrowserTasks(): FleetTaskGroup[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(TASKS_STORAGE_KEY);
    return raw ? normalizeTasks(JSON.parse(raw) as unknown) : [];
  } catch {
    return [];
  }
}

function writeBrowserTasks(tasks: FleetTaskGroup[]): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(TASKS_STORAGE_KEY, JSON.stringify(tasks));
}

// ── Source picker ──────────────────────────────────────────────────────────────

function SourcePicker({ value, sources, onChange }: {
  value: string;
  sources: Source[];
  onChange: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const selected = sources.find((s) => s.id === value);
  const label = selected?.name ?? (value ? value.replace(/^(?:sources\/)?github\//, "") : "pick repo");

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) { setOpen(false); }
    };
    document.addEventListener("mousedown", handler);
    return () => { document.removeEventListener("mousedown", handler); };
  }, [open]);

  return (
    <div ref={ref} className="relative" onClick={(e) => { e.stopPropagation(); }}>
      <button
        onClick={() => { setOpen((o) => !o); }}
        className="flex items-center gap-1 text-2xs font-mono text-fg-dim bg-hover px-1.5 py-0.5 rounded hover:bg-active hover:text-fg-secondary transition-colors"
      >
        <span className="max-w-[140px] truncate">{label}</span>
        <ChevronDown className="h-2.5 w-2.5 shrink-0 opacity-60" />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.97 }}
            transition={{ duration: 0.13, ease: "easeOut" }}
            className="absolute top-full left-0 mt-1 z-50 min-w-[180px] max-w-[280px] rounded-md border border-subtle bg-overlay shadow-xl py-1"
          >
            {sources.length === 0 && (
              <p className="px-3 py-2 text-2xs text-fg-ghost font-mono">No sources found</p>
            )}
            {sources.map((s) => (
              <button
                key={s.id}
                onClick={() => { onChange(s.id); setOpen(false); }}
                className={`w-full text-left px-3 py-1.5 text-2xs font-mono truncate hover:bg-hover transition-colors ${s.id === value ? "text-fg-primary" : "text-fg-muted"}`}
              >
                {s.name}
              </button>
            ))}
            <div className="border-t border-hair mt-1 pt-1">
              <button
                onClick={() => { onChange(""); setOpen(false); }}
                className="w-full text-left px-3 py-1.5 text-2xs font-mono text-fg-ghost hover:text-fg-muted hover:bg-hover transition-colors"
              >
                repoless
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Branch picker ──────────────────────────────────────────────────────────────

function BranchPicker({ value, branches, onChange }: {
  value: string;
  branches: string[];
  onChange: (branch: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) { setOpen(false); }
    };
    document.addEventListener("mousedown", handler);
    return () => { document.removeEventListener("mousedown", handler); };
  }, [open]);

  if (branches.length === 0) {
    return (
      <InlineEdit
        value={value}
        onSave={onChange}
        className="text-2xs font-mono text-fg-dim"
        placeholder="branch"
      />
    );
  }

  return (
    <div ref={ref} className="relative" onClick={(e) => { e.stopPropagation(); }}>
      <button
        onClick={() => { setOpen((o) => !o); }}
        className="flex items-center gap-1 text-2xs font-mono text-fg-dim bg-hover px-1.5 py-0.5 rounded hover:bg-active hover:text-fg-secondary transition-colors"
      >
        <span className="max-w-[100px] truncate">{value || "branch"}</span>
        <ChevronDown className="h-2.5 w-2.5 shrink-0 opacity-60" />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.97 }}
            transition={{ duration: 0.13, ease: "easeOut" }}
            className="absolute top-full left-0 mt-1 z-50 min-w-[160px] max-w-[240px] rounded-md border border-subtle bg-overlay shadow-xl py-1 max-h-48 overflow-y-auto"
          >
            {branches.map((b) => (
              <button
                key={b}
                onClick={() => { onChange(b); setOpen(false); }}
                className={`w-full text-left px-3 py-1.5 text-2xs font-mono truncate hover:bg-hover transition-colors ${b === value ? "text-fg-primary" : "text-fg-muted"}`}
              >
                {b}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── QueuesView ─────────────────────────────────────────────────────────────────

export default function QueuesView() {
  const storeSources = useStore(s => s.sources);
  const loadSources = useStore(s => s.loadSources);
  const runSession = useStore(s => s.runSession);
  const [tasks, setTasks] = useState<FleetTaskGroup[]>([]);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [sending, setSending] = useState<Set<string>>(new Set());

  useEffect(() => {
    async function load() {
      try {
        const fetched = await (electronQueues?.getTasks() ?? Promise.resolve(readBrowserTasks()));
        setTasks(normalizeTasks(fetched));
      } catch (err) {
        console.error("Failed to load queues:", err);
      }
    }
    void load();
  }, []);

  useEffect(() => {
    void loadSources();
  }, [loadSources]);

  const save = useCallback(async (updated: FleetTaskGroup[]) => {
    setTasks(updated);
    try {
      if (!electronQueues) { writeBrowserTasks(updated); return; }
      await electronQueues.saveTasks(updated);
    } catch (err) {
      console.error("Failed to save tasks:", err);
    }
  }, []);

  const updateGroup = (gIdx: number, patch: Partial<FleetTaskGroup>) =>
    void save(tasks.map((g, i) => (i === gIdx ? { ...g, ...patch } : g)));

  const updateTask = (gIdx: number, tIdx: number, patch: Partial<FleetTask>) =>
    void save(tasks.map((g, i) =>
      i === gIdx ? { ...g, tasks: g.tasks.map((t, j) => (j === tIdx ? { ...t, ...patch } : t)) } : g
    ));

  const addGroup = () => {
    const g: FleetTaskGroup = { group: "New Group", repo: "", baseBranch: "", tasks: [] };
    void save([g, ...tasks]);
    setExpandedGroups((prev) => new Set(prev).add(g.group));
  };

  const addTask = (gIdx: number) =>
    void save(tasks.map((g, i) =>
      i === gIdx
        ? { ...g, tasks: [...g.tasks, { folder: "new/folder", topic: "New Task", task: "Description..." }] }
        : g
    ));

  const removeTask = (gIdx: number, tIdx: number) =>
    void save(tasks.map((g, i) =>
      i === gIdx ? { ...g, tasks: g.tasks.filter((_, j) => j !== tIdx) } : g
    ));

  const toggleGroup = (name: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(name)) { next.delete(name); } else { next.add(name); }
      return next;
    });
  };

  const getBranches = (repo: string): string[] => {
    const source = storeSources.find(s => s.id === repo);
    return source?.githubRepo?.branches ?? [];
  };

  const handleSendTask = async (group: FleetTaskGroup, task: FleetTask, gIdx: number, tIdx: number, e: React.MouseEvent) => {
    e.stopPropagation();
    const key = `${gIdx.toString()}-${tIdx.toString()}`;
    if (sending.has(key)) return;
    setSending(p => new Set(p).add(key));
    const github = group.repo.replace(/^(?:sources\/)?github\//, "");
    try {
      await runSession({
        prompt: task.task,
        title: `${task.topic} (${task.folder})`,
        ...(github ? { source: { github, baseBranch: group.baseBranch || "main" } } : {}),
      });
      updateTask(gIdx, tIdx, { sent: true });
    } catch (err) {
      console.error("Failed to start session:", err);
    } finally {
      setSending(p => { const next = new Set(p); next.delete(key); return next; });
    }
  };

  const handleSendGroup = async (group: FleetTaskGroup, gIdx: number, e: React.MouseEvent) => {
    e.stopPropagation();
    const key = `group-${gIdx.toString()}`;
    if (sending.has(key)) return;
    setSending(p => new Set(p).add(key));
    const github = group.repo.replace(/^(?:sources\/)?github\//, "");
    const batchSize = group.concurrency ?? group.tasks.length;
    try {
      for (let i = 0; i < group.tasks.length; i += batchSize) {
        const batch = group.tasks.slice(i, i + batchSize);
        await Promise.all(
          batch.map((task, bIdx) =>
            runSession({
              prompt: task.task,
              title: `${task.topic} (${task.folder})`,
              ...(github ? { source: { github, baseBranch: group.baseBranch || "main" } } : {}),
            }).then(() => { updateTask(gIdx, i + bIdx, { sent: true }); })
          )
        );
      }
    } catch (err) {
      console.error("Failed to send group:", err);
    } finally {
      setSending(p => { const next = new Set(p); next.delete(key); return next; });
    }
  };

  return (
    <div className="flex flex-col h-full p-4 overflow-hidden max-w-4xl mx-auto w-full">

      <div className="flex items-center justify-end mb-3">
        <button
          onClick={addGroup}
          className="bg-hover border border-hair text-fg-secondary text-2xs px-3 py-1.5 rounded-md flex items-center gap-2 hover:bg-active hover:text-fg-primary transition-colors"
        >
          <Plus className="h-3 w-3" />
          NEW GROUP
        </button>
      </div>

      <div className="flex-1 overflow-auto pr-1 pb-12 space-y-0.5">
        {tasks.length === 0 && (
          <div className="rounded-lg border border-dashed border-hair p-12 text-center mt-4">
            <p className="label-mono text-fg-ghost">No tasks in manifest.</p>
          </div>
        )}

        {tasks.map((group, gIdx) => {
          const isExpanded = expandedGroups.has(group.group);
          const groupSending = sending.has(`group-${gIdx.toString()}`);
          const branches = getBranches(group.repo);

          return (
            <div key={`${group.group}-${gIdx.toString()}`} className="border-b border-hair last:border-0">

              {/* Group header */}
              <div
                onClick={() => { toggleGroup(group.group); }}
                className="flex items-center justify-between py-2.5 px-2 cursor-pointer hover:bg-hover rounded-md transition-colors"
              >
                <div className="flex items-center gap-2.5" onClick={(e) => { e.stopPropagation(); }}>
                  <motion.div
                    animate={{ rotate: isExpanded ? 90 : 0 }}
                    transition={{ duration: 0.16, ease: [0.4, 0, 0.2, 1] }}
                    className="text-fg-dim cursor-pointer shrink-0"
                    onClick={() => { toggleGroup(group.group); }}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </motion.div>

                  <InlineEdit
                    value={group.group}
                    onSave={(v) => { updateGroup(gIdx, { group: v }); }}
                    className="text-2xs font-bold text-fg-primary uppercase tracking-widest"
                    placeholder="Group name"
                  />
                  <SourcePicker
                    value={group.repo}
                    sources={storeSources}
                    onChange={(v) => { updateGroup(gIdx, { repo: v }); }}
                  />
                  <BranchPicker
                    value={group.baseBranch ?? ""}
                    branches={branches}
                    onChange={(v) => { updateGroup(gIdx, { baseBranch: v }); }}
                  />
                  <div className="flex items-center gap-1" onClick={(e) => { e.stopPropagation(); }}>
                    <span className="text-2xs font-mono text-fg-ghost">×</span>
                    <input
                      type="number"
                      min={1}
                      max={20}
                      value={group.concurrency ?? group.tasks.length}
                      onChange={(e) => {
                        const v = parseInt(e.target.value, 10);
                        if (!isNaN(v) && v > 0) updateGroup(gIdx, { concurrency: v });
                      }}
                      className="w-8 text-center text-2xs font-mono text-fg-dim bg-transparent border-b border-hair focus:outline-none focus:border-subtle"
                    />
                  </div>
                  <span className="text-2xs font-mono text-fg-ghost">({group.tasks.length})</span>
                </div>

                <button
                  onClick={(e) => { void handleSendGroup(group, gIdx, e); }}
                  disabled={groupSending}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded border border-hair text-2xs font-mono text-fg-muted hover:text-fg-primary hover:border-subtle transition-all disabled:opacity-40"
                >
                  <Send className="h-3 w-3" />
                  SEND ALL
                </button>
              </div>

              {/* Expandable task rows */}
              <AnimatePresence initial={false}>
                {isExpanded && (
                  <motion.div
                    key="tasks"
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.15 }}
                    className="overflow-hidden"
                  >
                    <div className="pl-8 pr-2 py-1 space-y-0.5">
                      {group.tasks.map((task, tIdx) => {
                        const taskKey = `${gIdx.toString()}-${tIdx.toString()}`;
                        const taskSending = sending.has(taskKey);

                        return (
                          <motion.div
                            key={taskKey}
                            initial={{ opacity: 0, x: -6 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ duration: 0.14, delay: tIdx * 0.025 }}
                            className={`flex flex-col py-2.5 px-2 rounded-md border transition-colors ${
                              task.sent === true
                                ? "border-transparent opacity-40"
                                : "border-transparent hover:bg-hover hover:border-hair"
                            }`}
                          >
                            <div className="flex items-start justify-between">
                              <div className="flex items-start gap-2.5 flex-1 pr-4">
                                <div className="flex flex-col gap-1 flex-1">
                                  <div className="flex items-center gap-1.5">
                                    <Folder className="h-3 w-3 text-fg-ghost shrink-0" />
                                    <InlineEdit
                                      value={task.folder}
                                      onSave={(v) => { updateTask(gIdx, tIdx, { folder: v }); }}
                                      className="text-2xs font-mono text-fg-dim"
                                      placeholder="folder/path"
                                    />
                                    {task.sent === true && (
                                      <span className="text-2xs font-mono text-fg-ghost">· sent</span>
                                    )}
                                  </div>
                                  <InlineEdit
                                    value={task.topic}
                                    onSave={(v) => { updateTask(gIdx, tIdx, { topic: v }); }}
                                    className="text-xs font-semibold text-fg-primary"
                                    placeholder="Topic"
                                  />
                                  <InlineEdit
                                    value={task.task}
                                    onSave={(v) => { updateTask(gIdx, tIdx, { task: v }); }}
                                    multiline
                                    className="text-2xs text-fg-muted leading-relaxed"
                                    placeholder="Task prompt..."
                                  />
                                </div>
                              </div>

                              <div className="flex items-center gap-1 shrink-0">
                                <button
                                  onClick={() => { removeTask(gIdx, tIdx); }}
                                  aria-label={`Remove ${task.topic}`}
                                  className="flex items-center justify-center h-7 w-7 rounded text-fg-ghost hover:text-destructive hover:bg-hover transition-all"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                                <button
                                  onClick={(e) => { void handleSendTask(group, task, gIdx, tIdx, e); }}
                                  disabled={taskSending || task.sent === true}
                                  aria-label={`Send ${task.topic}`}
                                  className="flex items-center justify-center h-7 w-7 rounded border border-hair text-fg-muted hover:text-fg-primary hover:border-subtle transition-all disabled:opacity-40"
                                >
                                  <Send className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            </div>

                            {task.followUps && task.followUps.length > 0 && (
                              <div className="ml-6 mt-2 pl-3 border-l border-hair space-y-1.5">
                                {task.followUps.map((fu, fIdx) => (
                                  <div key={fIdx} className="flex items-start gap-2">
                                    <ListTree className="h-3 w-3 text-fg-ghost mt-0.5 shrink-0" />
                                    <div className="flex flex-col gap-0.5">
                                      <span className="text-2xs font-medium text-fg-secondary">{fu.topic}</span>
                                      <span className="text-2xs text-fg-dim">{fu.task}</span>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </motion.div>
                        );
                      })}

                      <button
                        onClick={() => { addTask(gIdx); }}
                        className="text-2xs flex items-center gap-1.5 text-fg-ghost hover:text-fg-muted transition-colors py-1 px-2 rounded-md hover:bg-hover border border-transparent border-dashed hover:border-hair mt-1 w-full"
                      >
                        <Plus className="h-3 w-3" />
                        NEW TASK
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>
    </div>
  );
}
