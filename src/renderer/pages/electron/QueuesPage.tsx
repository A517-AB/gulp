import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useQueues, taskKey } from "@renderer/hooks/use-queues";
import { Badge } from "@renderer/ui/badge";
import { Button } from "@renderer/ui/button";
import { ScrollArea } from "@renderer/ui/scroll-area";
import type { FleetTask } from "@/types/jules";

function Chevron({ open }: { open: boolean }) {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className={`shrink-0 transition-transform duration-200 text-fg-dim ${open ? "rotate-90" : ""}`}>
      <path d="M4 2l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function TaskRow({ task, isSending, onSend }: { task: FleetTask; isSending: boolean; onSend: () => void }) {
  return (
    <div className="flex items-start gap-3 px-5 py-2.5 border-b border-hair last:border-0">
      <div className="flex-1 min-w-0 space-y-0.5">
        <div className="flex items-center gap-2">
          <span className="text-[9px] font-mono text-fg-ghost uppercase tracking-widest">{task.folder}</span>
          <span className="text-[10px] font-semibold text-fg-primary truncate">{task.topic}</span>
        </div>
        <p className="text-[10px] text-fg-muted leading-relaxed">{task.task}</p>
      </div>
      <Button size="sm" variant="outline" disabled={isSending} onClick={onSend} className="shrink-0 h-6 text-[9px] font-mono uppercase tracking-widest">
        {isSending ? "..." : "Send"}
      </Button>
    </div>
  );
}

export default function QueuesPage() {
  const { groups, loading, error, sending, sendTask, sendGroup, reload } = useQueues();
  const [open, setOpen] = useState<Set<string>>(new Set());

  const toggle = (key: string) => {
    setOpen((s) => { const n = new Set(s); n.has(key) ? n.delete(key) : n.add(key); return n; });
  };

  if (loading) {
    return <div className="flex items-center justify-center h-full"><p className="text-xs text-fg-dim">Loading...</p></div>;
  }

  return (
    <div className="h-full flex flex-col overflow-hidden bg-base">
      <div className="px-4 py-3 border-b border-hair flex items-center justify-between shrink-0">
        <span className="text-xs font-semibold text-fg-primary">Task Queue</span>
        <Button variant="outline" size="sm" onClick={() => { void reload(); }} className="h-6 text-[9px] font-mono uppercase tracking-widest">
          Reload
        </Button>
      </div>

      {error && (
        <div className="px-4 py-2 bg-red-500/10 border-b border-hair shrink-0">
          <p className="text-[10px] text-red-400">{error}</p>
        </div>
      )}

      <ScrollArea className="flex-1 min-h-0">
        {groups.length === 0 ? (
          <p className="text-xs text-fg-ghost text-center p-8">No tasks in queue.</p>
        ) : groups.map((group) => {
          const isOpen = open.has(group.repo);
          const groupSending = group.tasks.some((t) => sending.has(taskKey(group, t)));
          return (
            <div key={group.repo} className="border-b border-hair">
              <button
                type="button"
                onClick={() => { toggle(group.repo); }}
                className="w-full flex items-center gap-2.5 px-4 py-3 hover:bg-hover transition-colors"
              >
                <Chevron open={isOpen} />
                <span className="text-[11px] font-semibold text-fg-primary flex-1 text-left">{group.group}</span>
                <Badge className="text-[9px] px-1.5 h-4 bg-raised border-hair text-fg-muted font-mono">{group.repo}</Badge>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={groupSending}
                  onClick={(e) => { e.stopPropagation(); void sendGroup(group); }}
                  className="h-6 text-[9px] font-mono uppercase tracking-widest"
                >
                  {groupSending ? "..." : "Send All"}
                </Button>
              </button>

              <AnimatePresence initial={false}>
                {isOpen && (
                  <motion.div
                    key="content"
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.18, ease: "easeInOut" }}
                    className="overflow-hidden"
                  >
                    <div className="bg-raised">
                      {group.tasks.map((task) => (
                        <TaskRow
                          key={task.topic}
                          task={task}
                          isSending={sending.has(taskKey(group, task))}
                          onSend={() => { void sendTask(group, task); }}
                        />
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </ScrollArea>
    </div>
  );
}
