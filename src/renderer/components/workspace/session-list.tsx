import {Plus, RefreshCw, Search} from 'lucide-react'
import {NewSessionDialog} from './new-session-dialog.tsx'
import {ScrollArea} from '@/ui/scroll-area.tsx'
import {Input} from '@/ui/input.tsx'
import {Badge} from '@/ui/badge.tsx'
import {Tooltip, TooltipContent, TooltipProvider, TooltipTrigger} from '@/ui/tooltip.tsx'
import {formatDate} from '@/utils/activity.ts'
import {getStatusInfo, STATE_BADGE, STATE_DOT} from './session-status.ts'
import {SessionContextMenu} from './SessionContextMenu.tsx'
import type {SessionResource} from '@jules'
import {useCallback, useEffect, useMemo, useState} from 'react'
import {useStore} from '@/store/app.ts'

interface SessionListProps {
    onSelectSession: (session: SessionResource) => void
    selectedSessionId?: string
}

export function SessionList({onSelectSession, selectedSessionId}: SessionListProps) {
    const sessions = useStore(s => s.sessions)
    const sessionsLoaded = useStore(s => s.sessionsLoaded)
    const loadSessions = useStore(s => s.loadSessions)
    const refreshSessions = useStore(s => s.refreshSessions)
    const [searchQuery, setSearchQuery] = useState('')
    const [syncing, setSyncing] = useState(false)

    useEffect(() => {
        if (!sessionsLoaded) void loadSessions()
    }, [sessionsLoaded, loadSessions])

    const handleSync = useCallback(() => {
        setSyncing(true)
        refreshSessions()
            .catch((e: unknown) => {
                console.error('[session-list] sync failed:', e)
            })
            .finally(() => {
                setSyncing(false)
            })
    }, [refreshSessions])

    const visible = useMemo(() => {
        if (!searchQuery) return sessions
        const q = searchQuery.toLowerCase()
        return sessions.filter(s => {
            const repo = s.source?.type === 'githubRepo' ? s.source.githubRepo : null
            const repoStr = repo ? `${repo.owner}/${repo.repo}` : ''
            return (s.title ?? '').toLowerCase().includes(q) || repoStr.toLowerCase().includes(q)
        })
    }, [sessions, searchQuery])

    return (
        <div className="flex-1 min-h-0 flex flex-col bg-surface overflow-hidden">
            <div className="px-3 py-2 shrink-0">
                <div className="relative flex items-center gap-2">
                    <div className="relative flex-1">
                        <Search className="absolute left-2 top-1/2 h-3 w-3 -translate-y-1/2 text-fg-ghost"/>
                        <Input
                            placeholder="Search sessions..."
                            value={searchQuery}
                            onChange={e => {
                                setSearchQuery(e.target.value)
                            }}
                            className="h-7 bg-raised pl-7 text-[10px] border-hair placeholder:text-fg-ghost"
                        />
                    </div>
                    <button
                        onClick={handleSync}
                        disabled={syncing}
                        className="shrink-0 p-1.5 rounded-md text-fg-ghost hover:text-fg-secondary hover:bg-raised transition-colors disabled:opacity-40"
                        title="Sync sessions"
                    >
                        <RefreshCw className={`h-3.5 w-3.5 ${syncing ? 'animate-spin' : ''}`}/>
                    </button>
                    <NewSessionDialog trigger={
                        <button
                            className="shrink-0 p-1.5 rounded-md text-fg-ghost hover:text-fg-secondary hover:bg-raised transition-colors"
                            title="New session"
                        >
                            <Plus className="h-3.5 w-3.5"/>
                        </button>
                    }/>
                </div>
            </div>

            <ScrollArea className="flex-1 min-h-0">
                <div className="p-2 space-y-1">
                    {visible.length === 0 ? (
                        <p className="text-xs text-fg-dim text-center p-6">
                            {searchQuery ? 'No sessions match.' : 'No sessions yet.'}
                        </p>
                    ) : (
                        <TooltipProvider>
                            {visible.map(s => {
                                const repo = s.source?.type === 'githubRepo' ? s.source.githubRepo : null
                                return (
                                    <SessionContextMenu key={s.id} session={s}>
                                        <button
                                            onClick={() => {
                                                onSelectSession(s)
                                            }}
                                            className={`w-full flex items-start gap-2.5 px-3 py-2.5 text-left cursor-pointer outline-none rounded-md transition-colors ${selectedSessionId === s.id ? 'bg-purple-500/10' : 'hover:bg-hover'}`}
                                        >
                                            <Tooltip>
                                                <TooltipTrigger asChild>
                                                    <div
                                                        className={`flex-shrink-0 mt-1 w-2 h-2 rounded-full cursor-help ${STATE_DOT[s.state] ?? STATE_DOT['unspecified']}`}/>
                                                </TooltipTrigger>
                                                <TooltipContent side="right"
                                                                className="bg-overlay border-hair text-fg-secondary text-[10px] z-[60]">
                                                    <span>{getStatusInfo(s.state).label}</span>
                                                </TooltipContent>
                                            </Tooltip>

                                            <div className="flex-1 min-w-0">
                                                <Tooltip>
                                                    <TooltipTrigger asChild>
                                                        <div
                                                            className="text-2xs font-medium leading-tight text-fg-primary truncate">
                                                            {s.title ?? 'Untitled'}
                                                        </div>
                                                    </TooltipTrigger>
                                                    <TooltipContent side="bottom" align="start"
                                                                    className="bg-overlay border-hair text-fg-secondary text-[10px] max-w-[200px] break-words z-[60]">
                                                        <p>{s.title ?? 'Untitled'}</p>
                                                    </TooltipContent>
                                                </Tooltip>
                                                <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                                                    <span
                                                        className="text-3xs text-fg-dim font-mono tracking-wide leading-none">
                                                        {formatDate(s.createTime)}
                                                    </span>
                                                    {repo && (
                                                        <>
                                                            <span className="text-3xs text-fg-ghost font-mono">•</span>
                                                            <Badge
                                                                className={`shrink-0 text-3xs px-1.5 h-4 border rounded-sm uppercase tracking-wider leading-none ${STATE_BADGE[s.state] ?? STATE_BADGE['unspecified']}`}>
                                                                {repo.repo}
                                                            </Badge>
                                                        </>
                                                    )}
                                                </div>
                                            </div>
                                        </button>
                                    </SessionContextMenu>
                                )
                            })}
                        </TooltipProvider>
                    )}
                </div>
            </ScrollArea>
        </div>
    )
}
