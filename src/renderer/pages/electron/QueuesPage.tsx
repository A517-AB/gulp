"use client";

import {useCallback, useEffect} from "react";
import {AnimatePresence, motion} from "framer-motion";
import {ChevronRight, Plus, Send} from "lucide-react";
import {parseRepoSlug, useGithubStore} from "@/store/github";
import {useQueuesStore} from "@/store/queues";
import {useStore} from "@/store/app";
import {InlineEdit} from "@renderer/ui/inline-edit";
import {BranchPicker, SourcePicker, TaskRow} from "@/components/queues";
import type {FleetTask, FleetTaskGroup} from "@jules";

export default function QueuesView() {
    const {
        tasks, expandedGroups, sending,
        loadTasks, updateGroup, updateTask, addGroup, addTask, removeTask, toggleGroup, setSending,
    } = useQueuesStore();
    const {createIssue, createPR} = useGithubStore();
  const storeSources = useStore(s => s.sources);
  const loadSources = useStore(s => s.loadSources);
  const runSession = useStore(s => s.runSession);
    useEffect(() => {
        void loadTasks();
    }, [loadTasks]);
    useEffect(() => {
        void loadSources();
    }, [loadSources]);

    const dispatch = useCallback(async (group: FleetTaskGroup, task: FleetTask) => {
        const parsed = parseRepoSlug(group.repo);
        switch (task.action.type) {
            case 'jules': {
                const github = group.repo.replace(/^(?:sources\/)?github\//, "");
                await runSession({
                    prompt: task.action.prompt,
                    title: task.action.folder ? `${task.topic} (${task.action.folder})` : task.topic,
                    ...(github ? {source: {github, baseBranch: group.baseBranch ?? "main"}} : {}),
                });
                break;
      }
            case 'issue': {
                if (!parsed) break;
                await createIssue(parsed.owner, parsed.repo, {
                    title: task.topic,
                    ...(task.action.body !== undefined ? {body: task.action.body} : {}),
                    ...(task.action.labels !== undefined ? {labels: task.action.labels} : {}),
                });
                break;
            }
            case 'pr': {
                if (!parsed) break;
                await createPR(parsed.owner, parsed.repo, {
                    title: task.topic,
                    head: task.action.head,
                    base: task.action.base ?? group.baseBranch ?? "main",
                    ...(task.action.body !== undefined ? {body: task.action.body} : {}),
                });
                break;
            }
        }
    }, [runSession, createIssue, createPR]);

    const handleDispatchTask = async (group: FleetTaskGroup, task: FleetTask, gIdx: number, tIdx: number, e: React.MouseEvent) => {
    e.stopPropagation();
        const key = `${gIdx}-${tIdx}`;
    if (sending.has(key)) return;
        setSending(key, true);
    try {
        await dispatch(group, task);
        updateTask(gIdx, tIdx, {usedCount: (task.usedCount ?? 0) + 1});
    } catch (err) {
        console.error("dispatch failed:", err);
    } finally {
        setSending(key, false);
    }
  };

  const handleSendGroup = async (group: FleetTaskGroup, gIdx: number, e: React.MouseEvent) => {
    e.stopPropagation();
      const key = `group-${gIdx}`;
    if (sending.has(key)) return;
      setSending(key, true);
    const batchSize = group.concurrency ?? group.tasks.length;
    try {
      for (let i = 0; i < group.tasks.length; i += batchSize) {
        const batch = group.tasks.slice(i, i + batchSize);
        await Promise.all(
          batch.map((task, bIdx) =>
              dispatch(group, task).then(() => {
                  updateTask(gIdx, i + bIdx, {usedCount: (tasks[gIdx]?.tasks[i + bIdx]?.usedCount ?? 0) + 1});
              })
          )
        );
      }
    } catch (err) {
        console.error("group dispatch failed:", err);
    } finally {
        setSending(key, false);
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
            const groupSending = sending.has(`group-${gIdx}`);
            const parsed = parseRepoSlug(group.repo);

          return (
              <div key={`${group.group}-${gIdx}`} className="border-b border-hair last:border-0">

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
                    owner={parsed?.owner ?? ""}
                    repo={parsed?.repo ?? ""}
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
                          if (!isNaN(v) && v > 0) {
                              updateGroup(gIdx, {concurrency: v});
                          }
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
                        {group.tasks.map((task, tIdx) => (
                            <TaskRow
                                key={`${gIdx}-${tIdx}`}
                                task={task}
                                gIdx={gIdx}
                                tIdx={tIdx}
                                isSending={sending.has(`${gIdx}-${tIdx}`)}
                                onUpdate={(patch) => {
                                    updateTask(gIdx, tIdx, patch);
                                }}
                                onRemove={() => {
                                    removeTask(gIdx, tIdx);
                                }}
                                onDispatch={(e) => {
                                    void handleDispatchTask(group, task, gIdx, tIdx, e);
                                }}
                            />
                        ))}

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
