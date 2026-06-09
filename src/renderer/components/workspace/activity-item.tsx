import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {ChevronDown, ChevronRight, Terminal} from "lucide-react";
import {Card, CardContent} from "@/ui/card.tsx";
import {Badge} from "@/ui/badge.tsx";
import {Avatar, AvatarFallback} from "@/ui/avatar.tsx";
import {Button} from "@/ui/button.tsx";
import {BashOutput} from "@/ui/bash-output.tsx";
import {BorderGlow} from "@/ui/border-glow.tsx";
import {CardSpotlight} from "@/ui/card-spotlight.tsx";
import {formatDistanceToNow, isValid, parseISO} from "date-fns";
import {PlanContent} from "./plan-content.tsx";
import {activityText, getActivityTypeColor} from "@/utils/activity.ts";
import type {BashArtifact, MediaArtifact} from "@google/jules-sdk";
import type {Activity, ActivityGroup, ActivityRole, ActivityType} from "@/types/activity-feed.ts";

export {getActivityTypeColor};

export function formatDate(dateString: string): string {
    if (!dateString) return "Unknown date";
  try {
      const date = parseISO(dateString);
      if (!isValid(date)) return "Unknown date";
      return formatDistanceToNow(date, {addSuffix: true});
  } catch {
      return "Unknown date";
  }
}

//if a problem happens later, it's this bitch.
function ContentRenderer({ content }: { content: string }) {
    try {
        const parsed: unknown = JSON.parse(content);
        if (parsed !== null && typeof parsed === "object" && Object.keys(parsed as object).length > 0) {
            if (Array.isArray(parsed) || (typeof parsed === "object" && "steps" in (parsed as object))) {
                return <PlanContent content={parsed}/>;
            }
            return <pre
                className="text-[11px] overflow-x-auto font-mono bg-muted/50 p-2 rounded">{JSON.stringify(parsed, null, 2)}</pre>;
        }
    } catch {
        // not JSON
    }
  return (
      <div
          className="prose prose-sm dark:prose-invert max-w-none break-words prose-p:text-xs prose-headings:text-xs prose-code:text-[11px] prose-pre:text-[11px] prose-p:my-1 prose-ul:my-1 prose-ol:my-1 prose-li:my-0">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
    </div>
  );
}

function Av({ role }: { role: ActivityRole }) {
  return (
      <Avatar className="h-6 w-6 shrink-0 mt-0.5 bg-surface border border-hair">
          <AvatarFallback
              className={`text-[9px] font-bold uppercase tracking-wider ${role === "user" ? "bg-purple-500 text-white" : "bg-foreground text-background"}`}>
        {role === "user" ? "U" : "J"}
      </AvatarFallback>
    </Avatar>
  );
}

