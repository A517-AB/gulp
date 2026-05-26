import { useState } from "react";
import { Code, Send, Archive, Play, MoreVertical, Loader2 } from "lucide-react";
import { ScrollArea } from "@renderer/ui/scroll-area";
import { Textarea } from "@renderer/ui/textarea";
import { Button } from "@renderer/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@renderer/ui/dropdown-menu";
import { useActivityFeedApi } from "@renderer/hooks/use-activity-feed-api";
import { useActivityGroups } from "@renderer/hooks/use-activity-groups";
import { getStatusInfo, getSessionDuration } from "@renderer/utils/session";
import { formatDate } from "@renderer/utils/activity";
import { archiveSession } from "@/lib/archive";
import { ActivityItem } from "./activity-item";
import type { ActivityFeedProps } from "@/types/activity-feed";
import { useSettingsStore } from "@renderer/store/settings";

export function ActivityFeed({ session, onArchive, showCodeDiffs, onToggleCodeDiffs, onActivitiesChange }: ActivityFeedProps) {
  const api = useActivityFeedApi({ session, onActivitiesChange });
  const { presets } = useSettingsStore();
  const { grouped, latest } = useActivityGroups(api.activities);
  const [message, setMessage] = useState("");
  const [expandedBash, setExpandedBash] = useState<Set<string>>(new Set());
  const toggleBash = (id: string) => setExpandedBash(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });

  const statusInfo = getStatusInfo(session.status);
  const hasDiffs = api.activities.some((a) => a.diff);

  const submit = async () => { await api.handleSendMessage(message); setMessage(""); };

  if (api.loading) return <div className="flex items-center justify-center h-full bg-black"><p className="text-[10px] font-mono text-white/40 uppercase tracking-widest">Loading activities...</p></div>;

  return (
    <div className="flex flex-col h-full bg-black">
      <div className="border-b border-white/[0.08] bg-zinc-950/95 px-4 py-3">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1.5">
              <h2 className="text-sm font-bold uppercase tracking-wide truncate text-white">{session.title}</h2>
              <div className={`flex items-center gap-1 px-2 py-0.5 text-[9px] font-mono font-bold uppercase tracking-wider ${statusInfo.bgColor} ${statusInfo.color}`}>
                <span>{statusInfo.icon}</span><span>{statusInfo.label}</span>
              </div>
            </div>
            <div className="flex items-center gap-3 text-[9px] font-mono text-white/40 uppercase tracking-wide">
              <span>Started {formatDate(session.createdAt)}</span>
              <span>•</span><span>{session.branch || "main"}</span>
              {session.status === "active" && <><span>•</span><span>Running {getSessionDuration(session.createdAt)}m</span></>}
            </div>
            {session.status === "active" && latest && (
              <div className="mt-2 pt-2 border-t border-white/[0.08]">
                <div className="text-[9px] font-bold uppercase tracking-widest text-purple-400 mb-1">Latest</div>
                <div className="text-[11px] text-white/80 line-clamp-2 font-mono">{latest.content.slice(0, 150)}</div>
              </div>
            )}
          </div>
          <div className="flex items-center gap-1 shrink-0">
            {hasDiffs && (
              <Button variant="ghost" size="icon" onClick={() => onToggleCodeDiffs(!showCodeDiffs)} className={`h-7 w-7 hover:bg-white/5 ${showCodeDiffs ? "bg-purple-500/20 text-purple-400" : "text-white/60"}`}>
                <Code className="h-3.5 w-3.5" />
              </Button>
            )}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-7 w-7 hover:bg-white/5 text-white/60"><MoreVertical className="h-3.5 w-3.5" /></Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48 bg-zinc-950 border-white/10 text-white/80">
                {session.status === "active" && presets.map((preset) => (
                  <DropdownMenuItem key={preset.id} onClick={() => api.handleSendMessage(preset.prompt)} disabled={api.sending} className="focus:bg-white/10 text-xs cursor-pointer">
                    <Play className="mr-2 h-3.5 w-3.5" /><span>{preset.name}</span>
                  </DropdownMenuItem>
                ))}
                <DropdownMenuItem onClick={() => { archiveSession(session.id); onArchive?.(); }} className="focus:bg-white/10 text-xs cursor-pointer text-red-400 focus:text-red-400">
                  <Archive className="mr-2 h-3.5 w-3.5" /><span>Archive Session</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>

      {api.error && (
        <div className="border-b border-white/[0.08] bg-red-950/20 px-4 py-3 flex items-center justify-between gap-2">
          <p className="text-[11px] font-mono text-red-400 uppercase">{api.error}</p>
          <Button variant="outline" size="sm" onClick={() => api.loadActivities(true)} className="h-7 text-[10px] font-mono uppercase border-white/10 hover:bg-white/5 text-white/80">Retry</Button>
        </div>
      )}

      <div className="flex-1 overflow-hidden">
        <ScrollArea className="h-full">
          <div className="p-3 space-y-2.5">
            {api.activities.length === 0 && <div className="flex items-center justify-center min-h-[200px]"><p className="text-[10px] font-mono text-white/40 uppercase tracking-widest">No activities yet</p></div>}
            {grouped.map((item, i) => (
              <ActivityItem key={Array.isArray(item) ? `group-${i}` : item.id} item={item} expandedBash={expandedBash} onToggleBash={toggleBash} onApprovePlan={api.handleApprovePlan} approvingPlan={api.approvingPlan} isNew={!Array.isArray(item) && api.newActivityIds.has(item.id)} />
            ))}
          </div>
        </ScrollArea>
      </div>

      {session.status !== "failed" ? (
        <form onSubmit={(e) => { e.preventDefault(); submit(); }} className="border-t border-white/[0.08] bg-zinc-950/95 p-3">
          <div className="flex gap-2">
            <Textarea value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Send a message to Jules..." className="min-h-[56px] resize-none text-[11px] bg-black border-white/[0.08] text-white placeholder:text-white/30 focus:border-purple-500/50" onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); submit(); } }} disabled={api.sending} />
            <Button type="submit" size="icon" disabled={!message.trim() || api.sending} className="h-9 w-9">
              {api.sending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
            </Button>
          </div>
        </form>
      ) : (
        <div className="border-t border-white/[0.08] bg-zinc-950/95 p-3 text-center">
          <p className="text-[10px] font-mono text-white/40 uppercase tracking-widest">Session {session.status} • Cannot send new messages</p>
        </div>
      )}
    </div>
  );
}
