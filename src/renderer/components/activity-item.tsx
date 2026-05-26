import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { ChevronDown, ChevronRight, Terminal, Loader2 } from "lucide-react";
import { Card, CardContent } from "@renderer/ui/card";
import { Badge } from "@renderer/ui/badge";
import { Avatar, AvatarFallback } from "@renderer/ui/avatar";
import { Button } from "@renderer/ui/button";
import { BashOutput } from "@renderer/ui/bash-output";
import { BorderGlow } from "@renderer/ui/border-glow";
import { PlanContent } from "./plan-content";
import { formatDate, getActivityTypeColor } from "@renderer/utils/activity";
import type { Activity, ActivityGroup, ActivityRole } from "@/types/activity-feed";

function ContentRenderer({ content }: { content: string }) {
  try {
    const parsed = JSON.parse(content);
    if (Array.isArray(parsed) || parsed?.steps) return <PlanContent content={parsed} />;
    return <pre className="text-[11px] overflow-x-auto font-mono bg-muted/50 p-2 rounded">{JSON.stringify(parsed, null, 2)}</pre>;
  } catch {
    return (
      <div className="prose prose-sm dark:prose-invert max-w-none break-words prose-p:text-xs prose-headings:text-xs prose-code:text-[11px] prose-pre:text-[11px]">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
      </div>
    );
  }
}

function Av({ role }: { role: ActivityRole }) {
  return (
    <Avatar className="h-6 w-6 shrink-0 mt-0.5 bg-zinc-900 border border-white/10">
      <AvatarFallback className={`text-[9px] font-bold uppercase tracking-wider ${role === "user" ? "bg-purple-500 text-white" : "bg-white text-black"}`}>
        {role === "user" ? "U" : "J"}
      </AvatarFallback>
    </Avatar>
  );
}

function BashToggle({ id, expanded, onToggle }: { id: string; expanded: boolean; onToggle: (id: string) => void }) {
  return (
    <button onClick={() => onToggle(id)} aria-expanded={expanded} className="flex items-center gap-2 text-[9px] font-mono uppercase tracking-wider text-green-400 hover:text-green-300 transition-colors mb-2">
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
    <BorderGlow className="flex-1" containerClassName="bg-zinc-950/50">
      <Card className="border-0 bg-transparent"><CardContent className="p-3">{children}</CardContent></Card>
    </BorderGlow>
  );
}

function SingleActivity({ activity, expandedBash, onToggleBash, onApprovePlan, approvingPlan, isNew }: Omit<ActivityItemProps, "item"> & { activity: Activity }) {
  const isUser = activity.role === "user";
  const isPlanPending = activity.type === "plan" &&
    !!activity.metadata?.['planGenerated'] &&
    !(activity.metadata['planGenerated'] as { approved?: boolean })?.approved;

  return (
    <div className={`flex gap-2.5 ${isUser ? "flex-row-reverse" : ""} ${isNew ? "animate-in fade-in slide-in-from-bottom-2 duration-500" : ""}`}>
      <Av role={activity.role} />
      {isUser ? (
        <Card className="flex-1 border-white/[0.08] bg-purple-950/20 border-purple-500/20">
          <CardContent className="p-3">
            <div className="flex items-center gap-2 mb-2">
              <Badge variant="outline" className={`text-[9px] h-4 px-1.5 font-mono uppercase tracking-wider ${getActivityTypeColor(activity.type)} border-transparent text-black font-bold`}>{activity.type}</Badge>
              <span className="text-[9px] font-mono text-white/40">{formatDate(activity.createdAt)}</span>
            </div>
            <div className="text-[11px] leading-relaxed text-white/90 break-words"><ContentRenderer content={activity.content} /></div>
          </CardContent>
        </Card>
      ) : (
        <AgentCard>
          <div className="flex items-center gap-2 mb-2">
            <Badge variant="outline" className={`text-[9px] h-4 px-1.5 font-mono uppercase tracking-wider ${getActivityTypeColor(activity.type)} border-transparent text-black font-bold`}>{activity.type}</Badge>
            <span className="text-[9px] font-mono text-white/40">{formatDate(activity.createdAt)}</span>
          </div>
          <div className="text-[11px] leading-relaxed text-white/90 break-words"><ContentRenderer content={activity.content} /></div>
          {activity.bashOutput && (
            <div className="mt-3 pt-3 border-t border-white/[0.08]">
              <BashToggle id={activity.id} expanded={expandedBash.has(activity.id)} onToggle={onToggleBash} />
              {expandedBash.has(activity.id) && <BashOutput output={activity.bashOutput} />}
            </div>
          )}
          {isPlanPending && (
            <div className="mt-3 pt-3 border-t border-white/[0.08]">
              <Button onClick={onApprovePlan} disabled={approvingPlan} size="sm" className="h-7 px-3 text-[9px] font-mono uppercase tracking-widest border-0">
                {approvingPlan ? <><Loader2 className="mr-1.5 h-3 w-3 animate-spin" />Approving...</> : "Approve Plan"}
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
        <Av role={first.role} />
        <AgentCard>
          <div className="flex items-center gap-2 mb-2">
            <Badge variant="outline" className="text-[9px] h-4 px-1.5 font-mono uppercase tracking-wider bg-yellow-500/90 border-transparent text-black font-bold">progress</Badge>
            <span className="text-[9px] font-mono text-white/40">{item.length} update{item.length > 1 ? "s" : ""}</span>
          </div>
          <div className="space-y-2">
            {item.map((a, i) => (
              <div key={a.id} className={i > 0 ? "pt-2 border-t border-white/[0.08]" : ""}>
                <div className="text-[8px] font-mono text-white/30 mb-1 uppercase">{formatDate(a.createdAt)}</div>
                <div className="text-[11px] leading-relaxed text-white/90 break-words"><ContentRenderer content={a.content} /></div>
                {a.bashOutput && (
                  <div className="mt-2 pt-2 border-t border-white/[0.05]">
                    <BashToggle id={a.id} expanded={expandedBash.has(a.id)} onToggle={onToggleBash} />
                    {expandedBash.has(a.id) && <BashOutput output={a.bashOutput} />}
                  </div>
                )}
              </div>
            ))}
          </div>
        </AgentCard>
      </div>
    );
  }

  return <SingleActivity activity={item} expandedBash={expandedBash} onToggleBash={onToggleBash} onApprovePlan={onApprovePlan} approvingPlan={approvingPlan} isNew={isNew} />;
}
