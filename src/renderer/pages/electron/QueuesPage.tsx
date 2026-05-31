"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ListTodo, ChevronRight, ChevronDown, Send, Loader2,
  Plus, Folder, Trash2, CheckSquare, ListTree,
} from "lucide-react";
import { useJules } from "@renderer/lib/jules/provider";
import { queues as electronQueues, isElectron } from "@shared/bridge";
import { InlineEdit } from "@renderer/ui/inline-edit";
import type { Source, FleetTask, FleetTaskGroup } from "@/types/jules";

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
  const label = selected?.name ?? value;

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
        <span className="max-w-[140px] truncate">{label || "pick repo"}</span>
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
                clear
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── QueuesView ─────────────────────────────────────────────────────────────────

export default function QueuesView() {
  const { client } = useJules();
  const [sources, setSources] = useState<Source[]>([]);
  const [tasks, setTasks] = useState<FleetTaskGroup[]>([]);
  const [queue, setQueue] = useState<unknown[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [sendingStates, setSendingStates] = useState<Record<string, boolean>>({});
  const [selectedTasks, setSelectedTasks] = useState<Set<string>>(new Set());

  useEffect(() => {
    async function load() {
      try {
        const [fetchedTasks, fetchedQueue] = await Promise.all([
          isElectron
            ? (electronQueues?.getTasks() ?? Promise.resolve([]))
            : Promise.resolve(readBrowserTasks()),
          isElectron
            ? (electronQueues?.getQueue() ?? Promise.resolve([]))
            : Promise.resolve<unknown[]>([]),
        ]);
        setTasks(normalizeTasks(fetchedTasks));
        setQueue(fetchedQueue);
      } catch (err) {
        console.error("Failed to load queues:", err);
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, []);

  useEffect(() => {
    if (!client) return;
    void client.listSources().then(setSources).catch(console.error);
  }, [client]);

  const save = useCallback(async (updated: FleetTaskGroup[]) => {
    setTasks(updated);
    try {
      if (!isElectron) { writeBrowserTasks(updated); return; }
      await electronQueues?.saveTasks(updated);
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
    const g: FleetTaskGroup = { group: "New Group", repo: "", baseBranch: "main", tasks: [] };
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

  const toggleTask = (id: string) => {
    setSelectedTasks((prev) => {
      const next = new Set(prev);
      if (next.has(id)) { next.delete(id); } else { next.add(id); }
      return next;
    });
  };

  const handleSendTask = async (group: FleetTaskGroup, task: FleetTask, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!client) return;
    const key = `${group.group}-${task.folder}`;
    setSendingStates((p) => ({ ...p, [key]: true }));
    try {
      await client.createSession({
        prompt: task.task,
        title: `${task.topic} (${task.folder})`,
        sourceId: group.repo,
        startingBranch: group.baseBranch ?? "main",
      });
    } catch (err) {
      console.error("Failed to start workspace:", err);
    } finally {
      setSendingStates((p) => ({ ...p, [key]: false }));
    }
  };

  const handleSendGroup = async (group: FleetTaskGroup, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!client) return;
    const key = `group-${group.group}`;
    setSendingStates((p) => ({ ...p, [key]: true }));
    try {
      await Promise.all(
        group.tasks.map((task) =>
          client.createSession({
            prompt: task.task,
            title: `${task.topic} (${task.folder})`,
            sourceId: group.repo,
            startingBranch: group.baseBranch ?? "main",
          })
        )
      );
    } catch (err) {
      console.error("Failed to send group:", err);
    } finally {
      setSendingStates((p) => ({ ...p, [key]: false }));
    }
  };

  const handleSendSelected = async () => {
    if (!client || selectedTasks.size === 0) return;
    const byRepo: Record<string, { repo: string; baseBranch: string; tasks: FleetTask[] }> = {};
    tasks.forEach((group, gIdx) => {
      group.tasks.forEach((task, tIdx) => {
        if (!selectedTasks.has(`${gIdx.toString()}-${tIdx.toString()}`)) return;
        const entry = byRepo[group.repo] ?? { repo: group.repo, baseBranch: group.baseBranch ?? "main", tasks: [] };
        entry.tasks.push(task);
        byRepo[group.repo] = entry;
      });
    });
    setSendingStates((p) => ({ ...p, selected: true }));
    try {
      for (const { repo, baseBranch, tasks: selected } of Object.values(byRepo)) {
        const prompt = `I need you to perform the following combined tasks:\n\n${
          selected.map((t, i) => `${(i + 1).toString()}. **${t.topic}** (${t.folder})\n   ${t.task}`).join("\n")
        }`;
        await client.createSession({
          prompt,
          title: `Combined Tasks (${selected.length.toString()})`,
          sourceId: repo,
          startingBranch: baseBranch,
        });
      }
      setSelectedTasks(new Set());
    } catch (err) {
      console.error("Failed to send selected:", err);
    } finally {
      setSendingStates((p) => ({ ...p, selected: false }));
    }
  };

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="label-mono text-fg-ghost animate-pulse"
        >
          Loading Fleet...
        </motion.p>
      </div>
    );
  }

  const totalTasks = tasks.reduce((acc, g) => acc + g.tasks.length, 0);

  return (
    <div className="flex flex-col h-full p-6 overflow-hidden max-w-7xl mx-auto w-full">

      {/* ── Header ── */}
      <motion.div
        initial={{ opacity: 0, y: -6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.18 }}
        className="flex items-center justify-between mb-8"
      >
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-md bg-hover border border-hair flex items-center justify-center">
            <ListTodo className="h-4 w-4 text-fg-muted" />
          </div>
          <div>
            <h2 className="text-sm font-bold tracking-tight text-fg-primary uppercase">Fleet Manifest</h2>
            <p className="label-mono text-fg-ghost">tasks.json / jules-queue.json</p>
          </div>
        </div>

        <div className="flex gap-2 items-center">
          <AnimatePresence>
            {selectedTasks.size > 0 && (
              <motion.button
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.13 }}
                onClick={() => { void handleSendSelected(); }}
                disabled={sendingStates["selected"] ?? !client}
                className="bg-active border border-subtle text-fg-primary text-2xs px-3 py-1.5 rounded-md flex items-center gap-2 hover:bg-hover transition-colors disabled:opacity-40"
              >
                {sendingStates["selected"] ? <Loader2 className="h-3 w-3 animate-spin" /> : <Send className="h-3 w-3" />}
                SEND SELECTED ({selectedTasks.size})
              </motion.button>
            )}
          </AnimatePresence>

          <button
            onClick={addGroup}
            className="bg-hover border border-hair text-fg-secondary text-2xs px-3 py-1.5 rounded-md flex items-center gap-2 hover:bg-active hover:text-fg-primary transition-colors"
          >
            <Plus className="h-3 w-3" />
            NEW GROUP
          </button>

          <span className="bg-hover border border-hair text-fg-dim label-mono px-2.5 py-1 rounded-md flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-primary" />
            {totalTasks} TASKS
          </span>
          <span className="bg-hover border border-hair text-fg-dim label-mono px-2.5 py-1 rounded-md flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-accent" />
            {queue.length} IN QUEUE
          </span>
        </div>
      </motion.div>

      {/* ── Task list ── */}
      <div className="flex-1 overflow-auto pr-1 pb-12 space-y-0.5">
        {tasks.length === 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="rounded-lg border border-dashed border-hair p-12 text-center mt-4"
          >
            <p className="label-mono text-fg-ghost">No tasks found in manifest.</p>
          </motion.div>
        )}

        {tasks.map((group, gIdx) => {
          const isExpanded = expandedGroups.has(group.group);
          const groupSending = sendingStates[`group-${group.group}`] ?? false;

          return (
            <div key={`${group.group}-${gIdx.toString()}`} className="border-b border-hair last:border-0">

              {/* Group header */}
              <div
                onClick={() => { toggleGroup(group.group); }}
                className="flex items-center justify-between py-2.5 px-2 cursor-pointer group/header hover:bg-hover rounded-md transition-colors"
              >
                <div className="flex items-center gap-2.5" onClick={(e) => { e.stopPropagation(); }}>
                  <motion.div
                    animate={{ rotate: isExpanded ? 90 : 0 }}
                    transition={{ duration: 0.16, ease: [0.4, 0, 0.2, 1] }}
                    className="text-fg-dim cursor-pointer"
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
                    sources={sources}
                    onChange={(v) => { updateGroup(gIdx, { repo: v }); }}
                  />
                  <InlineEdit
                    value={group.baseBranch ?? "main"}
                    onSave={(v) => { updateGroup(gIdx, { baseBranch: v }); }}
                    className="text-2xs font-mono text-primary/60"
                    placeholder="main"
                  />
                  <span className="text-2xs font-mono text-fg-ghost">({group.tasks.length})</span>
                </div>

                <button
                  onClick={(e) => { void handleSendGroup(group, e); }}
                  disabled={groupSending || !client}
                  className="opacity-0 group-hover/header:opacity-100 flex items-center gap-1.5 px-2.5 py-1 rounded border border-hair text-2xs font-mono text-fg-muted hover:text-fg-primary hover:border-subtle transition-all disabled:opacity-40"
                >
                  {groupSending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Send className="h-3 w-3" />}
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
                    transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
                    className="overflow-hidden"
                  >
                    <div className="pl-8 pr-2 py-1 space-y-0.5">
                      {group.tasks.map((task, tIdx) => {
                        const taskId = `${gIdx.toString()}-${tIdx.toString()}`;
                        const isSelected = selectedTasks.has(taskId);
                        const taskSending = sendingStates[`${group.group}-${task.folder}`] ?? false;

                        return (
                          <motion.div
                            key={taskId}
                            initial={{ opacity: 0, x: -6 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ duration: 0.14, delay: tIdx * 0.025 }}
                            className={`flex flex-col group/task py-2.5 px-2 rounded-md border transition-colors ${
                              isSelected
                                ? "bg-selected border-subtle"
                                : "border-transparent hover:bg-hover hover:border-hair"
                            }`}
                          >
                            <div className="flex items-start justify-between">
                              <div className="flex items-start gap-2.5 flex-1 pr-4">
                                <button
                                  className="mt-0.5 opacity-40 hover:opacity-90 transition-opacity shrink-0"
                                  onClick={() => { toggleTask(taskId); }}
                                >
                                  <CheckSquare className={`h-4 w-4 ${isSelected ? "text-primary" : "text-fg-dim"}`} />
                                </button>

                                <div className="flex flex-col gap-1 flex-1">
                                  <div className="flex items-center gap-1.5">
                                    <Folder className="h-3 w-3 text-primary/50 shrink-0" />
                                    <InlineEdit
                                      value={task.folder}
                                      onSave={(v) => { updateTask(gIdx, tIdx, { folder: v }); }}
                                      className="text-2xs font-mono text-fg-dim"
                                      placeholder="folder/path"
                                    />
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

                              <div className="flex items-center gap-1 opacity-0 group-hover/task:opacity-100 transition-opacity shrink-0">
                                <button
                                  onClick={() => { removeTask(gIdx, tIdx); }}
                                  aria-label={`Remove ${task.topic}`}
                                  className="flex items-center justify-center h-7 w-7 rounded text-fg-ghost hover:text-destructive hover:bg-hover transition-all"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                                <button
                                  onClick={(e) => { void handleSendTask(group, task, e); }}
                                  disabled={taskSending || !client}
                                  aria-label={`Send ${task.topic}`}
                                  className="flex items-center justify-center h-7 w-7 rounded border border-hair text-fg-muted hover:text-fg-primary hover:border-subtle transition-all disabled:opacity-40"
                                >
                                  {taskSending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
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
