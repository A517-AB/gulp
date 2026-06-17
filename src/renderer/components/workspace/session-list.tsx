import {isToday, parseISO} from "date-fns";
import {Search, CheckSquare} from "lucide-react";
import {ScrollArea} from "@/ui/scroll-area.tsx";
import {Input} from "@/ui/input.tsx";
import {Badge} from "@/ui/badge.tsx";
import {Button} from "@/ui/button.tsx";
import {Tooltip, TooltipContent, TooltipProvider, TooltipTrigger} from "@/ui/tooltip.tsx";
import {CardSpotlight} from "@/ui/card-spotlight.tsx";
import {formatDate} from "@/utils/activity.ts";
import {useSessionList} from "@/hooks/use-session-list.ts";
import {useStore} from "@/store/app.ts";
import {STATE_BADGE, STATE_DOT, getStatusInfo} from "./session-status.ts";
import {SessionContextMenu} from "./SessionContextMenu.tsx";
import type {SessionResource} from "@google/jules-sdk/types";
import {useMemo, useState} from "react";

interface SessionListProps {
    onSelectSession: (session: SessionResource) => void;
    selectedSessionId?: string;
}

function truncateText(text: string, maxLength: number) {
    if (!text) return "";
    if (text.length <= maxLength) return text;
    return text.slice(0, maxLength) + "...";
}

const LIMIT = 100;

