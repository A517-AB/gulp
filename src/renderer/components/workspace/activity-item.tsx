import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {CheckCircle2, ChevronDown, ChevronRight, Terminal, XCircle, Download, Check} from "lucide-react";
import {Card, CardContent} from "@/ui/card.tsx";
import {Badge} from "@/ui/badge.tsx";
import {Avatar, AvatarFallback} from "@/ui/avatar.tsx";
import {Button} from "@/ui/button.tsx";
import {BashOutput} from "@/ui/bash-output.tsx";
import {BorderGlow} from "@/ui/border-glow.tsx";
import {CardSpotlight} from "@/ui/card-spotlight.tsx";
import {PlanContent} from "./plan-content.tsx";
import {formatDate, getActivityTypeColor} from "@/utils/activity.ts";
import {ChangeSetSummary} from "./changeset-summary.tsx";
import type {Activity, BashArtifact, ChangeSetArtifact, MediaArtifact, ActivityGroup, ActivityRole, ActivityType} from '@jules';
import {filesystem, sdkIpc} from "@shared/bridge";
import {useState} from "react";


function Markdown({children}: { children: string }) {
    return (
        <div
            className="prose dark:prose-invert max-w-none break-words prose-p:text-sm prose-headings:text-base prose-code:text-sm prose-pre:text-sm prose-p:my-1 prose-ul:my-1 prose-ol:my-1 prose-li:my-0">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{children}</ReactMarkdown>
        </div>
    );
}

function renderContent(activity: Activity): React.ReactNode {
    switch (activity.type) {
        case 'planGenerated':
            return <PlanContent content={activity.plan}/>;
        case 'agentMessaged':
        case 'userMessaged':
            return <Markdown>{activity.message}</Markdown>;
        case 'planApproved':
            return (
                <div className="flex items-center gap-1.5">
                    <CheckCircle2 className="h-3 w-3 text-green-500 shrink-0"/>
                    <span className="text-xs font-mono text-fg-muted">Plan approved</span>
                </div>
            );
        case 'progressUpdated':
            return (
                <div>
                    <p className="text-sm text-fg-primary">{activity.title}</p>
                    {activity.description && <p className="text-xs text-fg-muted mt-0.5">{activity.description}</p>}
                </div>
            );
        case 'sessionCompleted':
            return (
                <div className="flex items-center gap-1.5">
                    <CheckCircle2 className="h-3 w-3 text-green-500 shrink-0"/>
                    <span className="text-[10px] font-mono text-green-500">Session completed</span>
                </div>
            );
        case 'sessionFailed':
            return (
                <div className="flex items-center gap-1.5">
                    <XCircle className="h-3 w-3 text-red-500 shrink-0"/>
                    <span className="text-[10px] font-mono text-red-400">{activity.reason}</span>
                </div>
            );
    }
}

function Av({role}: { role: ActivityRole }) {
    return (
        <Avatar className="h-6 w-6 shrink-0 mt-0.5 bg-surface border border-hair">
            <AvatarFallback
                className={`text-[9px] font-bold uppercase tracking-wider ${role === "user" ? "bg-purple-500 text-white" : "bg-foreground text-background"}`}>
                {role === "user" ? "U" : "J"}
            </AvatarFallback>
        </Avatar>
    );
}

function ExitBadge({code}: { code: number | null | undefined }) {
    if (code == null) return null;
    const ok = code === 0;
    return (
        <span
            className={`ml-2 text-[9px] font-mono px-1.5 py-0.5 rounded ${ok ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"}`}>
            exit {code}
        </span>
    );
}

function BashToggle({id, expanded, exitCode, onToggle}: {
    id: string;
    expanded: boolean;
    exitCode: number | null | undefined;
    onToggle: (id: string) => void;
}) {
    return (
        <button
            onClick={() => {
                onToggle(id);
            }}
            aria-expanded={expanded}
            className="flex items-center gap-2 text-[9px] font-mono uppercase tracking-wider text-green-400 hover:text-green-300 transition-colors mb-2"
        >
            {expanded ? <ChevronDown className="h-3 w-3"/> : <ChevronRight className="h-3 w-3"/>}
            <Terminal className="h-3 w-3"/>
            <span>Command Output</span>
            <ExitBadge code={exitCode}/>
        </button>
    );
}

interface ActivityItemProps {
    item: ActivityGroup;
    expandedBash: Set<string>;
    onToggleBash: (id: string) => void;
    onApprovePlan: () => void;
    approvingPlan: boolean;
    isNew: boolean;
}

function AgentCard({children}: { children: React.ReactNode }) {
    return (
        <BorderGlow className="max-w-[90%] md:max-w-[80%]" containerClassName="bg-surface/50">
            <CardSpotlight className="border-0 bg-transparent rounded-lg">
                <CardContent className="p-3">{children}</CardContent>
            </CardSpotlight>
        </BorderGlow>
    );
}


