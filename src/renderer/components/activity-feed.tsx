import { useEffect, useRef } from 'react'
import { Loader2, Bot, User, CheckCircle2, XCircle, FileCode2, Terminal } from 'lucide-react'
import { DiffViewer } from '@/ui/diff-viewer'
import { cn } from '@/utils'
import type { WsActivity, WsStatus, WsOutcome } from '@/hooks/use-session-ws'

interface ActivityFeedProps {
  activities: WsActivity[]
  status: WsStatus
  outcome: WsOutcome | null
  error: Error | null
}

export function ActivityFeed({ activities, status, outcome, error }: ActivityFeedProps) {
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [activities.length])

  if (status === 'idle') {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-sm text-fg-dim">Select a session to view activity</p>
      </div>
    )
  }

  if (status === 'connecting') {
    return (
      <div className="flex-1 flex items-center justify-center gap-2 text-fg-dim">
        <Loader2 size={14} className="animate-spin" />
        <span className="text-sm">Connecting…</span>
      </div>
    )
  }

  if (error !== null) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-sm text-red-400">{error?.message ?? 'Connection failed'}</p>
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
      {activities.length === 0 && status === 'connected' && (
        <div className="flex items-center gap-2 text-fg-dim text-sm py-4">
          <Loader2 size={13} className="animate-spin" />
          <span>Waiting for activity…</span>
        </div>
      )}

      {activities.map((activity, i) => (
        <ActivityItem key={activity.id ?? i} activity={activity} />
      ))}

      {outcome && <OutcomeSummary outcome={outcome} />}

      <div ref={bottomRef} />
    </div>
  )
}

function ActivityItem({ activity }: { activity: WsActivity }) {
  switch (activity.type) {
    case 'agentMessaged':
      return <AgentMessage activity={activity} />
    case 'userMessaged':
      return <UserMessage activity={activity} />
    case 'planGenerated':
      return <PlanCard activity={activity} />
    case 'planApproved':
      return <StatusLine icon={<CheckCircle2 size={12} className="text-emerald-400" />} text="Plan approved" />
    case 'progressUpdated':
      return <ProgressCard activity={activity} />
    case 'sessionCompleted':
      return <StatusLine icon={<CheckCircle2 size={12} className="text-emerald-400" />} text="Session completed" accent="emerald" />
    case 'sessionFailed':
      return <StatusLine icon={<XCircle size={12} className="text-red-400" />} text={`Session failed${activity.reason ? `: ${activity.reason}` : ''}`} accent="red" />
    default:
      return null
  }
}

function AgentMessage({ activity }: { activity: WsActivity }) {
  return (
    <div className="flex gap-2.5">
      <div className="shrink-0 mt-0.5 size-5 rounded-full bg-purple-500/20 flex items-center justify-center">
        <Bot size={11} className="text-purple-400" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[10px] font-medium text-fg-dim mb-1">Jules</p>
        <div className="text-sm text-fg-primary whitespace-pre-wrap leading-relaxed">
          {('message' in activity ? (activity as any).message : "")}
        </div>
      </div>
    </div>
  )
}

function UserMessage({ activity }: { activity: WsActivity }) {
  return (
    <div className="flex gap-2.5 justify-end">
      <div className="max-w-[80%] rounded-lg bg-surface border border-hair px-3 py-2">
        <p className="text-[10px] font-medium text-fg-dim mb-1">You</p>
        <div className="text-sm text-fg-primary whitespace-pre-wrap">{('message' in activity ? (activity as any).message : "")}</div>
      </div>
      <div className="shrink-0 mt-0.5 size-5 rounded-full bg-surface border border-hair flex items-center justify-center">
        <User size={11} className="text-fg-muted" />
      </div>
    </div>
  )
}

function PlanCard({ activity }: { activity: WsActivity }) {
  const steps = ('plan' in activity ? (activity as any).plan : null)?.steps ?? []
  return (
    <div className="rounded-lg border border-hair bg-surface p-3">
      <p className="text-[10px] font-semibold text-fg-secondary uppercase tracking-wide mb-2">Plan · {steps.length} steps</p>
      <ol className="space-y-1.5">
        {steps.map((step: any, i: number) => (
          <li key={i} className="flex items-baseline gap-2 text-xs text-fg-primary">
            <span className="shrink-0 size-4 rounded-full bg-hover flex items-center justify-center text-[9px] font-medium text-fg-muted">
              {i + 1}
            </span>
            <span>{step.title}</span>
          </li>
        ))}
      </ol>
    </div>
  )
}