export function SessionList({ onSelectSession, selectedSessionId }: SessionListProps) {
  const { sessions, allSessions, error, searchQuery, setSearchQuery, loadSessions } = useSessionList();
  const sources = useStore(s => s.sources);
  const archiveSessions = useStore(s => s.archiveSessions);
  const [selectMode, setSelectMode] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [archiving, setArchiving] = useState(false);

  const dailyCount = useMemo(() => allSessions.filter((s) => {
    try { return s.createTime ? isToday(parseISO(s.createTime)) : false; }
    catch { return false; }
  }).length, [allSessions]);
  const pct = Math.min((dailyCount / LIMIT) * 100, 100);

  function toggleSelect(id: string) {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  function exitSelectMode() {
    setSelectMode(false);
    setSelected(new Set());
  }

  async function archiveSelected() {
    if (selected.size === 0) return;
    setArchiving(true);
    await archiveSessions([...selected]);
    setArchiving(false);
    exitSelectMode();
  }

  if (error) return (
    <div className="flex flex-col items-center gap-3 p-6">
      <p className="text-xs text-red-400 text-center">{error}</p>
      <Button variant="outline" size="sm" onClick={() => { void loadSessions(); }} className="h-7 text-[10px] font-mono uppercase tracking-widest">Retry</Button>
    </div>
  );

  return (
    <div className="flex-1 min-h-0 flex flex-col bg-surface overflow-hidden">
      <div className="px-3 py-2 border-b border-hair shrink-0">
        <div className="relative flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-2 top-1/2 h-3 w-3 -translate-y-1/2 text-fg-ghost" />
            <Input placeholder="Search sessions..." value={searchQuery} onChange={(e) => { setSearchQuery(e.target.value); }} className="h-7 bg-raised pl-7 text-[10px] border-hair placeholder:text-fg-ghost" />
          </div>
          <button
            onClick={() => { if (selectMode) exitSelectMode(); else setSelectMode(true); }}
            className={`shrink-0 p-1.5 rounded-md transition-colors ${selectMode ? 'text-purple-400 bg-purple-500/10' : 'text-fg-ghost hover:text-fg-secondary hover:bg-raised'}`}
            title={selectMode ? 'Cancel selection' : 'Select sessions'}
          >
            <CheckSquare className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      <ScrollArea className="flex-1 min-h-0">
        <div className="p-2 space-y-1">
          {sessions.length === 0 ? (
            <p className="text-xs text-fg-dim text-center p-6">{searchQuery ? "No sessions match." : "No sessions yet."}</p>
          ) : (
            <TooltipProvider>
              {sessions.map((s) => {
                const isSelected = selected.has(s.id);
                return (
                  <SessionContextMenu key={s.id} session={s}>
                    <CardSpotlight
                      radius={200}
                      color="var(--spotlight-color)"
                      className={`relative rounded-md overflow-hidden transition-all border ${
                        isSelected
                          ? 'bg-purple-500/10 border-purple-500/30'
                          : selectedSessionId === s.id
                            ? 'bg-purple-500/10 border-purple-500/20'
                            : 'bg-transparent border-transparent hover:border-hair'
                      }`}
                    >
                      <button
                        onClick={() => {
                          if (selectMode) { toggleSelect(s.id); return; }
                          onSelectSession(s);
                        }}
                        className="w-full flex items-start gap-2.5 px-3 py-2.5 text-left relative z-10 cursor-pointer outline-none"
                      >
                        {selectMode ? (
                          <div className={`flex-shrink-0 mt-1 w-3.5 h-3.5 rounded border transition-colors ${
                            isSelected ? 'bg-purple-500 border-purple-500' : 'border-fg-ghost bg-transparent'
                          }`}>
                            {isSelected && (
                              <svg viewBox="0 0 10 10" fill="none" className="w-full h-full p-0.5">
                                <path d="M1.5 5l2.5 2.5L8.5 2.5" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                              </svg>
                            )}
                          </div>
                        ) : (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div className={`flex-shrink-0 mt-1 w-2 h-2 rounded-full cursor-help ${STATE_DOT[s.state]}`} />
                            </TooltipTrigger>
                            <TooltipContent side="right" className="bg-overlay border-hair text-fg-secondary text-[10px] z-[60]">
                              <span>{getStatusInfo(s.state).label}</span>
                            </TooltipContent>
                          </Tooltip>
                        )}

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2 mb-0.5 w-full min-w-0">
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <div className="text-[10px] font-bold leading-tight text-fg-primary uppercase tracking-wide flex-1 min-w-0 block overflow-hidden text-ellipsis whitespace-nowrap">
                                  {truncateText(s.title || "Untitled", 28)}
                                </div>
                              </TooltipTrigger>
                              <TooltipContent side="bottom" align="start" className="bg-overlay border-hair text-fg-secondary text-[10px] max-w-[200px] break-words z-[60]">
                                <p>{s.title || "Untitled"}</p>
                              </TooltipContent>
                            </Tooltip>
                          </div>
                          <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                            <span className="text-3xs text-fg-dim font-mono tracking-wide leading-none">
                              {formatDate(s.createTime)}
                            </span>
                            {(() => {
                              const sc = s.sourceContext as { source?: string } | undefined
                              const repo = s.source?.githubRepo
                                ?? sources.find(src => src.name === sc?.source || src.id === sc?.source)?.githubRepo;
                              if (!repo) return null;
                              return (
                                <>
                                  <span className="text-3xs text-fg-ghost font-mono">•</span>
                                  <Badge className={`shrink-0 text-[8px] px-1 h-3.5 border rounded-sm uppercase tracking-wider leading-none ${STATE_BADGE[s.state]}`}>
                                    {repo.repo}
                                  </Badge>
                                </>
                              );
                            })()}
                          </div>
                        </div>
                      </button>
                    </CardSpotlight>
                  </SessionContextMenu>
                );
              })}
            </TooltipProvider>
          )}
        </div>
      </ScrollArea>

      {selectMode ? (
        <div className="border-t border-hair px-3 py-2.5 bg-raised shrink-0 flex items-center justify-between gap-2">
          <span className="text-[10px] font-mono text-fg-ghost">
            {selected.size === 0 ? 'Select sessions' : `${selected.size} selected`}
          </span>
          <div className="flex items-center gap-2">
            <button onClick={exitSelectMode} className="text-[10px] font-mono text-fg-ghost hover:text-fg-secondary transition-colors">
              cancel
            </button>
            <button
              onClick={() => { void archiveSelected(); }}
              disabled={selected.size === 0 || archiving}
              className="text-[10px] font-mono px-2.5 py-1 rounded-md bg-red-500/10 text-red-400 hover:bg-red-500/20 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              {archiving ? 'archiving…' : `archive${selected.size > 0 ? ` (${selected.size})` : ''}`}
            </button>
          </div>
        </div>
      ) : (
        <div className="border-t border-hair px-3 py-2.5 bg-raised shrink-0">
          <div className="flex justify-between items-center mb-1.5">
            <span className="text-3xs font-bold text-fg-ghost uppercase tracking-widest">Daily Limit</span>
            <span className="text-[10px] font-mono font-bold text-fg-dim">{dailyCount}/{LIMIT}</span>
          </div>
          <div className="w-full h-1 bg-surface overflow-hidden rounded-full">
            <div
              className={`h-full transition-all duration-300 ${
                dailyCount >= LIMIT ? "bg-red-500" : dailyCount >= LIMIT * 0.8 ? "bg-yellow-500" : "bg-primary"
              }`}
              style={{width: `${String(pct)}%`}}
            />
          </div>
          {dailyCount >= LIMIT * 0.8 && (
            <p className={`text-[8px] font-mono mt-1 leading-tight uppercase tracking-wider font-bold ${
              dailyCount >= LIMIT ? "text-red-500" : "text-yellow-500"
            }`}>
              {dailyCount >= LIMIT ? "Limit Reached" : "Approaching Limit"}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
