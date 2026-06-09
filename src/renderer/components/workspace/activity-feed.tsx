import {useEffect, useRef, useState} from "react";
import {Archive, Bell, BellOff, Code, GitBranch, Loader2, MoreVertical, Play, Plus, Send} from "lucide-react";
import {filesystem, sdkIpc} from "@shared/bridge";
import {ScrollArea} from "@/ui/scroll-area.tsx";
import {Textarea} from "@/ui/textarea.tsx";
import {Button} from "@/ui/button.tsx";
import {DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger} from "@/ui/dropdown-menu.tsx";
import {useActivityGroups} from "@/hooks/use-activity-groups.ts";
import {getSessionDuration, getStatusInfo} from "./session-status.ts";
import {activityText, formatDate} from "@/utils/activity.ts";
import {archiveSession} from "@/lib/archive.ts";
import {ActivityItem} from "./activity-item.tsx";
import {useStore} from "@/store/app.ts";
import {useWatcherStore} from "@/library/jules-watcher";
import type {Activity, ActivityFeedProps} from "@/types/activity-feed.ts";

const QUICK_REVIEW_PROMPT =
  "Please perform a comprehensive code review of the repository. Look for bugs, security issues, and opportunities for refactoring. Provide a detailed summary of your findings.";

const EMPTY_ARRAY: Activity[] = [];

