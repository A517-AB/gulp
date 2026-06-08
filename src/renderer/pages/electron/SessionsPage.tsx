import { useState } from "react";
import { ActivityFeed } from "@/components/workspace/activity-feed.tsx";
import { SessionList } from "@/components/workspace/session-list.tsx";
import { CodeDiffSidebar } from "@/components/workspace/code-diff-sidebar.tsx";
import { NewSessionDialog } from "@/components/workspace/new-session-dialog.tsx";
import { useResizable } from "@/hooks/use-resizable";
import { useStore } from "@/store/app";
import { useJules } from "@/lib/jules/provider";
import type { Activity, Session, SessionInitialValues } from "@/types/activity-feed";

interface ActivityWorkspaceProps {
  session: Session;
  onArchive: () => void;
}

function ActivityWorkspace({ session, onArchive }: ActivityWorkspaceProps) {
  const [showCodeDiffs, setShowCodeDiffs] = useState(false);
  const [codeDiffCollapsed, setCodeDiffCollapsed] = useState(false);
  const [currentActivities, setCurrentActivities] = useState<Activity[]>([]);
  const { width: diffWidth, isResizing, startResizing } = useResizable({ defaultWidth: 600 });

  return (
    <>
      <main className="flex-1 overflow-hidden flex flex-col">
        <ActivityFeed
          session={session}
          onArchive={onArchive}
          showCodeDiffs={showCodeDiffs}
          onToggleCodeDiffs={setShowCodeDiffs}
          onActivitiesChange={setCurrentActivities}
        />
      </main>

      {showCodeDiffs && (
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
              <button onClick={() => { setCodeDiffCollapsed((c) => !c); }} className="ml-auto text-white/40 hover:text-white/80 text-xs px-1">
                {codeDiffCollapsed ? "‹" : "›"}
              </button>
            </div>
            {!codeDiffCollapsed && (
              <CodeDiffSidebar
                activities={currentActivities}
                repoUrl={`https://github.com/${session.sourceId}`}
              />
            )}
          </aside>
        </>
      )}
    </>
  );
}

export default function SessionsPage() {
  const [selectedSession, setSelectedSession] = useState<Session | null>(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [newSessionOpen, setNewSessionOpen] = useState(false);
  const [newSessionValues, setNewSessionValues] = useState<SessionInitialValues | undefined>();

  const loadSessions = useStore(s => s.loadSessions);
  const { client } = useJules();

  const handleSessionCreated = () => {
    void loadSessions(client);
    setNewSessionOpen(false);
  };

  const handleArchive = () => {
    setSelectedSession(null);
    void loadSessions(client);
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
          <button onClick={() => { setSidebarCollapsed((c) => !c); }} className="ml-auto text-white/40 hover:text-white/80 text-xs px-1">
            {sidebarCollapsed ? "›" : "‹"}
          </button>
        </div>
        {!sidebarCollapsed && (
          <SessionList
            onSelectSession={setSelectedSession}
            {...(selectedSession ? { selectedSessionId: selectedSession.id } : {})}
          />
        )}
      </aside>

      {selectedSession ? (
        <ActivityWorkspace session={selectedSession} onArchive={handleArchive} />
      ) : (
        <main className="flex-1 overflow-hidden flex flex-col">
          <div className="flex h-full items-center justify-center">
            <div className="text-center space-y-3">
              <p className="text-[10px] font-mono text-white/40 uppercase tracking-widest">No session selected</p>
              <button
                onClick={() => { openNewSession(); }}
                className="text-[10px] font-mono uppercase tracking-widest text-purple-400 hover:text-purple-300"
              >
                + New Session
              </button>
            </div>
          </div>
        </main>
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
