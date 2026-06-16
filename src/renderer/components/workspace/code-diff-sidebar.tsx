import {useMemo} from "react";
import {FileCode} from "lucide-react";
import {ScrollArea} from "@/ui/scroll-area.tsx";
import {DiffViewer} from "@/ui/diff-viewer.tsx";
import type {ChangeSetArtifact} from "@jules";
import {useStore} from "@/store/app.ts";
import {filesystem} from "@shared/bridge";

interface CodeDiffSidebarProps {
    sessionId: string;
    repoUrl?: string;
}

const EMPTY_ACTIVITIES: never[] = [];

export function CodeDiffSidebar({ sessionId, repoUrl }: CodeDiffSidebarProps) {
    const activities = useStore(s => s.activities[sessionId] ?? EMPTY_ACTIVITIES);
    const sessionSnapshot = useStore(s => s.sessionSnapshot);
    const finalDiff = useMemo(() => activities
        .flatMap(a => {
            const cs = (a as {artifacts?: unknown[]}).artifacts?.find((art): art is ChangeSetArtifact => (art as {type?: string}).type === 'changeSet');
            return cs ? [{id: a.id, patch: cs.gitPatch.unidiffPatch}] : [];
        })
        .slice(-1), [activities]);

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

  if (finalDiff.length === 0) {
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
      <div className="p-4">
          {finalDiff.map((x) => (
              <DiffViewer 
                  key={x.id} 
                  diff={x.patch} 
                  onDownloadFile={handleDownloadFile} 
                  {...(repoUrl ? {repoUrl} : {})} 
                  branch="main"
              />
          ))}
      </div>
    </ScrollArea>
  );
}
