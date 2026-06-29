import {useState} from 'react'
import {ActivityFeed, CodeDiffSidebar, FlyingJules, NewSessionDialog, SessionList} from '@/components/workspace'
import {useResizable} from '@renderer/hooks/use-resizable'
import type {SessionResource} from '@jules'

export default function JulesPage() {
    const [selectedSession, setSelectedSession] = useState<SessionResource | null>(null)
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
    const [showCodeDiffs, setShowCodeDiffs] = useState(false)
    const [codeDiffCollapsed, setCodeDiffCollapsed] = useState(false)
    const [newSessionOpen, setNewSessionOpen] = useState(false)

    const {width: diffWidth, isResizing, handleProps: resizeHandleProps} = useResizable({defaultWidth: 600})

    return (
        <div className="flex h-full overflow-hidden bg-base">
            <aside
                className={`hidden md:flex flex-col border-r border-hair bg-surface transition-all duration-200 ${sidebarCollapsed ? 'w-12' : 'w-64'}`}>
                <div className="px-3 py-2 flex items-center justify-between">
                    <button
                        onClick={() => {
                            setSidebarCollapsed(c => !c)
                        }}
                        className="ml-auto text-fg-dim hover:text-fg-secondary text-xs px-1"
                    >
                        {sidebarCollapsed ? '›' : '‹'}
                    </button>
                </div>
                {!sidebarCollapsed && (
                    <SessionList
                        onSelectSession={setSelectedSession}
                        {...(selectedSession ? {selectedSessionId: selectedSession.id} : {})}
                    />
                )}
            </aside>

            <main className="flex-1 overflow-hidden flex flex-col min-w-0">
                {selectedSession ? (
                    <ActivityFeed
                        session={selectedSession}
                        onArchive={() => {
                            setSelectedSession(null)
                        }}
                        onNewSession={() => {
                            setNewSessionOpen(true)
                        }}
                        showCodeDiffs={showCodeDiffs}
                        onToggleCodeDiffs={setShowCodeDiffs}
                    />
                ) : (
                    <div className="flex h-full items-center justify-center">
                        <div className="text-center space-y-5 flex flex-col items-center justify-center">
                            <FlyingJules size={100} state="idle"/>
                            <div className="space-y-3">
                                <p className="text-[10px] font-mono text-fg-dim uppercase tracking-widest">No session
                                    selected</p>
                                <button
                                    onClick={() => {
                                        setNewSessionOpen(true)
                                    }}
                                    className="text-[10px] font-mono uppercase tracking-widest text-purple-400 hover:text-purple-300"
                                >
                                    + New Session
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </main>

            {selectedSession && showCodeDiffs && (
                <>
                    {!codeDiffCollapsed && (
                        <div
                            className="w-1 cursor-col-resize bg-transparent hover:bg-blue-500/50 transition-colors" {...resizeHandleProps} />
                    )}
                    <aside
                        className={`hidden md:flex flex-col border-l border-hair bg-surface shrink-0 ${isResizing ? '' : 'transition-all duration-200'} ${codeDiffCollapsed ? 'w-12' : ''}`}
                        style={{width: codeDiffCollapsed ? undefined : Math.min(Math.max(diffWidth, 240), 900)}}
                    >
                        <div className="px-3 py-2 border-b border-hair flex items-center justify-between">
                            {!codeDiffCollapsed &&
                                <span className="text-[10px] font-bold text-fg-dim uppercase tracking-widest">Code Changes</span>}
                            <div className="flex items-center gap-1.5 ml-auto">
                                <button
                                    onClick={() => {
                                        setCodeDiffCollapsed(c => !c)
                                    }}
                                    className="text-fg-dim hover:text-fg-secondary text-xs px-1"
                                >
                                    {codeDiffCollapsed ? '‹' : '›'}
                                </button>
                            </div>
                        </div>
                        {!codeDiffCollapsed && (
                            <CodeDiffSidebar
                                sessionId={selectedSession.id}
                                repoUrl={`https://github.com/${selectedSession.source.githubRepo.owner}/${selectedSession.source.githubRepo.repo}`}
                            />
                        )}
                    </aside>
                </>
            )}

            <NewSessionDialog open={newSessionOpen} onOpenChange={setNewSessionOpen}/>
        </div>
    )
}
