import { memo, useState } from "react";
import { Check, Download } from "lucide-react";
import { filesystem } from "@shared/bridge";
import { useStore } from "@/store/app";
import type { Activity, BashArtifact, ChangeSetArtifact, MediaArtifact } from "@jules";
import { ChangeSetSummary } from "@/components/workspace/changeset-summary.tsx";
import { TerminalConsole } from "./terminal-console.tsx";

interface MediaItemProps {
    media: MediaArtifact;
    activityId: string;
    index: number;
}

export const MediaItemDownloader = memo(function MediaItemDownloader({ media, activityId, index }: MediaItemProps) {
    const [downloadState, setDownloadState] = useState<"idle" | "saving" | "done" | "error" >("idle");

    const handleDownload = async () => {
        try {
            setDownloadState("saving");
            const ext = media.format.split("/").pop() ?? "bin";
            const defaultName = `jules_media_${activityId}_${index}.${ext}`;
            
            let success = false;
            if (filesystem) {
                const savePath = await filesystem.showSaveDialog(defaultName);
                if (savePath) {
                    await useStore.getState().saveArtifact(media.data, savePath);
                    success = true;
                } else {
                    setDownloadState("idle");
                    return;
                }
            }

            if (!success) {
                const binaryString = window.atob(media.data);
                const bytes = new Uint8Array(binaryString.length);
                for (let i = 0; i < binaryString.length; i++) {
                    bytes[i] = binaryString.charCodeAt(i);
                }
                const blob = new Blob([bytes], { type: media.format });
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = defaultName;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
            }
            setDownloadState("done");
        } catch (err) {
            console.error("[MediaItemDownloader] failed to download media:", err);
            setDownloadState("error");
        }
        setTimeout(() => {
            setDownloadState("idle");
        }, 2000);
    };

    return (
        <div className="mt-3 pt-3 border-t border-hair space-y-2">
            <div className="flex items-center justify-between">
                <span className="text-3xs font-mono uppercase tracking-wider text-fg-dim">Media ({media.format})</span>
                <button
                    onClick={() => {
                        void handleDownload();
                    }}
                    disabled={downloadState === "saving"}
                    className="flex items-center gap-1 px-1.5 py-0.5 text-3xs font-mono uppercase tracking-wider rounded bg-hover hover:bg-active border border-hair text-fg-dim hover:text-fg-secondary transition-colors disabled:opacity-50"
                >
                    {downloadState === "done" ? (
                        <Check className="h-3 w-3 text-green-500" />
                    ) : downloadState === "error" ? (
                        <span className="text-destructive font-bold">!</span>
                    ) : (
                        <Download className="h-3 w-3" />
                    )}
                    <span>
                        {downloadState === "saving"
                            ? "Saving..."
                            : downloadState === "done"
                              ? "Saved"
                              : downloadState === "error"
                                ? "Error"
                                : "Save"}
                    </span>
                </button>
            </div>
            <div className="flex justify-center bg-surface-raised rounded p-2 border border-hair">
                {media.format.startsWith("video/") ? (
                    <video
                        src={`data:${media.format};base64,${media.data}`}
                        controls
                        className="max-w-full rounded border border-hair shadow-md"
                    />
                ) : media.format.startsWith("audio/") ? (
                    <audio src={`data:${media.format};base64,${media.data}`} controls className="w-full" />
                ) : (
                    <img
                        src={`data:${media.format};base64,${media.data}`}
                        alt="Jules media"
                        className="max-w-full rounded border border-hair shadow-md"
                    />
                )}
            </div>
        </div>
    );
});

interface ActivityArtifactsProps {
    activity: Activity;
    only?: "changeset" | "media";
}

export const ActivityArtifacts = memo(
    function ActivityArtifacts({ activity, only }: ActivityArtifactsProps) {
        const bashOutputs =
            only === undefined
                ? activity.artifacts.filter((a): a is BashArtifact => a.type === "bashOutput")
                : [];
        const mediaItems =
            only !== "changeset"
                ? activity.artifacts.filter((a): a is MediaArtifact => a.type === "media")
                : [];
        const changeSets =
            only !== "media"
                ? activity.artifacts.filter((a): a is ChangeSetArtifact => a.type === "changeSet")
                : [];

        return (
            <>
                {changeSets.map((cs, i) => (
                    <ChangeSetSummary key={i} artifact={cs} />
                ))}
                {bashOutputs.length > 0 && <TerminalConsole bashOutputs={bashOutputs} />}
                {mediaItems.map((media, i) => (
                    <MediaItemDownloader key={i} media={media} activityId={activity.id} index={i} />
                ))}
            </>
        );
    },
    (prevProps, nextProps) => {
        if (prevProps.only !== nextProps.only) return false;
        if (prevProps.activity.id !== nextProps.activity.id) return false;

        const pArt = prevProps.activity.artifacts;
        const nArt = nextProps.activity.artifacts;
        if (pArt.length !== nArt.length) return false;

        return pArt.every((prev, idx) => {
            const next = nArt[idx];
            if (!next) return false;
            if (prev.type !== next.type) return false;
            if (prev.type === "bashOutput" && next.type === "bashOutput") {
                return (
                    prev.command === next.command &&
                    prev.stdout === next.stdout &&
                    prev.stderr === next.stderr &&
                    prev.exitCode === next.exitCode
                );
            }
            if (prev.type === "media" && next.type === "media") {
                return prev.format === next.format && prev.data === next.data;
            }
            if (prev.type === "changeSet" && next.type === "changeSet") {
                return JSON.stringify(prev) === JSON.stringify(next);
            }
            return false;
        });
    }
);
