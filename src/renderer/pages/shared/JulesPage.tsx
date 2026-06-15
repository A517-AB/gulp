import {useState} from "react";
import {ActivityFeed} from "@/components/workspace/activity";
import {SessionList} from "@/components/workspace/session-list.tsx";
import {CodeDiffSidebar} from "@/components/workspace/code-diff-sidebar.tsx";
import {NewSessionDialog} from "@/components/workspace/new-session-dialog.tsx";
import {GridBackground} from "@/ui/grid-background";
import {BackgroundBeams} from "@/ui/background-beams";
import {useResizable} from "@renderer/hooks/use-resizable";
import {useStore} from "@/store/app.ts";
import {FlyingJules} from "@/components/workspace/flying-jules.tsx";
import type {SessionResource as Session} from "@google/jules-sdk/types";
import type {SessionInitialValues} from '@jules';

export default function JulesPage() {
  const [selectedSession, setSelectedSession] = useState<Session | null>(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [showCodeDiffs, setShowCodeDiffs] = useState(false);
  const [codeDiffCollapsed, setCodeDiffCollapsed] = useState(false);
  const [newSessionOpen, setNewSessionOpen] = useState(false);
  const [newSessionValues, setNewSessionValues] = useState<SessionInitialValues | undefined>();
  const [refreshKey, setRefreshKey] = useState(0);

  const { width: diffWidth, isResizing, handleProps: resizeHandleProps } = useResizable({ defaultWidth: 600 });
  const sessionList = useStore(s => s.sessionList);
  const liveSelectedSession = selectedSession
    ? (sessionList.find(s => s.id === selectedSession.id) ?? selectedSession)
    : null;

  const handleSessionCreated = () => {
    setRefreshKey((k) => k + 1);
    setNewSessionOpen(false);
  };

  const handleArchive = () => {
    setSelectedSession(null);
    setRefreshKey((k) => k + 1);
  };

  const openNewSession = (values?: SessionInitialValues) => {
    setNewSessionValues(values);
    setNewSessionOpen(true);
  };

  return (
    <div className="flex h-full overflow-hidden bg-base">
      <aside className={`hidden md:flex flex-col border-r border-hair bg-surface transition-all duration-200 ${sidebarCollapsed ? "w-12" : "w-64"}`}>
        <div className="px-3 py-2 border-b border-hair flex items-center justify-between">
          {!sidebarCollapsed && <span className="text-[10px] font-bold text-fg-dim uppercase tracking-widest">Sessions</span>}
          <button onClick={() => { setSidebarCollapsed((c) => !c); }} className="ml-auto text-fg-dim hover:text-fg-secondary text-xs px-1">
            {sidebarCollapsed ? "›" : "‹"}
          </button>
        </div>
        {!sidebarCollapsed && (
          <SessionList key={refreshKey} onSelectSession={setSelectedSession} {...(selectedSession ? { selectedSessionId: selectedSession.id } : {})} />
        )}
      </aside>

      <main className="flex-1 overflow-hidden flex flex-col min-w-0">
        {liveSelectedSession ? (
          <ActivityFeed
            session={liveSelectedSession}
            onArchive={handleArchive}
            onNewSession={() => { openNewSession(); }}
            showCodeDiffs={showCodeDiffs}
            onToggleCodeDiffs={setShowCodeDiffs}
          />
        ) : (
          <GridBackground className="h-full">
            <BackgroundBeams />
            <div className="relative z-10 flex h-full items-center justify-center">
              <div className="text-center space-y-5 flex flex-col items-center justify-center">
                <FlyingJules size={100} state="idle" />
                <div className="space-y-3">
                  <p className="text-[10px] font-mono text-fg-dim uppercase tracking-widest">No session selected</p>
                  <button onClick={() => { openNewSession(); }} className="text-[10px] font-mono uppercase tracking-widest text-purple-400 hover:text-purple-300">
                    + New Session
                  </button>
                </div>
              </div>
            </div>
          </GridBackground>
        )}
      </main>

      {liveSelectedSession && showCodeDiffs && (
        <>
          {!codeDiffCollapsed && (
            <div className="w-1 cursor-col-resize bg-transparent hover:bg-blue-500/50 transition-colors" {...resizeHandleProps} />
          )}
          <aside
            className={`hidden md:flex flex-col border-l border-hair bg-surface shrink-0 ${isResizing ? "" : "transition-all duration-200"} ${codeDiffCollapsed ? "w-12" : ""}`}
            style={{ width: codeDiffCollapsed ? undefined : Math.min(Math.max(diffWidth, 240), 900) }}
          >
            <div className="px-3 py-2 border-b border-hair flex items-center justify-between">
              {!codeDiffCollapsed && <span className="text-[10px] font-bold text-fg-dim uppercase tracking-widest">Code Changes</span>}
              <div className="flex items-center gap-1.5 ml-auto">
                <button onClick={() => { setCodeDiffCollapsed((c) => !c); }} className="text-fg-dim hover:text-fg-secondary text-xs px-1">
                  {codeDiffCollapsed ? "‹" : "›"}
                </button>
              </div>
            </div>
            {!codeDiffCollapsed && (
                <CodeDiffSidebar
                    sessionId={liveSelectedSession.id} {...(liveSelectedSession.source?.githubRepo ? {repoUrl: `https://github.com/${liveSelectedSession.source.githubRepo.owner}/${liveSelectedSession.source.githubRepo.repo}`} : {})} />
            )}
          </aside>
        </>
      )}

      <NewSessionDialog
        open={newSessionOpen}
        onOpenChange={setNewSessionOpen}
        {...(newSessionValues ? { initialValues: newSessionValues } : {})}
        onSessionCreated={handleSessionCreated}
      />
    </div>
  );
}
