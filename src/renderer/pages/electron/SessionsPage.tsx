import { useState } from "react";
import { ActivityFeed } from "@/components/activity-feed";
import { SessionList } from "@/components/session-list";
import { CodeDiffSidebar } from "@/components/code-diff-sidebar";
import { NewSessionDialog } from "@/components/new-session-dialog";
import { useResizable } from "@/hooks/use-resizable";
import type { Activity, Session, SessionInitialValues } from "@/types/activity-feed";

export default function SessionsPage() {
  const [selectedSession, setSelectedSession] = useState<Session | null>(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [showCodeDiffs, setShowCodeDiffs] = useState(false);
  const [codeDiffCollapsed, setCodeDiffCollapsed] = useState(false);
  const [currentActivities, setCurrentActivities] = useState<Activity[]>([]);
  const [newSessionOpen, setNewSessionOpen] = useState(false);
  const [newSessionValues, setNewSessionValues] = useState<SessionInitialValues | undefined>();
  const [refreshKey, setRefreshKey] = useState(0);

  const { width: diffWidth, isResizing, startResizing } = useResizable({ defaultWidth: 600 });

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
    <div className="flex h-full overflow-hidden bg-black">
      <aside className={`hidden md:flex flex-col border-r border-white/[0.08] bg-zinc-950 transition-all duration-200 ${sidebarCollapsed ? "w-12" : "w-64"}`}>
        <div className="px-3 py-2 border-b border-white/[0.08] flex items-center justify-between">
          {!sidebarCollapsed && <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Sessions</span>}
          <button onClick={() => setSidebarCollapsed((c) => !c)} className="ml-auto text-white/40 hover:text-white/80 text-xs px-1">
            {sidebarCollapsed ? "›" : "‹"}
          </button>
        </div>
        {!sidebarCollapsed && (
          <SessionList
            key={refreshKey}
            onSelectSession={setSelectedSession}
            {...(selectedSession ? { selectedSessionId: selectedSession.id } : {})}
          />
        )}
      </aside>

      <main className="flex-1 overflow-hidden flex flex-col">
        {selectedSession ? (
          <ActivityFeed
            session={selectedSession}
            onArchive={handleArchive}
            showCodeDiffs={showCodeDiffs}
            onToggleCodeDiffs={setShowCodeDiffs}
            onActivitiesChange={setCurrentActivities}
          />
        ) : (
          <div className="flex h-full items-center justify-center">
            <div className="text-center space-y-3">
              <p className="text-[10px] font-mono text-white/40 uppercase tracking-widest">No session selected</p>
              <button
                onClick={() => openNewSession()}
                className="text-[10px] font-mono uppercase tracking-widest text-purple-400 hover:text-purple-300"
              >
                + New Session
              </button>
            </div>
          </div>
        )}
      </main>

      {selectedSession && showCodeDiffs && (
        <>
          {!codeDiffCollapsed && (
            <div className="w-1 cursor-col-resize bg-transparent hover:bg-blue-500/50 transition-colors" onMouseDown={startResizing} />
          )}
          <aside
            className={`hidden md:flex flex-col border-l border-white/[0.08] bg-zinc-950 ${isResizing ? "" : "transition-all duration-200"} ${codeDiffCollapsed ? "w-12" : ""}`}
            style={{ width: codeDiffCollapsed ? undefined : diffWidth }}
          >
            <div className="px-3 py-2 border-b border-white/[0.08] flex items-center justify-between">
              {!codeDiffCollapsed && <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Code Changes</span>}
              <button onClick={() => setCodeDiffCollapsed((c) => !c)} className="ml-auto text-white/40 hover:text-white/80 text-xs px-1">
                {codeDiffCollapsed ? "‹" : "›"}
              </button>
            </div>
            {!codeDiffCollapsed && (
              <CodeDiffSidebar
                activities={currentActivities}
                repoUrl={`https://github.com/${selectedSession.sourceId}`}
              />
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
