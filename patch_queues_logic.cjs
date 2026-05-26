const fs = require('fs');

const code = `import { useState, useEffect } from 'react';
import type { FleetTaskGroup, FleetTask } from '@/types/app';

const CACHE_KEY = 'jules-queues-cache';

function mergeTaskGroups(cached: FleetTaskGroup[], incoming: FleetTaskGroup[]): FleetTaskGroup[] {
  const mergedMap = new Map<string, FleetTaskGroup>();

  for (const group of cached) {
    const key = \`\${group.group}::\${group.repo}\`;
    mergedMap.set(key, { ...group, tasks: [...group.tasks] });
  }

  for (const inc of incoming) {
    const key = \`\${inc.group}::\${inc.repo}\`;
    if (mergedMap.has(key)) {
      const existing = mergedMap.get(key)!;
      // merge tasks based on topic & folder
      const taskMap = new Map<string, FleetTask>();
      for (const t of existing.tasks) {
        taskMap.set(\`\${t.topic}::\${t.folder}\`, t);
      }
      for (const t of inc.tasks) {
        taskMap.set(\`\${t.topic}::\${t.folder}\`, t); // incoming overrides matching cached tasks
      }
      existing.tasks = Array.from(taskMap.values());
    } else {
      mergedMap.set(key, { ...inc, tasks: [...inc.tasks] });
    }
  }

  return Array.from(mergedMap.values());
}

export default function QueuesPage() {
  const [tasks, setTasks] = useState<FleetTaskGroup[]>([]);
  const [editingTask, setEditingTask] = useState<{ groupIdx: number, taskIdx: number } | null>(null);
  const [editForm, setEditForm] = useState({ topic: '', task: '', folder: '' });

  useEffect(() => {
    async function loadTasks() {
      // 1. Load from cache immediately
      let currentTasks: FleetTaskGroup[] = [];
      const cached = localStorage.getItem(CACHE_KEY);
      if (cached) {
        try {
          currentTasks = JSON.parse(cached) as FleetTaskGroup[];
          setTasks(currentTasks);
        } catch (e) {
          console.error("Failed to parse queues cache", e);
        }
      }

      // 2. Fetch from IPC and merge
      if (window.electron && window.electron.queues) {
        const loadedTasks = await window.electron.queues.getTasks() as FleetTaskGroup[];
        const merged = mergeTaskGroups(currentTasks, loadedTasks);
        setTasks(merged);
        localStorage.setItem(CACHE_KEY, JSON.stringify(merged));
      }
    }
    loadTasks();
  }, []);

  const handleEdit = (groupIdx: number, taskIdx: number) => {
    setEditingTask({ groupIdx, taskIdx });
    const group = tasks[groupIdx];
    if (group) {
        const task = group.tasks[taskIdx];
        if (task) {
            setEditForm({ topic: task.topic, task: task.task, folder: task.folder });
        }
    }
  };

  const handleSave = async (groupIdx: number, taskIdx: number) => {
    const newTasks = [...tasks];
    const group = newTasks[groupIdx];
    if (group && group.tasks[taskIdx]) {
      const newTasksArray = [...group.tasks];
      newTasksArray[taskIdx] = {
        ...newTasksArray[taskIdx],
        ...editForm
      };
      newTasks[groupIdx] = {
        ...group,
        tasks: newTasksArray
      };

      let finalTasks = newTasks;

      if (window.electron && window.electron.queues) {
        const latestFromIpc = await window.electron.queues.getTasks() as FleetTaskGroup[];
        finalTasks = mergeTaskGroups(latestFromIpc, newTasks);
        await window.electron.queues.saveTasks(finalTasks);
      }

      setTasks(finalTasks);
      localStorage.setItem(CACHE_KEY, JSON.stringify(finalTasks));
      setEditingTask(null);
    }
  };

  return (
    <div className="p-6 h-full overflow-y-auto">
      <h1 className="text-2xl font-bold mb-4">Queues</h1>
      {tasks.length === 0 ? (
        <p className="text-neutral-500 text-sm">No tasks found.</p>
      ) : (
        tasks.map((group, groupIdx) => (
          <div key={groupIdx} className="mb-6 p-4 border rounded border-zinc-800 bg-zinc-900/50">
            <h2 className="text-xl font-semibold mb-2">{group.group}</h2>
            <p className="text-sm text-neutral-400 mb-4">Repo: {group.repo} {group.baseBranch && \`(\${group.baseBranch})\`}</p>
            <div className="space-y-4">
              {group.tasks.map((task, taskIdx) => (
                <div key={taskIdx} className="p-3 border rounded border-zinc-700 bg-zinc-800/30">
                  {editingTask?.groupIdx === groupIdx && editingTask?.taskIdx === taskIdx ? (
                    <div className="space-y-3">
                      <div>
                        <label className="block text-xs font-medium text-neutral-400 mb-1">Topic</label>
                        <input
                          value={editForm.topic}
                          onChange={e => setEditForm({ ...editForm, topic: e.target.value })}
                          className="w-full bg-black border border-zinc-700 rounded px-2 py-1 text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-neutral-400 mb-1">Task</label>
                        <textarea
                          value={editForm.task}
                          onChange={e => setEditForm({ ...editForm, task: e.target.value })}
                          className="w-full bg-black border border-zinc-700 rounded px-2 py-1 text-sm h-20"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-neutral-400 mb-1">Folder</label>
                        <input
                          value={editForm.folder}
                          onChange={e => setEditForm({ ...editForm, folder: e.target.value })}
                          className="w-full bg-black border border-zinc-700 rounded px-2 py-1 text-sm"
                        />
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleSave(groupIdx, taskIdx)}
                          className="px-3 py-1 bg-purple-600 hover:bg-purple-700 text-white rounded text-sm"
                        >
                          Save
                        </button>
                        <button
                          onClick={() => setEditingTask(null)}
                          className="px-3 py-1 bg-zinc-700 hover:bg-zinc-600 text-white rounded text-sm"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="font-medium text-purple-400">{task.topic}</h3>
                          <p className="text-sm mt-1">{task.task}</p>
                          <p className="text-xs text-neutral-500 mt-2">Folder: {task.folder}</p>
                        </div>
                        <button
                          onClick={() => handleEdit(groupIdx, taskIdx)}
                          className="text-xs px-2 py-1 bg-zinc-700 hover:bg-zinc-600 rounded text-white"
                        >
                          Edit
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  );
}
`;

fs.writeFileSync('src/renderer/pages/shared/QueuesPage.tsx', code);