export function ActivityFeed({ session, onArchive, onNewSession, showCodeDiffs, onToggleCodeDiffs, onActivitiesChange }: ActivityFeedProps) {
    const activities = useStore(s => s.activities[session.id] ?? EMPTY_ARRAY);
  const error = useStore(s => s.activitiesError[session.id]);
  const loadActivities = useStore(s => s.loadActivities);
  const sendMessage = useStore(s => s.sendMessage);
  const approvePlan = useStore(s => s.approvePlan);

  const { grouped, latest } = useActivityGroups(activities);
    const isWatched = useWatcherStore(s => s.isWatched(session.id))
    const watch = useWatcherStore(s => s.watch)
    const unwatch = useWatcherStore(s => s.unwatch)
  const [message, setMessage] = useState("");
  const [expandedBash, setExpandedBash] = useState<Set<string>>(new Set());
  const [sending, setSending] = useState(false);
  const [approving, setApproving] = useState(false);
  const [applyState, setApplyState] = useState<{ status: "idle" | "applying" | "done" | "error"; message?: string }>({ status: "idle" });

  const [newActivityIds, setNewActivityIds] = useState<Set<string>>(new Set());
  const prevIdsRef = useRef<Set<string>>(new Set());
    const initialLoadDoneRef = useRef(false);
    const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
      initialLoadDoneRef.current = false;
      void loadActivities(session.id);
  }, [session.id, loadActivities]);

  useEffect(() => {
    const newIds = activities.filter(a => !prevIdsRef.current.has(a.id)).map(a => a.id);
    prevIdsRef.current = new Set(activities.map(a => a.id));
    if (!newIds.length) return;
      if (!initialLoadDoneRef.current) {
          initialLoadDoneRef.current = true;
          bottomRef.current?.scrollIntoView();
          return;
      }
    setNewActivityIds(new Set(newIds));
      bottomRef.current?.scrollIntoView({behavior: 'smooth'});
    const t = setTimeout(() => { setNewActivityIds(new Set()); }, 500);
    return () => clearTimeout(t);
  }, [activities]);

  useEffect(() => {
    onActivitiesChange?.(activities);
  }, [activities, onActivitiesChange]);

  const toggleBash = (id: string) => {
    setExpandedBash(prev => { const n = new Set(prev); if (n.has(id)) { n.delete(id); } else { n.add(id); } return n; });
  };

  const handleApplyLocally = async () => {
    if (!sdkIpc || !filesystem) return;
    const cwd = await filesystem.showOpenDialog();
    if (!cwd) return;
    setApplyState({ status: "applying" });
    const result = await sdkIpc.session.applyPatch(session.id, { cwd });
    if (result.success) {
      setApplyState({ status: "done", message: `Applied to branch: ${result.branch}` });
    } else {
        setApplyState({status: "error", message: result.error ?? "Unknown error"});
    }
  };

  const handleApprovePlan = async () => {
      if (approving) return;
    try {
        setApproving(true);
        await approvePlan(session.id);
    } finally {
        setApproving(false);
    }
  };

  const submit = async () => {
      if (!message.trim() || sending) return;
    try {
      setSending(true);
        await sendMessage(session.id, message);
      setMessage("");
    } finally {
      setSending(false);
    }
  };

  const handleQuickReview = () => {
      if (sending) return;
      try {
          setSending(true);
          void sendMessage(session.id, QUICK_REVIEW_PROMPT);
      } finally {
          setSending(false);
      }
  };

    const branch = session.sourceContext?.workingBranch
        ?? session.sourceContext?.githubRepoContext?.startingBranch
        ?? "main";

    const statusInfo = getStatusInfo(session.state);
    const hasDiffs = activities.some(a => a.artifacts.some(x => x.type === 'changeSet'));
    const canApplyLocally = sdkIpc !== null && session.state === "completed" && hasDiffs;

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
                <span>Started {formatDate(session.createTime)}</span>
                <span>•</span><span>{branch}</span>
                {session.state === "inProgress" && <>
                    <span>•</span><span>Running {String(getSessionDuration(session.createTime))}m</span></>}
            </div>
              {session.state === "inProgress" && latest && (
              <div className="mt-2 pt-2 border-t border-hair">
                <div className="text-[9px] font-bold uppercase tracking-widest text-purple-400 mb-1">Latest</div>
                  <div
                      className="text-[11px] text-fg-secondary line-clamp-2 font-mono">{activityText(latest).slice(0, 150)}</div>
              </div>
            )}
          </div>
          <div className="flex items-center gap-1 shrink-0">
              <Button
                  variant="ghost" size="icon"
                  onClick={() => {
                      isWatched ? unwatch(session.id) : watch({id: session.id, title: session.title})
                  }}
                  className={`h-7 w-7 hover:bg-hover ${isWatched ? 'text-purple-400' : 'text-fg-muted'}`}
                  title={isWatched ? 'Stop watching' : 'Watch for replies'}
              >
                  {isWatched ? <BellOff className="h-3.5 w-3.5"/> : <Bell className="h-3.5 w-3.5"/>}
              </Button>
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
                  {session.state === "inProgress" && (
                  <DropdownMenuItem onClick={() => { void handleQuickReview(); }} disabled={sending} className="focus:bg-hover text-xs cursor-pointer">
                    <Play className="mr-2 h-3.5 w-3.5" /><span>Start Code Review</span>
                  </DropdownMenuItem>
                )}
                {canApplyLocally && (
                  <DropdownMenuItem onClick={() => { void handleApplyLocally(); }} disabled={applyState.status === "applying"} className="focus:bg-hover text-xs cursor-pointer">
                    <GitBranch className="mr-2 h-3.5 w-3.5" />
                    <span>{applyState.status === "applying" ? "Applying…" : "Apply locally"}</span>
                  </DropdownMenuItem>
                )}
                {onNewSession && (
                    <DropdownMenuItem onClick={() => {
                        setTimeout(onNewSession, 0);
                    }} className="focus:bg-hover text-xs cursor-pointer">
                    <Plus className="mr-2 h-3.5 w-3.5" /><span>New Session</span>
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

      {error && (
        <div className="border-b border-hair bg-red-950/20 px-4 py-3 flex items-center justify-between gap-2">
          <p className="text-[11px] font-mono text-red-400 uppercase">{error}</p>
            <Button variant="outline" size="sm" onClick={() => {
                void loadActivities(session.id);
            }}
                    className="h-7 text-[10px] font-mono uppercase border-hair hover:bg-hover text-fg-secondary">Retry</Button>
        </div>
      )}
      {applyState.status === "done" && (
        <div className="border-b border-hair bg-green-950/20 px-4 py-2 flex items-center justify-between gap-2">
          <p className="text-[11px] font-mono text-green-400 uppercase">{applyState.message}</p>
          <button onClick={() => { setApplyState({ status: "idle" }); }} className="text-[10px] font-mono text-fg-dim hover:text-fg-secondary uppercase">✕</button>
        </div>
      )}
      {applyState.status === "error" && (
        <div className="border-b border-hair bg-red-950/20 px-4 py-2 flex items-center justify-between gap-2">
          <p className="text-[11px] font-mono text-red-400 uppercase">{applyState.message}</p>
          <button onClick={() => { setApplyState({ status: "idle" }); }} className="text-[10px] font-mono text-fg-dim hover:text-fg-secondary uppercase">✕</button>
        </div>
      )}

      <div className="flex-1 overflow-hidden">
        <ScrollArea className="h-full">
            <div className="p-3 flex flex-col space-y-2.5">
            {grouped.map((item, i) => (
              <ActivityItem key={Array.isArray(item) ? `group-${String(i)}` : item.id} item={item} expandedBash={expandedBash} onToggleBash={toggleBash} onApprovePlan={() => { void handleApprovePlan(); }} approvingPlan={approving} isNew={!Array.isArray(item) && newActivityIds.has(item.id)} />
            ))}
                <div ref={bottomRef}/>
          </div>
        </ScrollArea>
      </div>

      <form onSubmit={(e) => { e.preventDefault(); void submit(); }} className="border-t border-hair bg-surface p-3">
        <div className="flex gap-2">
          <Textarea value={message} onChange={(e) => { setMessage(e.target.value); }} placeholder="Send a message to Jules..." className="min-h-[56px] resize-none text-[11px] bg-raised border-hair text-fg-primary placeholder:text-fg-ghost focus:border-purple-500/50" onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void submit(); } }} disabled={sending} />
          <Button type="submit" size="icon" disabled={!message.trim() || sending} className="h-9 w-9">
            {sending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
          </Button>
        </div>
      </form>
    </div>
  );
}
