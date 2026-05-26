import { isToday, parseISO } from "date-fns";
import { Search } from "lucide-react";
import { ScrollArea } from "@renderer/ui/scroll-area";
import { Input } from "@renderer/ui/input";
import { Badge } from "@renderer/ui/badge";
import { Button } from "@renderer/ui/button";
import { useSessionList } from "@renderer/hooks/use-session-list";
import type { SessionListProps, SessionStatus } from "@/types/activity-feed";

const LIMIT = 100;

const STATUS_COLOR: Record<SessionStatus, string> = {
  active: "bg-green-500", completed: "bg-blue-500", failed: "bg-red-500", paused: "bg-yellow-500",
};

export function SessionList({ onSelectSession, selectedSessionId }: SessionListProps) {
  const { sessions, allSessions, loading, error, searchQuery, setSearchQuery, loadSessions } = useSessionList();

  const dailyCount = allSessions.filter((s) => { try { return s.createdAt && isToday(parseISO(s.createdAt)); } catch { return false; } }).length;
  const pct = Math.min((dailyCount / LIMIT) * 100, 100);

  if (loading) return <div className="flex items-center justify-center p-6"><p className="text-xs text-white/40">Loading sessions...</p></div>;
  if (error) return (
    <div className="flex flex-col items-center gap-3 p-6">
      <p className="text-xs text-red-400 text-center">{error}</p>
      <Button variant="outline" size="sm" onClick={loadSessions} className="h-7 text-[10px] font-mono uppercase tracking-widest">Retry</Button>
    </div>
  );

  return (
    <div className="h-full flex flex-col bg-zinc-950 overflow-hidden">
      <div className="px-3 py-2 border-b border-white/[0.08] shrink-0">
        <div className="relative">
          <Search className="absolute left-2 top-1/2 h-3 w-3 -translate-y-1/2 text-white/40" />
          <Input placeholder="Search sessions..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="h-7 bg-black/50 pl-7 text-[10px] border-white/10 placeholder:text-white/30" />
        </div>
      </div>
      <ScrollArea className="flex-1 min-h-0">
        <div className="p-2 space-y-1">
          {sessions.length === 0 ? (
            <p className="text-xs text-white/40 text-center p-6">{searchQuery ? "No sessions match." : "No sessions yet."}</p>
          ) : sessions.map((s) => (
            <button key={s.id} onClick={() => onSelectSession(s)} className={`w-full flex items-start gap-2.5 px-3 py-2.5 text-left rounded hover:bg-white/5 transition-colors ${selectedSessionId === s.id ? "bg-purple-500/10 border border-purple-500/20" : ""}`}>
              <div className={`flex-shrink-0 mt-1 w-2 h-2 rounded-full ${STATUS_COLOR[s.status] ?? "bg-gray-500"}`} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-[10px] font-bold text-white uppercase tracking-wide truncate">{s.title || "Untitled"}</span>
                  {s.sourceId && <Badge className="shrink-0 text-[9px] px-1.5 h-4 bg-white/10 text-white/70 border-0">{s.sourceId.split("/").pop()}</Badge>}
                </div>
              </div>
            </button>
          ))}
        </div>
      </ScrollArea>
      <div className="border-t border-white/[0.08] px-3 py-2.5 bg-black/50 shrink-0">
        <div className="flex justify-between mb-1.5">
          <span className="text-[9px] font-bold text-white/30 uppercase tracking-widest">Daily</span>
          <span className="text-[10px] font-mono font-bold text-white/60">{dailyCount}/{LIMIT}</span>
        </div>
        <div className="w-full h-1 bg-white/5"><div className="h-full bg-white transition-all" style={{ width: `${pct}%` }} /></div>
      </div>
    </div>
  );
}
