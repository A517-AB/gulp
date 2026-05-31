import { isToday, parseISO } from "date-fns";
import { Search } from "lucide-react";
import { ScrollArea } from "@/ui/scroll-area.tsx";
import { Input } from "@/ui/input.tsx";
import { Badge } from "@/ui/badge.tsx";
import { Button } from "@/ui/button.tsx";
import { useSessionList } from "@/hooks/use-session-list.ts";
import { STATE_DOT } from "./session-status.ts";
import type { SessionListProps } from "@/types/activity-feed.ts";

const LIMIT = 100;

export function SessionList({ onSelectSession, selectedSessionId }: SessionListProps) {
  const { sessions, allSessions, loading, error, searchQuery, setSearchQuery, loadSessions } = useSessionList();

  const dailyCount = allSessions.filter((s) => { try { return s.createdAt && isToday(parseISO(s.createdAt)); } catch { return false; } }).length;
  const pct = Math.min((dailyCount / LIMIT) * 100, 100);

  if (loading) return <div className="flex items-center justify-center p-6"><p className="text-xs text-fg-dim">Loading sessions...</p></div>;
  if (error) return (
    <div className="flex flex-col items-center gap-3 p-6">
      <p className="text-xs text-red-400 text-center">{error}</p>
      <Button variant="outline" size="sm" onClick={() => { void loadSessions(); }} className="h-7 text-[10px] font-mono uppercase tracking-widest">Retry</Button>
    </div>
  );

  return (
    <div className="h-full flex flex-col bg-surface overflow-hidden">
      <div className="px-3 py-2 border-b border-hair shrink-0">
        <div className="relative">
          <Search className="absolute left-2 top-1/2 h-3 w-3 -translate-y-1/2 text-fg-ghost" />
          <Input placeholder="Search sessions..." value={searchQuery} onChange={(e) => { setSearchQuery(e.target.value); }} className="h-7 bg-raised pl-7 text-[10px] border-hair placeholder:text-fg-ghost" />
        </div>
      </div>
      <ScrollArea className="flex-1 min-h-0">
        <div className="p-2 space-y-1">
          {sessions.length === 0 ? (
            <p className="text-xs text-fg-dim text-center p-6">{searchQuery ? "No sessions match." : "No sessions yet."}</p>
          ) : sessions.map((s) => (
            <button key={s.id} onClick={() => { onSelectSession(s); }} className={`w-full flex items-start gap-2.5 px-3 py-2.5 text-left rounded hover:bg-hover transition-colors ${selectedSessionId === s.id ? "bg-purple-500/10 border border-purple-500/20" : ""}`}>
              <div className={`flex-shrink-0 mt-1 w-2 h-2 rounded-full ${STATE_DOT[s.status]}`} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-[10px] font-bold text-fg-primary uppercase tracking-wide truncate">{s.title || "Untitled"}</span>
                  {s.sourceId && <Badge className="shrink-0 text-[9px] px-1.5 h-4 bg-raised text-fg-muted border-0">{s.sourceId.split("/").pop()}</Badge>}
                </div>
              </div>
            </button>
          ))}
        </div>
      </ScrollArea>
      <div className="border-t border-hair px-3 py-2.5 bg-raised shrink-0">
        <div className="flex justify-between mb-1.5">
          <span className="text-[9px] font-bold text-fg-ghost uppercase tracking-widest">Daily</span>
          <span className="text-[10px] font-mono font-bold text-fg-dim">{dailyCount}/{LIMIT}</span>
        </div>
        <div className="w-full h-1 bg-raised"><div className="h-full bg-fg-secondary transition-all" style={{ width: `${String(pct)}%` }} /></div>
      </div>
    </div>
  );
}