function BashToggle({ id, expanded, onToggle }: { id: string; expanded: boolean; onToggle: (id: string) => void }) {
  return (
    <button onClick={() => { onToggle(id); }} aria-expanded={expanded} className="flex items-center gap-2 text-[9px] font-mono uppercase tracking-wider text-green-400 hover:text-green-300 transition-colors mb-2">
      {expanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
      <Terminal className="h-3 w-3" /><span>Command Output</span>
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

function AgentCard({ children }: { children: React.ReactNode }) {
  return (
      <BorderGlow className="max-w-[90%] md:max-w-[80%]" containerClassName="bg-surface/50">
      <CardSpotlight className="border-0 bg-transparent rounded-lg">
        <CardContent className="p-3">{children}</CardContent>
      </CardSpotlight>
    </BorderGlow>
  );
}

function ActivityArtifacts({activity, expandedBash, onToggleBash}: {
    activity: Activity;
    expandedBash: Set<string>;
    onToggleBash: (id: string) => void
}) {
    const bash = activity.artifacts.find((a): a is BashArtifact => a.type === 'bashOutput');
    const media = activity.artifacts.find((a): a is MediaArtifact => a.type === 'media');
    return (
        <>
            {bash && (
                <div className="mt-3 pt-3 border-t border-hair">
                    <BashToggle id={activity.id} expanded={expandedBash.has(activity.id)} onToggle={onToggleBash}/>
                    {expandedBash.has(activity.id) && (
                        <BashOutput
                            output={`$ ${bash.command}\n${bash.stdout}${bash.stderr ? '\n' + bash.stderr : ''}`.trim()}/>
                    )}
                </div>
            )}
            {media && (
                <div className="mt-3 pt-3 border-t border-hair">
                    <img
                        src={`data:${media.format};base64,${media.data}`}
                        alt="Jules media artifact"
                        className="max-w-full rounded border border-hair shadow-md"
                    />
                </div>
            )}
        </>
    );
}

function SingleActivity({ activity, expandedBash, onToggleBash, onApprovePlan, approvingPlan, isNew }: Omit<ActivityItemProps, "item"> & { activity: Activity }) {
    const isUser = activity.originator === "user";
    const isPlanPending = activity.type === "planGenerated";
    const content = activityText(activity);
    const typeLabel = activity.type as ActivityType;

  return (
    <div className={`flex gap-2.5 ${isUser ? "flex-row-reverse" : ""} ${isNew ? "animate-in fade-in slide-in-from-bottom-2 duration-500" : ""}`}>
        <Av role={activity.originator}/>
      {isUser ? (
          <Card
              className="max-w-[85%] md:max-w-[70%] border-purple-500/10 dark:border-purple-500/20 bg-purple-500/5 dark:bg-purple-950/20">
          <CardContent className="p-3">
            <div className="flex items-center gap-2 mb-2">
                <Badge variant="outline"
                       className={`text-[9px] h-4 px-1.5 font-mono uppercase tracking-wider ${getActivityTypeColor(typeLabel)} border-transparent text-black font-bold`}>{typeLabel}</Badge>
                <span className="text-[9px] font-mono text-fg-dim">{formatDate(activity.createTime)}</span>
            </div>
              <div className="text-[11px] leading-relaxed text-fg-secondary break-words"><ContentRenderer
                  content={content}/></div>
          </CardContent>
        </Card>
      ) : (
        <AgentCard>
          <div className="flex items-center gap-2 mb-2">
              <Badge variant="outline"
                     className={`text-[9px] h-4 px-1.5 font-mono uppercase tracking-wider ${getActivityTypeColor(typeLabel)} border-transparent text-black font-bold`}>{typeLabel}</Badge>
              <span className="text-[9px] font-mono text-fg-dim">{formatDate(activity.createTime)}</span>
          </div>
            <div className="text-[11px] leading-relaxed text-fg-secondary break-words"><ContentRenderer
                content={content}/></div>
            <ActivityArtifacts activity={activity} expandedBash={expandedBash} onToggleBash={onToggleBash}/>
          {isPlanPending && (
              <div className="mt-3 pt-3 border-t border-hair">
              <Button onClick={onApprovePlan} disabled={approvingPlan} size="sm" className="h-7 px-3 text-[9px] font-mono uppercase tracking-widest border-0">
                  Approve Plan
              </Button>
            </div>
          )}
        </AgentCard>
      )}
    </div>
  );
}

export function ActivityItem({ item, expandedBash, onToggleBash, onApprovePlan, approvingPlan, isNew }: ActivityItemProps) {
  if (Array.isArray(item)) {
    const first = item.at(0);
    if (!first) return null;
    return (
      <div className="flex gap-2.5">
          <Av role={first.originator}/>
        <AgentCard>
          <div className="flex items-center gap-2 mb-2">
            <Badge variant="outline" className="text-[9px] h-4 px-1.5 font-mono uppercase tracking-wider bg-yellow-500/90 border-transparent text-black font-bold">progress</Badge>
              <span className="text-[9px] font-mono text-fg-dim">{item.length} update{item.length > 1 ? "s" : ""}</span>
          </div>
          <div className="space-y-2">
            {item.map((a, i) => (
                <div key={a.id} className={i > 0 ? "pt-2 border-t border-hair" : ""}>
                    <div className="text-[8px] font-mono text-fg-dim mb-1 uppercase">{formatDate(a.createTime)}</div>
                    <div className="text-[11px] leading-relaxed text-fg-secondary break-words"><ContentRenderer
                        content={activityText(a)}/></div>
                    <ActivityArtifacts activity={a} expandedBash={expandedBash} onToggleBash={onToggleBash}/>
              </div>
            ))}
          </div>
        </AgentCard>
      </div>
    );
  }

  return <SingleActivity activity={item} expandedBash={expandedBash} onToggleBash={onToggleBash} onApprovePlan={onApprovePlan} approvingPlan={approvingPlan} isNew={isNew} />;
}
