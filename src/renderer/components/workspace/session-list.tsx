import {memo, useCallback, useEffect, useState} from "react";
import {CheckSquare, Search} from "lucide-react";
import {Input} from "@/ui/input.tsx";
import {formatDate} from "@/utils/activity.ts";
import {getStatusInfo, STATE_DOT} from "./session-status.ts";
import {SessionContextMenu} from "./SessionContextMenu.tsx";
import type {SessionResource} from "@google/jules-sdk/types";
import {useStore} from "@/store/app.ts";

interface SessionListProps {
    onSelectSession: (session: SessionResource) => void;
    selectedSessionId?: string;
}

export function SessionList({ onSelectSession, selectedSessionId }: SessionListProps) {
    const sessions = useStore(s => s.sessions);
    const initSessions = useStore(s => s.initSessions);
    const removeSession = useStore(s => s.removeSession);
    const archiveSessions = useStore(s => s.archiveSessions);
    const [selectMode, setSelectMode] = useState(false);
    const [selected, setSelected] = useState<Set<string>>(new Set());
    const [archiving, setArchiving] = useState(false);

    useEffect(() => {
        initSessions();
    }, [initSessions]);

    const toggleSelect = useCallback((id: string) => {
        setSelected(prev => {
            const next = new Set(prev);
            if (next.has(id)) {
                next.delete(id);
            } else {
                next.add(id);
            }
            return next;
        });
    }, []);

    function exitSelectMode() {
        setSelectMode(false);
        setSelected(new Set());
    }

    async function archiveSelected() {
        if (selected.size === 0) return;
        setArchiving(true);
        const ids = [...selected];
        await archiveSessions(ids);
        ids.forEach(removeSession);
        setArchiving(false);
        exitSelectMode();
    }

    return (
        <div className="flex-1 min-h-0 flex flex-col bg-surface overflow-hidden">
            <div className="px-3 py-2 shrink-0">
                <div className="relative flex items-center gap-2">
                    <div className="relative flex-1">
                        <Search className="absolute left-2 top-1/2 h-3 w-3 -translate-y-1/2 text-fg-ghost"/>
                        <Input placeholder="Search sessions..."
                               className="h-7 bg-raised pl-7 text-[10px] border-hair placeholder:text-fg-ghost"
                               readOnly/>
                    </div>
                    <button
                        onClick={() => {
                            if (selectMode) {
                                exitSelectMode();
                            } else {
                                setSelectMode(true);
                            }
                        }}
                        className={`shrink-0 p-1.5 rounded-md transition-colors ${selectMode ? 'text-purple-400 bg-purple-500/10' : 'text-fg-ghost hover:text-fg-secondary hover:bg-raised'}`}
                    >
                        <CheckSquare className="h-3.5 w-3.5"/>
                    </button>
                </div>
            </div>

            <div
                className="flex-1 min-h-0 overflow-y-auto scrollbar-thin scrollbar-thumb-hair scrollbar-track-transparent">
                <div className="p-2 space-y-1">
                    {sessions.length === 0 ? (
                        <p className="text-xs text-fg-dim text-center p-6">No sessions yet.</p>
                    ) : (
                        sessions.map((s) => (
                            <SessionRow
                                key={s.id}
                                session={s}
                                isSelected={selected.has(s.id)}
                                isActive={selectedSessionId === s.id}
                                selectMode={selectMode}
                                dotClass={STATE_DOT[s.state]}
                                stateColor={getStatusInfo(s.state).color}
                                onSelect={onSelectSession}
                                onToggle={toggleSelect}
                            />
                        ))
                    )}
                </div>
            </div>

            {selectMode && (
                <div className="px-3 py-2.5 bg-raised shrink-0 relative flex items-center justify-between gap-2">
                    <div className="absolute top-0 left-3 right-3 h-[1px] bg-hair"/>
                    <span className="text-[10px] font-mono text-fg-ghost">
                        {selected.size === 0 ? 'Select sessions' : `${selected.size} selected`}
                    </span>
                    <div className="flex items-center gap-2">
                        <button onClick={exitSelectMode}
                                className="text-[10px] font-mono text-fg-ghost hover:text-fg-secondary transition-colors">cancel
                        </button>
                        <button
                            onClick={() => {
                                void archiveSelected();
                            }}
                            disabled={selected.size === 0 || archiving}
                            className="text-[10px] font-mono px-2.5 py-1 rounded-md bg-red-500/10 text-red-400 hover:bg-red-500/20 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                        >
                            {archiving ? 'archiving…' : `archive${selected.size > 0 ? ` (${selected.size})` : ''}`}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

const SessionRow = memo(function SessionRow({
                                                session: s,
                                                isSelected,
                                                isActive,
                                                selectMode,
                                                dotClass,
                                                stateColor,
                                                onSelect,
                                                onToggle
                                            }: {
    session: SessionResource;
    isSelected: boolean;
    isActive: boolean;
    selectMode: boolean;
    dotClass: string;
    stateColor: string;
    onSelect: (session: SessionResource) => void;
    onToggle: (id: string) => void;
}) {
    const repo = s.source?.githubRepo.repo;
    return (
        <SessionContextMenu session={s}>
            <div
                className={`rounded-md transition-all border ${
                    isSelected ? 'bg-purple-500/10 border-purple-500/30'
                        : isActive ? 'bg-purple-500/10 border-purple-500/20'
                            : 'bg-transparent border-transparent hover:border-hair hover:bg-hover'
                }`}
            >
                <button
                    onClick={() => {
                        if (selectMode) {
                            onToggle(s.id);
                        } else {
                            onSelect(s);
                        }
                    }}
                    className="w-full flex items-start gap-2.5 px-3 py-2.5 text-left cursor-pointer outline-none"
                >
                    {selectMode ? (
                        <div
                            className={`flex-shrink-0 mt-1 w-3.5 h-3.5 rounded border transition-colors ${isSelected ? 'bg-purple-500 border-purple-500' : 'border-fg-ghost bg-transparent'}`}>
                            {isSelected && (
                                <svg viewBox="0 0 10 10" fill="none" className="w-full h-full p-0.5">
                                    <path d="M1.5 5l2.5 2.5L8.5 2.5" stroke="white" strokeWidth="1.5"
                                          strokeLinecap="round" strokeLinejoin="round"/>
                                </svg>
                            )}
                        </div>
                    ) : (
                        <div className={`flex-shrink-0 mt-1 w-2 h-2 rounded-full ${dotClass}`}/>
                    )}

                    <div className="flex-1 min-w-0">
                        <div className="text-xs font-medium leading-tight text-fg-primary truncate mb-0.5">
                            {s.title || "Untitled"}
                        </div>
                        <div className="flex items-center gap-1.5">
                            <span
                                className="text-3xs text-fg-dim font-mono leading-none">{formatDate(s.createTime)}</span>
                            {repo && (
                                <>
                                    <span className="text-3xs text-fg-ghost">·</span>
                                    <span className={`text-3xs font-mono leading-none ${stateColor}`}>{repo}</span>
                                </>
                            )}
                        </div>
                    </div>
                </button>
            </div>
        </SessionContextMenu>
    );
});
