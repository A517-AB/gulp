import { useMemo } from "react";
import { FileCode } from "lucide-react";
import { ScrollArea } from "@renderer/ui/scroll-area";
import { DiffViewer } from "@renderer/ui/diff-viewer";
import type { CodeDiffSidebarProps } from "@/types/activity-feed";

export function CodeDiffSidebar({ activities, repoUrl }: CodeDiffSidebarProps) {
  const finalDiff = useMemo(() => activities.filter((a) => a.diff).slice(-1), [activities]);

  if (finalDiff.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-6 text-center space-y-4">
        <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center">
          <FileCode className="h-6 w-6 text-white/20" />
        </div>
        <div className="space-y-1">
          <h3 className="text-sm font-bold text-white/40 uppercase tracking-widest">No Changes</h3>
          <p className="text-[11px] text-white/30 font-mono leading-relaxed">Code modifications will appear here once Jules makes changes.</p>
        </div>
      </div>
    );
  }

  return (
    <ScrollArea className="h-full">
      <div className="p-4">
        {finalDiff.map((a) => <DiffViewer key={a.id} diff={a.diff!} repoUrl={repoUrl} branch="main" />)}
      </div>
    </ScrollArea>
  );
}
