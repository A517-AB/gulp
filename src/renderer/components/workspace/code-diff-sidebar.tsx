import {useMemo} from "react";
import {FileCode} from "lucide-react";
import {ScrollArea} from "@/ui/scroll-area.tsx";
import {DiffViewer} from "@/ui/diff-viewer.tsx";
import {MediaItemDownloader} from "@/components/workspace/activity/activity-artifacts.tsx";
import type {ChangeSetArtifact, MediaArtifact} from "@jules";
import {useStore} from "@/store/app.ts";
import {filesystem} from "@shared/bridge";

interface CodeDiffSidebarProps {
    sessionId: string;
    repoUrl?: string;
}

const EMPTY_ACTIVITIES: never[] = [];

/**
 * `CodeDiffSidebar` displays real-time git diff changes for a given session.
 * It periodically polls for changes (`fetchSessionChanges` via `useStore`) and renders the diffs
 * using `DiffViewer`. It also integrates with `GitSyncButton` for repository sync operations.
 *
 * Props:
 * - `sessionId`: The ID of the session to fetch changes for.
 * - `repoUrl`: Optional GitHub repository URL to provide context or links to the origin.
 *
 * State:
 * - `changesets`: The retrieved array of `ChangeSetArtifact` from the backend.
 * - `loading`: Loading state while fetching changes.
 * - `error`: Error state if fetching fails.
 */
export function CodeDiffSidebar({ sessionId, repoUrl }: CodeDiffSidebarProps) {
    const activities = useStore(s => s.activities[sessionId] ?? EMPTY_ACTIVITIES);
    const sessionSnapshot = useStore(s => s.sessionSnapshot);
    const finalDiff = useMemo(() => activities
        .flatMap(a => {
            const cs = (a as {artifacts?: unknown[]}).artifacts?.find((art): art is ChangeSetArtifact => (art as {type?: string}).type === 'changeSet');
            return cs ? [{id: a.id, patch: cs.gitPatch.unidiffPatch}] : [];
        })
        .slice(-1), [activities]);

    const mediaItems = useMemo(() => activities.flatMap(a =>
        ((a as {artifacts?: unknown[]}).artifacts ?? [])
            .filter((art): art is MediaArtifact => (art as {type?: string}).type === 'media')
            .map((media, i) => ({ media, activityId: a.id, index: i }))
    ), [activities]);

    const handleDownloadFile = async (filename: string) => {
        try {
            const snapshot = await sessionSnapshot(sessionId);
            const matchedFile = snapshot.generatedFiles.find(f => f.path === filename);

            if (!matchedFile) {
                throw new Error(`Full content for ${filename} was not found in the session snapshot`);
            }

            const defaultName = filename.split("/").pop() ?? "file";

            if (filesystem) {
                const savePath = await filesystem.showSaveDialog(defaultName);
                if (!savePath) return; // cancelled
                await filesystem.writeFile(savePath, matchedFile.content);
            } else {
                // Web fallback
                const blob = new Blob([matchedFile.content], { type: "text/plain" });
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = defaultName;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
            }
        } catch (err) {
            console.error("[CodeDiffSidebar] failed to download file:", err);
            throw err;
        }
    };

  if (finalDiff.length === 0 && mediaItems.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-6 text-center space-y-4">
        <div className="w-12 h-12 rounded-full bg-raised flex items-center justify-center">
          <FileCode className="h-6 w-6 text-fg-ghost" />
        </div>
        <div className="space-y-1">
          <h3 className="text-sm font-bold text-fg-dim uppercase tracking-widest">No Changes</h3>
          <p className="text-[11px] text-fg-ghost font-mono leading-relaxed">Code modifications will appear here once Jules makes changes.</p>
        </div>
      </div>
    );
  }

  return (
    <ScrollArea className="h-full">
      <div className="p-4 space-y-4">
          {finalDiff.map((x) => (
              <DiffViewer
                  key={x.id}
                  diff={x.patch}
                  onDownloadFile={handleDownloadFile}
                  {...(repoUrl ? {repoUrl} : {})}
                  branch="main"
              />
          ))}
          {mediaItems.map(({ media, activityId, index }) => (
              <MediaItemDownloader key={`${activityId}-${index}`} media={media} activityId={activityId} index={index} />
          ))}
      </div>
    </ScrollArea>
  );
}
