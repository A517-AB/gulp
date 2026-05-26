"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  ListTodo, ChevronRight, ChevronDown, Send, Loader2,
  Plus, Folder, Trash2, CheckSquare, ListTree,
} from "lucide-react";
import { useJules } from "@renderer/lib/jules/provider";
import { queues as electronQueues, isElectron } from "@shared/bridge";
import { InlineEdit } from "@renderer/ui/inline-edit";
import type { Source, FleetTask, FleetTaskGroup } from "../../../types/jules";

const TASKS_STORAGE_KEY = "jules:fleet-tasks";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isTaskGroup(value: unknown): value is FleetTaskGroup {
  return isRecord(value)
    && typeof value['group'] === "string"
    && Array.isArray(value['tasks']);
}

function normalizeTasks(raw: unknown): FleetTaskGroup[] {
  if (Array.isArray(raw)) {
    return raw.filter(isTaskGroup);
  }

  if (isRecord(raw) && Array.isArray(raw['pipelines'])) {
    return raw['pipelines'].filter(isTaskGroup);
  }

  return [];
}

function readBrowserTasks(): FleetTaskGroup[] {
  if (typeof window === "undefined") {
    return [];
  }

  const raw = window.localStorage.getItem(TASKS_STORAGE_KEY);
  if (!raw) {
    return [];
  }

  try {
    return normalizeTasks(JSON.parse(raw));
  } catch {
    return [];
  }
}

function writeBrowserTasks(tasks: FleetTaskGroup[]): void {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(TASKS_STORAGE_KEY, JSON.stringify(tasks));
}