function ProgressCard({ activity }: { activity: WsActivity }) {
  const artifacts = activity.artifacts ?? []
  const hasCode = artifacts.some(a => a.type === 'changeSet')
  const hasBash = artifacts.some(a => a.type === 'bashOutput')

  return (
    <div className="rounded-lg border border-hair bg-surface/50 p-3 space-y-2">
      <div className="flex items-center gap-2">
        <Loader2 size={11} className="text-cyan-400 shrink-0" />
        <p className="text-xs font-medium text-fg-primary">{('title' in activity ? (activity as any).title : "") || 'Progress'}</p>
      </div>

      {activity.description && (
        <p className="text-[11px] text-fg-muted pl-5">{activity.description}</p>
      )}

      {hasCode && artifacts.filter(a => a.type === 'changeSet').map((artifact, i) => {
        const parsed = artifact.parsed ? artifact.parsed() : null
        const patch = artifact.gitPatch?.unidiffPatch

        return (
          <div key={i} className="pl-5 space-y-1.5">
            {parsed && (
              <div className="flex items-center gap-3 text-[10px] text-fg-dim">
                <span className="flex items-center gap-1"><FileCode2 size={10} /> {parsed.summary.totalFiles} files</span>
                {parsed.summary.created > 0 && <span className="text-emerald-400">+{parsed.summary.created} created</span>}
                {parsed.summary.modified > 0 && <span className="text-blue-400">~{parsed.summary.modified} modified</span>}
                {parsed.summary.deleted > 0 && <span className="text-red-400">-{parsed.summary.deleted} deleted</span>}
              </div>
            )}
            {patch && <DiffViewer diff={patch} className="mt-1" />}
          </div>
        )
      })}

      {hasBash && artifacts.filter(a => a.type === 'bashOutput').map((artifact, i) => (
        <div key={i} className="pl-5">
          <div className="flex items-center gap-1.5 text-[10px] text-fg-dim mb-1">
            <Terminal size={10} />
            <span>Shell output {artifact.exitCode !== null ? `· exit ${artifact.exitCode}` : ''}</span>
          </div>
          {(artifact.type === 'bashOutput' ? (artifact as any).text() : "") && (
            <pre className={cn(
              'text-[10px] font-mono leading-relaxed rounded border border-hair bg-surface p-2 overflow-x-auto max-h-32 overflow-y-auto',
              artifact.exitCode !== 0 ? 'text-red-400' : 'text-fg-muted',
            )}>
              {(artifact.type === 'bashOutput' ? (artifact as any).text() : "").slice(0, 2000)}{(artifact.type === 'bashOutput' ? (artifact as any).text() : "").length > 2000 ? '\n…' : ''}
            </pre>
          )}
        </div>
      ))}
    </div>
  )
}

function StatusLine({ icon, text, accent }: { icon: React.ReactNode; text: string; accent?: 'emerald' | 'red' }) {
  return (
    <div className={cn(
      'flex items-center gap-2 py-1.5 px-3 rounded-md text-xs',
      accent === 'emerald' && 'bg-emerald-500/10 text-emerald-400',
      accent === 'red' && 'bg-red-500/10 text-red-400',
      !accent && 'text-fg-muted',
    )}>
      {icon}
      {text}
    </div>
  )
}

function OutcomeSummary({ outcome }: { outcome: WsOutcome }) {
  const files = ((outcome as any)?.generatedFiles ? (outcome as any)?.generatedFiles().all() : []) ?? []
  const pr = outcome.pullRequest

  if (files.length === 0 && !pr) return null

  return (
    <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-3 space-y-2">
      <p className="text-[10px] font-semibold text-emerald-400 uppercase tracking-wide">Result</p>
      {pr && (
        <a
          href={pr.url}
          target="_blank"
          rel="noreferrer"
          className="block text-xs text-emerald-400 hover:underline"
        >
          Pull request ↗
        </a>
      )}
      {files.length > 0 && (
        <div className="space-y-1">
          {files.map((f: any, i: number) => (
            <div key={i} className="flex items-center gap-2 text-[10px] text-fg-muted font-mono">
              <span className={cn(
                'shrink-0 w-12 text-center px-1 rounded',
                f.changeType === 'created' ? 'text-emerald-400' : f.changeType === 'deleted' ? 'text-red-400' : 'text-blue-400',
              )}>
                {f.changeType}
              </span>
              <span className="truncate">{f.path}</span>
              <span className="shrink-0 text-emerald-400">+{f.additions}</span>
              <span className="shrink-0 text-red-400">-{f.deletions}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
