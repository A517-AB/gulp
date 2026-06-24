import {useEffect, useState} from "react";
import type {Artifact} from "@jules";
import type {JulesParsedFile} from "@shared/jules-ipc";
import {useStore} from "@/store/app";
import {cn} from "@/utils";

type ChangeSetArtifact = Extract<Artifact, { type: 'changeSet' }>;
type ParsedFile = JulesParsedFile;

interface ChangeSetSummaryProps {
    artifact: ChangeSetArtifact;
    className?: string;
}

export function ChangeSetSummary({ artifact, className }: ChangeSetSummaryProps) {
    const patch = artifact.gitPatch.unidiffPatch;
    const [files, setFiles] = useState<ParsedFile[]>([]);
    const parseUnidiff = useStore((s) => s.parseUnidiff);

    useEffect(() => {
        if (!patch) return;
        parseUnidiff(patch).then(setFiles).catch(console.error);
    }, [patch, parseUnidiff]);

    if (!patch || files.length === 0) return null;
    const totalAdd = files.reduce((s, f) => s + f.additions, 0);
    const totalDel = files.reduce((s, f) => s + f.deletions, 0);
    return (
        <div className={cn("mt-3 pt-3 border-t border-hair", className)}>
            <div className="flex items-center gap-2 mb-2 text-3xs font-mono uppercase tracking-wider text-purple-400">
                <span className="text-purple-400">◆</span>
                <span>Code Changes</span>
                <span className="text-fg-ghost ml-auto">{files.length} file{files.length !== 1 ? 's' : ''}</span>
                <span className="text-green-400">+{totalAdd}</span>
                <span className="text-red-400">-{totalDel}</span>
            </div>
            <div className="space-y-0.5">
                {files.map((f, i) => (
                    <div key={i} className="flex items-center justify-between gap-2 text-3xs font-mono">
                        <span className="text-fg-dim truncate">{f.path}</span>
                        <span className="shrink-0 flex gap-1.5">
                            <span className="text-green-400">+{f.additions}</span>
                            <span className="text-red-400">-{f.deletions}</span>
                        </span>
                    </div>
                ))}
            </div>
        </div>
    );
}