function ActivityArtifacts({activity, expandedBash, onToggleBash, only}: {
    activity: Activity;
    expandedBash: Set<string>;
    onToggleBash: (id: string) => void;
    only?: 'bash' | 'changeset' | 'media';
}) {
    const [downloadState, setDownloadState] = useState<"idle" | "saving" | "done" | "error">("idle");
    const bash = only !== 'changeset' && only !== 'media' ? activity.artifacts.find((a): a is BashArtifact => a.type === 'bashOutput') : undefined;
    const media = only !== 'bash' && only !== 'changeset' ? activity.artifacts.find((a): a is MediaArtifact => a.type === 'media') : undefined;
    const changeset = only !== 'bash' && only !== 'media' ? activity.artifacts.find((a): a is ChangeSetArtifact => a.type === 'changeSet') : undefined;

    const handleDownloadMedia = async (med: MediaArtifact) => {
        try {
            setDownloadState("saving");
            const ext = med.format.split("/").pop() ?? "bin";
            const defaultName = `jules_media_${activity.id}.${ext}`;
            
            if (filesystem && sdkIpc) {
                const savePath = await filesystem.showSaveDialog(defaultName);
                if (!savePath) {
                    setDownloadState("idle");
                    return;
                }
                await sdkIpc.artifact.save(med.data, savePath);
            } else {
                // Web fallback
                const binaryString = window.atob(med.data);
                const len = binaryString.length;
                const bytes = new Uint8Array(len);
                for (let i = 0; i < len; i++) {
                    bytes[i] = binaryString.charCodeAt(i);
                }
                const blob = new Blob([bytes], { type: med.format });
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
            console.error("[ActivityArtifacts] failed to download media:", err);
            setDownloadState("error");
        }
        setTimeout(() => { setDownloadState("idle"); }, 2000);
    };

    return (
        <>
            {changeset && <ChangeSetSummary artifact={changeset}/>}
            {bash && (
                <div className="mt-3 pt-3 border-t border-hair">
                    <BashToggle
                        id={activity.id}
                        expanded={expandedBash.has(activity.id)}
                        exitCode={bash.exitCode}
                        onToggle={onToggleBash}
                    />
                    {expandedBash.has(activity.id) && (
                        <BashOutput
                            output={`$ ${bash.command}\n${bash.stdout}${bash.stderr ? '\n' + bash.stderr : ''}`.trim()}
                        />
                    )}
                </div>
            )}
            {media && (
                <div className="mt-3 pt-3 border-t border-hair space-y-2">
                    <div className="flex items-center justify-between">
                        <span className="text-[9px] font-mono uppercase tracking-wider text-fg-dim">Generated Media ({media.format})</span>
                        <button
                            onClick={() => { void handleDownloadMedia(media); }}
                            disabled={downloadState === "saving"}
                            className="flex items-center gap-1 px-1.5 py-0.5 text-3xs font-mono uppercase tracking-wider rounded bg-hover hover:bg-active border border-hair text-fg-dim hover:text-fg-secondary transition-colors disabled:opacity-50"
                        >
                            {downloadState === "done" ? <Check className="h-3 w-3 text-green-500" /> : downloadState === "error" ? <span className="text-destructive font-bold">!</span> : <Download className="h-3 w-3" />}
                            <span>{downloadState === "saving" ? "Saving..." : downloadState === "done" ? "Saved" : downloadState === "error" ? "Error" : "Save"}</span>
                        </button>
                    </div>
                    <div className="flex justify-center bg-surface-raised rounded p-2 border border-hair">
                        {media.format.startsWith('video/') ? (
                            <video
                                src={`data:${media.format};base64,${media.data}`}
                                controls
                                className="max-w-full rounded border border-hair shadow-md"
                            />
                        ) : media.format.startsWith('audio/') ? (
                            <audio
                                src={`data:${media.format};base64,${media.data}`}
                                controls
                                className="w-full"
                            />
                        ) : (
                            <img
                                src={`data:${media.format};base64,${media.data}`}
                                alt="Jules media artifact"
                                className="max-w-full rounded border border-hair shadow-md"
                            />
                        )}
                    </div>
                </div>
            )}
        </>
    );
}

function TypeBadge({type}: { type: ActivityType }) {
    return (
        <Badge
            variant="outline"
            className={`text-[9px] h-4 px-1.5 font-mono uppercase tracking-wider ${getActivityTypeColor(type)} border-transparent text-black font-bold`}
        >
            {type}
        </Badge>
    );
}

function SingleActivity({
                            activity,
                            expandedBash,
                            onToggleBash,
                            onApprovePlan,
                            approvingPlan,
                            isNew,
                        }: Omit<ActivityItemProps, "item"> & { activity: Activity }) {
    const isUser = activity.originator === "user";
    const isPlanPending = activity.type === "planGenerated";
    const content = renderContent(activity);

    return (
        <div
            className={`flex gap-2.5 ${isUser ? "flex-row-reverse" : ""} ${isNew ? "animate-in fade-in slide-in-from-bottom-2 duration-500" : ""}`}>
            <Av role={activity.originator}/>
            {isUser ? (
                <Card
                    className="max-w-[85%] md:max-w-[70%] border-purple-500/10 dark:border-purple-500/20 bg-purple-500/5 dark:bg-purple-950/20">
                    <CardContent className="p-3">
                        <div className="flex items-center gap-2 mb-2">
                            <TypeBadge type={activity.type}/>
                            <span className="text-xs font-mono text-fg-muted">{formatDate(activity.createTime)}</span>
                        </div>
                        <div className="text-sm leading-relaxed text-fg-primary break-words">
                            {content}
                        </div>
                    </CardContent>
                </Card>
            ) : (
                <AgentCard>
                    <div className="flex items-center gap-2 mb-2">
                        <TypeBadge type={activity.type}/>
                        <span className="text-xs font-mono text-fg-muted">{formatDate(activity.createTime)}</span>
                    </div>
                    <div className="text-sm leading-relaxed text-fg-primary break-words">
                        {content}
                    </div>
                    <ActivityArtifacts activity={activity} expandedBash={expandedBash} onToggleBash={onToggleBash}/>
                    {isPlanPending && (
                        <div className="mt-3 pt-3 border-t border-hair">
                            <Button onClick={onApprovePlan} disabled={approvingPlan} size="sm"
                                    className="h-7 px-3 text-[9px] font-mono uppercase tracking-widest border-0">
                                Approve Plan
                            </Button>
                        </div>
                    )}
                </AgentCard>
            )}
        </div>
    );
}

export function ActivityItem({
                                 item,
                                 expandedBash,
                                 onToggleBash,
                                 onApprovePlan,
                                 approvingPlan,
                                 isNew,
                             }: ActivityItemProps) {
    if (Array.isArray(item)) {
        const first = item.at(0);
        if (!first) return null;
        const lastBashActivity = [...item].reverse().find(a => a.artifacts.some(x => x.type === 'bashOutput'));
        const lastChangesetActivity = [...item].reverse().find(a => a.artifacts.some(x => x.type === 'changeSet'));
        const lastMediaActivity = [...item].reverse().find(a => a.artifacts.some(x => x.type === 'media'));
        return (
            <div className="flex gap-2.5">
                <Av role={first.originator}/>
                <AgentCard>
                    <div className="flex items-center gap-2 mb-2">
                        <Badge variant="outline"
                               className="text-[9px] h-4 px-1.5 font-mono uppercase tracking-wider bg-yellow-500/90 border-transparent text-black font-bold">
                            progress
                        </Badge>
                        <span
                            className="text-xs font-mono text-fg-muted">{item.length} update{item.length > 1 ? "s" : ""}</span>
                    </div>
                    <div className="space-y-2">
                        {item.map((a, i) => {
                            const update = a as Extract<Activity, {type: 'progressUpdated'}>;
                            return (
                                <div key={a.id} className={i > 0 ? "pt-2 border-t border-hair" : ""}>
                                    <div
                                        className="text-xs font-mono text-fg-muted mb-1 uppercase">{formatDate(a.createTime)}</div>
                                    <p className="text-sm text-fg-primary">{update.title}</p>
                                    {update.description &&
                                        <p className="text-xs text-fg-muted mt-0.5">{update.description}</p>}
                                </div>
                            );
                        })}
                    </div>
                    {lastBashActivity && <ActivityArtifacts activity={lastBashActivity} expandedBash={expandedBash}
                                                            onToggleBash={onToggleBash} only="bash"/>}
                    {lastChangesetActivity && lastChangesetActivity !== lastBashActivity &&
                        <ActivityArtifacts activity={lastChangesetActivity} expandedBash={expandedBash}
                                           onToggleBash={onToggleBash} only="changeset"/>}
                    {lastMediaActivity && lastMediaActivity !== lastBashActivity && lastMediaActivity !== lastChangesetActivity &&
                        <ActivityArtifacts activity={lastMediaActivity} expandedBash={expandedBash}
                                           onToggleBash={onToggleBash} only="media"/>}
                </AgentCard>
            </div>
        );
    }

    return <SingleActivity activity={item} expandedBash={expandedBash} onToggleBash={onToggleBash}
                           onApprovePlan={onApprovePlan} approvingPlan={approvingPlan} isNew={isNew}/>;
}
