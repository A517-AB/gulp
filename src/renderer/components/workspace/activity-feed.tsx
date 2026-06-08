import { useState } from "react";
import { Code, Send, Archive, Play, MoreVertical, Loader2 } from "lucide-react";
import { ScrollArea } from "@/ui/scroll-area.tsx";
import { Textarea } from "@/ui/textarea.tsx";
import { Button } from "@/ui/button.tsx";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/ui/dropdown-menu.tsx";
import { useActivityFeedApi } from "@/hooks/use-activity-feed-api.ts";
import { useActivityGroups } from "@/hooks/use-activity-groups.ts";
import { getStatusInfo, getSessionDuration } from "./session-status.ts";
import { formatDate } from "@/utils/activity.ts";
import { archiveSession } from "@/lib/archive.ts";
import { ActivityItem } from "./activity-item.tsx";
import type { ActivityFeedProps } from "@/types/activity-feed.ts";

export function ActivityFeed({ session, onArchive, showCodeDiffs, onToggleCodeDiffs, onActivitiesChange }: ActivityFeedProps) {
  const api = useActivityFeedApi({ session, onActivitiesChange });
  const { grouped, latest } = useActivityGroups(api.activities);
  const [message, setMessage] = useState("");
  const [expandedBash, setExpandedBash] = useState<Set<string>>(new Set());
  const toggleBash = (id: string) => {
    setExpandedBash(prev => { const n = new Set(prev); if (n.has(id)) { n.delete(id); } else { n.add(id); } return n; });
  };

  const statusInfo = getStatusInfo(session.status);
  const hasDiffs = api.activities.some((a) => a.diff);

  const submit = async () => { await api.handleSendMessage(message); setMessage(""); };

  return (
    <div className="flex flex-col h-full bg-base">
      <div className="border-b border-hair bg-surface px-4 py-3">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1.5">
              <h2 className="text-sm font-bold uppercase tracking-wide truncate text-fg-primary">{session.title}</h2>
              <div className={`flex items-center gap-1 px-2 py-0.5 text-[9px] font-mono font-bold uppercase tracking-wider rounded ${statusInfo.bgColor} ${statusInfo.color}`}>
                <span>{statusInfo.icon}</span><span>{statusInfo.label}</span>
              </div>
            </div>
            <div className="flex items-center gap-3 text-[9px] font-mono text-fg-dim uppercase tracking-wide">
              <span>Started {formatDate(session.createdAt)}</span>
              <span>•</span><span>{session.branch ?? "main"}</span>
              {session.status === "active" && <><span>•</span><span>Running {String(getSessionDuration(session.createdAt))}m</span></>}
            </div>
            {session.status === "active" && latest && (
              <div className="mt-2 pt-2 border-t border-hair">
                <div className="text-[9px] font-bold uppercase tracking-widest text-purple-400 mb-1">Latest</div>
                <div className="text-[11px] text-fg-secondary line-clamp-2 font-mono">{latest.content.slice(0, 150)}</div>
              </div>
            )}
          </div>
          <div className="flex items-center gap-1 shrink-0">
            {hasDiffs && (
              <Button variant="ghost" size="icon" onClick={() => { onToggleCodeDiffs(!showCodeDiffs); }} className={`h-7 w-7 hover:bg-hover ${showCodeDiffs ? "bg-purple-500/20 text-purple-400" : "text-fg-muted"}`}>
                <Code className="h-3.5 w-3.5" />
              </Button>
            )}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-7 w-7 hover:bg-hover text-fg-muted"><MoreVertical className="h-3.5 w-3.5" /></Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48 bg-surface border-hair text-fg-secondary">
                {session.status === "active" && (
                  <DropdownMenuItem onClick={() => { void api.handleQuickReview(); }} disabled={api.sending} className="focus:bg-hover text-xs cursor-pointer">
                    <Play className="mr-2 h-3.5 w-3.5" /><span>Start Code Review</span>
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem onClick={() => { archiveSession(session.id); onArchive?.(); }} className="focus:bg-hover text-xs cursor-pointer text-red-400 focus:text-red-400">
                  <Archive className="mr-2 h-3.5 w-3.5" /><span>Archive Session</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>

      {api.error && (
        <div className="border-b border-hair bg-red-950/20 px-4 py-3 flex items-center justify-between gap-2">
          <p className="text-[11px] font-mono text-red-400 uppercase">{api.error}</p>
          <Button variant="outline" size="sm" onClick={() => { void api.loadActivities(true); }} className="h-7 text-[10px] font-mono uppercase border-hair hover:bg-hover text-fg-secondary">Retry</Button>
        </div>
      )}
      <div className="flex-1 overflow-hidden">
        <ScrollArea className="h-full">
          <div className="p-3 space-y-2.5">
            {grouped.map((item, i) => (
              <ActivityItem key={Array.isArray(item) ? `group-${String(i)}` : item.id} item={item} expandedBash={expandedBash} onToggleBash={toggleBash} onApprovePlan={() => { void api.handleApprovePlan(); }} approvingPlan={api.approvingPlan} isNew={!Array.isArray(item) && api.newActivityIds.has(item.id)} />
            ))}
          </div>
        </ScrollArea>
      </div>

      {session.status !== "failed" ? (
        <form onSubmit={(e) => { e.preventDefault(); void submit(); }} className="border-t border-hair bg-surface p-3">
          <div className="flex gap-2">
            <Textarea value={message} onChange={(e) => { setMessage(e.target.value); }} placeholder="Send a message to Jules..." className="min-h-[56px] resize-none text-[11px] bg-raised border-hair text-fg-primary placeholder:text-fg-ghost focus:border-purple-500/50" onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void submit(); } }} disabled={api.sending} />
            <Button type="submit" size="icon" disabled={!message.trim() || api.sending} className="h-9 w-9">
              {api.sending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
            </Button>
          </div>
        </form>
      ) : (
        <div className="border-t border-hair bg-surface p-3 text-center">
          <p className="text-[10px] font-mono text-fg-dim uppercase tracking-widest">Session {session.status} • Cannot send new messages</p>
        </div>
      )}
    </div>
  );
}
