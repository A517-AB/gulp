import {useMemo} from "react";
import {FileCode} from "lucide-react";
import {ScrollArea} from "@/ui/scroll-area.tsx";
import {DiffViewer} from "@/ui/diff-viewer.tsx";
import type {ChangeSetArtifact} from "@google/jules-sdk";
import {useStore} from "@/store/app.ts";
import type {CodeDiffSidebarProps} from "@/types/activity-feed.ts";

const EMPTY_ACTIVITIES: never[] = [];

export function CodeDiffSidebar({ sessionId, repoUrl }: CodeDiffSidebarProps) {
    const activities = useStore(s => s.activities[sessionId] ?? EMPTY_ACTIVITIES);
    const finalDiff = useMemo(() => activities
        .flatMap(a => {
            const cs = (a as {artifacts?: unknown[]}).artifacts?.find((art): art is ChangeSetArtifact => (art as {type?: string}).type === 'changeSet');
            return cs ? [{id: a.id, patch: cs.gitPatch.unidiffPatch}] : [];
        })
        .slice(-1), [activities]);

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
          {finalDiff.map((x) => <DiffViewer key={x.id} diff={x.patch} {...(repoUrl ? {repoUrl} : {})} branch="main"/>)}
      </div>
    </ScrollArea>
  );
}