// ── Source picker ─────────────────────────────────────────────────────────────

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
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  return (
    <div ref={ref} className="relative" onClick={(e) => e.stopPropagation()}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1 text-[10px] font-mono text-white/30 bg-white/5 px-1.5 py-0.5 rounded hover:bg-white/10 hover:text-white/60 transition-colors"
      >
        <span className="max-w-[140px] truncate">{label || "pick repo"}</span>
        <ChevronDown className="h-2.5 w-2.5 shrink-0" />
      </button>
      {open && (
        <div className="absolute top-full left-0 mt-1 z-50 min-w-[180px] max-w-[280px] rounded border border-white/10 bg-zinc-950 shadow-xl py-1">
          {sources.length === 0 && (
            <p className="px-3 py-2 text-[10px] text-white/30 font-mono">No sources found</p>
          )}
          {sources.map((s) => (
            <button
              key={s.id}
              onClick={() => { onChange(s.id); setOpen(false); }}
              className={`w-full text-left px-3 py-1.5 text-[10px] font-mono truncate hover:bg-white/5 transition-colors ${s.id === value ? "text-white" : "text-white/50"}`}
            >
              {s.name}
            </button>
          ))}
          <div className="border-t border-white/5 mt-1 pt-1">
            <button
              onClick={() => { onChange(""); setOpen(false); }}
              className="w-full text-left px-3 py-1.5 text-[10px] font-mono text-white/20 hover:text-white/50 hover:bg-white/5 transition-colors"
            >
              clear
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── QueuesView ────────────────────────────────────────────────────────────────

export default function QueuesView() {
  const { client } = useJules();
  const [sources, setSources] = useState<Source[]>([]);
  const [tasks, setTasks] = useState<FleetTaskGroup[]>([]);
  const [queue, setQueue] = useState<unknown[]>([]);
  const [loading, setLoading] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [sendingStates, setSendingStates] = useState<Record<string, boolean>>({});
  const [selectedTasks, setSelectedTasks] = useState<Set<string>>(new Set());

  useEffect(() => {
    async function load() {
      try {
        const [fetchedTasks, fetchedQueue] = await Promise.all([
          isElectron ? electronQueues?.getTasks?.() ?? Promise.resolve([]) : Promise.resolve(readBrowserTasks()),
          isElectron ? electronQueues?.getQueue?.() ?? Promise.resolve([]) : Promise.resolve<unknown[]>([]),
        ]);
        setTasks(normalizeTasks(fetchedTasks));
        setQueue(fetchedQueue || []);
      } catch (err) {
        console.error("Failed to load queues:", err);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, []);

  useEffect(() => {
    if (!client) return;
    client.listSources().then(setSources).catch(console.error);
  }, [client]);

  const save = useCallback(async (updated: FleetTaskGroup[]) => {
    setTasks(updated);
    try {
      if (!isElectron) {
        writeBrowserTasks(updated);
        return;
      }

      await electronQueues?.saveTasks?.(updated);
    } catch (err) {
      console.error("Failed to save tasks:", err);
    }
  }, []);

  const updateGroup = (gIdx: number, patch: Partial<FleetTaskGroup>) =>
    save(tasks.map((g: FleetTaskGroup, i: number) => (i === gIdx ? { ...g, ...patch } : g)));

  const updateTask = (gIdx: number, tIdx: number, patch: Partial<FleetTask>) =>
    save(tasks.map((g: FleetTaskGroup, i: number) =>
      i === gIdx ? { ...g, tasks: g.tasks.map((t: FleetTask, j: number) => (j === tIdx ? { ...t, ...patch } : t)) } : g
    ));

  const addGroup = () => {
    const g: FleetTaskGroup = { group: "New Group", repo: "", baseBranch: "main", tasks: [] };
    save([g, ...tasks]);
    setExpandedGroups((prev) => new Set(prev).add(g.group));
  };

  const addTask = (gIdx: number) =>
    save(tasks.map((g: FleetTaskGroup, i: number) =>
      i === gIdx
        ? { ...g, tasks: [...g.tasks, { folder: "new/folder", topic: "New Task", task: "Description..." }] }
        : g
    ));

  const removeTask = (gIdx: number, tIdx: number) =>
    save(tasks.map((g: FleetTaskGroup, i: number) =>
      i === gIdx ? { ...g, tasks: g.tasks.filter((_: any, j: number) => j !== tIdx) } : g
    ));

  const toggleGroup = (name: string) =>
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      next.has(name) ? next.delete(name) : next.add(name);
      return next;
    });

  const toggleTask = (id: string) =>
    setSelectedTasks((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

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
        startingBranch: group.baseBranch || "main",
      });
      console.log('Success');
    } catch (err) {
      console.error("Failed to start session:", err);
      console.error('Error');
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
        group.tasks.map((task: FleetTask) =>
          client.createSession({
            prompt: task.task,
            title: `${task.topic} (${task.folder})`,
            sourceId: group.repo,
            startingBranch: group.baseBranch || "main",
          })
        )
      );
      console.log('Success');
    } catch (err) {
      console.error("Failed to send group:", err);
      console.error('Error');
    } finally {
      setSendingStates((p) => ({ ...p, [key]: false }));
    }
  };

  const handleSendSelected = async () => {
    if (!client || selectedTasks.size === 0) return;
    const byRepo: Record<string, { repo: string; baseBranch: string; tasks: FleetTask[] }> = {};
    tasks.forEach((group, gIdx) => {
      group.tasks.forEach((task: FleetTask, tIdx: number) => {
        if (!selectedTasks.has(`${gIdx}-${tIdx}`)) return;
        if (!byRepo[group.repo]) byRepo[group.repo] = { repo: group.repo, baseBranch: group.baseBranch || "main", tasks: [] };
        byRepo[group.repo]!['tasks'].push(task);
      });
    });
    setSendingStates((p) => ({ ...p, selected: true }));
    try {
      for (const { repo, baseBranch, tasks: selected } of Object.values(byRepo)) {
        const prompt = `I need you to perform the following combined tasks:\n\n${selected.map((t: FleetTask, i: number) => `${i + 1}. **${t.topic}** (${t.folder})\n   ${t.task}`).join("\n")}`;
        await client.createSession({ prompt, title: `Combined Tasks (${selected.length})`, sourceId: repo, startingBranch: baseBranch });
      }
      console.log('Success');
      setSelectedTasks(new Set());
    } catch (err) {
      console.error("Failed to send selected:", err);
      console.error('Error');
    } finally {
      setSendingStates((p) => ({ ...p, selected: false }));
    }
  };

  if (loading && tasks.length === 0) {
    return (
      <div className="flex h-full items-center justify-center p-8">
        <p className="text-sm font-mono text-white/40 animate-pulse uppercase tracking-widest">Loading Fleet...</p>
      </div>
    );
  }

  const totalTasks = tasks.reduce((acc, g) => acc + (g.tasks?.length || 0), 0);

  return (
    <div className="flex flex-col h-full p-6 overflow-hidden max-w-7xl mx-auto w-full">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-md bg-white/5 border border-white/10 flex items-center justify-center">
            <ListTodo className="h-4 w-4 text-white/60" />
          </div>
          <div>
            <h2 className="text-lg font-bold tracking-tight text-white uppercase">Fleet Manifest</h2>
            <p className="text-[10px] text-white/40 font-mono uppercase tracking-widest">tasks.json / jules-queue.json</p>
          </div>
        </div>
        <div className="flex gap-2 items-center">
          {selectedTasks.size > 0 && (
            <button
              onClick={handleSendSelected}
              disabled={sendingStates['selected'] || !client}
              className="bg-white/10 border border-white/20 text-white text-xs px-3 py-1.5 rounded flex items-center gap-2 hover:bg-white/20 transition-colors disabled:opacity-50"
            >
              {sendingStates['selected'] ? <Loader2 className="h-3 w-3 animate-spin" /> : <Send className="h-3 w-3" />}
              SEND SELECTED ({selectedTasks.size})
            </button>
          )}
          <button
            onClick={addGroup}
            className="bg-white/5 border border-white/10 text-white/80 text-xs px-3 py-1.5 rounded flex items-center gap-2 hover:bg-white/10 hover:text-white transition-colors"
          >
            <Plus className="h-3 w-3" />
            NEW GROUP
          </button>
          <span className="bg-white/5 border border-white/10 text-white/60 text-[10px] px-2.5 py-1 rounded font-mono flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />
            {totalTasks} TOTAL TASKS
          </span>
          <span className="bg-white/5 border border-white/10 text-white/60 text-[10px] px-2.5 py-1 rounded font-mono flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-purple-500" />
            {queue.length} IN QUEUE
          </span>
        </div>
      </div>

      <div className="flex-1 overflow-auto space-y-2 pr-2 pb-12">
        {tasks.map((group, gIdx) => {
          const isExpanded = expandedGroups.has(group.group);
          return (
            <div key={gIdx} className="border-b border-white/[0.08] last:border-0 pb-2">
              <div
                onClick={() => toggleGroup(group.group)}
                className="flex items-center justify-between py-3 cursor-pointer group/header hover:bg-white/[0.02] rounded px-2 transition-colors"
              >
                <div className="flex items-center gap-3" onClick={(e) => e.stopPropagation()}>
                  <ChevronRight
                    onClick={() => toggleGroup(group.group)}
                    className={`h-4 w-4 text-white/40 cursor-pointer transition-transform duration-300 ${isExpanded ? "rotate-90" : ""}`}
                  />
                  <InlineEdit value={group.group} onSave={(v) => updateGroup(gIdx, { group: v })} className="text-xs font-bold text-white/80 uppercase tracking-widest" placeholder="Group name" />
                  <SourcePicker value={group.repo} sources={sources} onChange={(v) => updateGroup(gIdx, { repo: v })} />
                  <InlineEdit value={group.baseBranch || "main"} onSave={(v) => updateGroup(gIdx, { baseBranch: v })} className="text-[10px] font-mono text-purple-400/60" placeholder="main" />
                  <span className="text-[10px] font-mono text-blue-400/60">({group.tasks?.length || 0})</span>
                </div>
                <button
                  onClick={(e) => handleSendGroup(group, e)}
                  disabled={sendingStates[`group-${group.group}`] || !client}
                  className="opacity-0 group-hover/header:opacity-100 flex items-center gap-2 px-3 py-1.5 rounded border border-white/10 text-[10px] font-mono text-white/60 hover:text-white hover:border-white/30 transition-all disabled:opacity-50"
                >
                  {sendingStates[`group-${group.group}`] ? <Loader2 className="h-3 w-3 animate-spin" /> : <Send className="h-3 w-3" />}
                  SEND ALL
                </button>
              </div>

              <div className={`grid transition-all duration-300 ${isExpanded ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"}`}>
                <div className="overflow-hidden">
                  <div className="pl-9 pr-2 py-2 space-y-2">
                    {group.tasks?.map((task: FleetTask, tIdx: number) => {
                      const taskId = `${gIdx}-${tIdx}`;
                      const isSelected = selectedTasks.has(taskId);
                      return (
                        <div key={tIdx} className={`flex flex-col group/task py-2.5 border-b border-white/[0.04] last:border-0 ${isSelected ? "bg-white/[0.02]" : ""}`}>
                          <div className="flex items-start justify-between">
                            <div className="flex items-start gap-3 flex-1 pr-6">
                              <div className="mt-1 cursor-pointer opacity-50 hover:opacity-100 transition-opacity" onClick={() => toggleTask(taskId)}>
                                <CheckSquare className={`h-4 w-4 ${isSelected ? "text-blue-400" : "text-white/40"}`} />
                              </div>
                              <div className="flex flex-col gap-1.5 flex-1">
                                <div className="flex items-center gap-2">
                                  <Folder className="h-3 w-3 text-blue-400/60 shrink-0" />
                                  <InlineEdit value={task.folder} onSave={(v) => updateTask(gIdx, tIdx, { folder: v })} className="text-[11px] font-mono text-white/60" placeholder="folder/path" />
                                </div>
                                <InlineEdit value={task.topic} onSave={(v) => updateTask(gIdx, tIdx, { topic: v })} className="text-sm font-semibold text-white/90" placeholder="Topic" />
                                <InlineEdit value={task.task} onSave={(v) => updateTask(gIdx, tIdx, { task: v })} multiline className="text-[11px] text-white/40 leading-relaxed" placeholder="Task prompt..." />
                              </div>
                            </div>
                            <div className="flex items-center gap-1 opacity-0 group-hover/task:opacity-100 transition-opacity">
                              <button
                                onClick={() => removeTask(gIdx, tIdx)}
                                aria-label={`Remove ${task.topic}`}
                                title={`Remove ${task.topic}`}
                                className="flex items-center justify-center h-8 w-8 rounded text-white/40 hover:text-red-400 hover:bg-white/5 transition-all"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                              <button
                                onClick={(e) => handleSendTask(group, task, e)}
                                disabled={sendingStates[`${group.group}-${task.folder}`] || !client}
                                aria-label={`Send ${task.topic}`}
                                title={`Send ${task.topic}`}
                                className="flex items-center justify-center h-8 w-8 rounded border border-white/10 text-white/60 hover:text-white hover:border-white/30 transition-all disabled:opacity-50"
                              >
                                {sendingStates[`${group.group}-${task.folder}`] ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                              </button>
                            </div>
                          </div>
                          {task.followUps && task.followUps.length > 0 && (
                            <div className="ml-7 mt-2 pl-4 border-l border-white/10 space-y-2">
                              {task.followUps.map((fu: any, fIdx: number) => (
                                <div key={fIdx} className="flex items-start gap-2">
                                  <ListTree className="h-3 w-3 text-white/20 mt-1 shrink-0" />
                                  <div className="flex flex-col gap-1">
                                    <span className="text-[11px] font-semibold text-white/70">{fu.topic}</span>
                                    <span className="text-[10px] text-white/40">{fu.task}</span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                    <div className="pt-2">
                      <button onClick={() => addTask(gIdx)} className="text-[10px] flex items-center gap-1.5 text-white/40 hover:text-white transition-colors py-1 px-2 rounded hover:bg-white/5 border border-transparent border-dashed hover:border-white/10">
                        <Plus className="h-3 w-3" />
                        NEW TASK
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
        {tasks.length === 0 && (
          <div className="rounded-lg border border-white/[0.08] bg-zinc-950 p-12 text-center border-dashed">
            <p className="text-xs text-white/30 uppercase tracking-widest font-mono">No tasks found in manifest.</p>
          </div>
        )}
      </div>
    </div>
  );
}
