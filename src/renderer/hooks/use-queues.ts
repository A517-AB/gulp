import {useCallback, useEffect, useState} from "react";
import {queues, sdkIpc} from "@shared/bridge";
import type {FleetTask, FleetTaskGroup} from "@/types/jules";

export function taskKey(group: FleetTaskGroup, task: FleetTask): string {
  return `${group.repo}::${task.topic}::${task.folder}`;
}

export function useQueues() {
  const [groups, setGroups] = useState<FleetTaskGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const raw = await queues?.getTasks();
      setGroups(Array.isArray(raw) ? (raw as FleetTaskGroup[]) : []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load tasks");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const sendTask = useCallback(async (group: FleetTaskGroup, task: FleetTask) => {
      if (!sdkIpc) {
          setError("Jules client not ready");
          return;
      }
    const key = taskKey(group, task);
    setSending((s) => new Set(s).add(key));
    try {
        const sources = await sdkIpc.sources.list();
      const source = sources.find((s) => s.id.endsWith(group.repo) || s.name === group.repo);
      if (!source) { setError(`No source found for "${group.repo}"`); return; }
        const github = source.id.replace(/^(?:sources\/)?github\//, '')
        await sdkIpc.client.run({
        prompt: task.task,
        title: task.topic,
            ...(github ? {source: {github, baseBranch: group.baseBranch ?? 'main'}} : {}),
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to send task");
    } finally {
      setSending((s) => { const n = new Set(s); n.delete(key); return n; });
    }
  }, []);

  const sendGroup = useCallback(async (group: FleetTaskGroup) => {
    for (const task of group.tasks) {
      await sendTask(group, task);
    }
  }, [sendTask]);

  return { groups, loading, error, sending, sendTask, sendGroup, reload: load };
}
