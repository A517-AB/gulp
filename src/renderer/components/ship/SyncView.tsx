import {useEffect} from "react";
import {Archive} from "lucide-react";
import {SyncManager} from "@/components/ship/SyncManager";
import {useSyncStore} from "@/store/sync";

interface SyncViewProps {
    effectiveSourceId: string;
    repoName: string;
}

export function SyncView({effectiveSourceId, repoName}: SyncViewProps) {
    const {localRepoPath, loadLocalRepoPath, selectLocalFolder} = useSyncStore();

    useEffect(() => {
        if (effectiveSourceId) {
            void loadLocalRepoPath(effectiveSourceId);
        }
    }, [effectiveSourceId, loadLocalRepoPath]);

    return (
        <div className="flex-1 px-6 py-4 overflow-y-auto min-h-0">
            {localRepoPath ? (
                <SyncManager repoPath={localRepoPath} repoName={repoName}/>
            ) : (
                <div
                    className="bg-surface/30 border border-hair rounded-lg p-8 text-center flex flex-col items-center justify-center gap-4 max-w-sm mx-auto mt-8 backdrop-blur-sm">
                    <Archive className="h-8 w-8 text-fg-ghost opacity-60"/>
                    <div>
                        <h4 className="text-xxs font-bold uppercase tracking-wider text-fg-primary">
                            Link Local Folder
                        </h4>
                        <p className="text-3xs text-fg-ghost mt-1.5 leading-relaxed">
                            To use local git sync and backups, you must link this repository to its local directory on
                            your device.
                        </p>
                    </div>
                    <button
                        onClick={() => {
                            void selectLocalFolder(effectiveSourceId);
                        }}
                        className="px-4 py-1.5 bg-purple-600 text-white rounded border border-purple-500 text-3xs font-mono font-bold hover:bg-purple-700 transition-colors cursor-pointer"
                    >
                        Select Local Folder
                    </button>
                </div>
            )}
        </div>
    );
}
