import { useState, type ReactNode } from 'react'
import {
  ChevronDown, ChevronRight,
  CheckCircle2, XCircle, Clock,
  MessageSquare, User, ListChecks,
  GitCommit, Terminal, Image,
  Loader2,
} from 'lucide-react'
import { DiffViewer } from '@/ui/diff-viewer'
import { BashOutput } from '@/ui/bash-output'
import { cn } from '@/utils'
import type {
  AnyActivity, SessionState,
  Artifact, ChangeSetArtifact, BashArtifact, MediaArtifact,
  ActivityProgressUpdated,
} from './types'

// ── type guards ───────────────────────────────────────────────────────────────

function isChangeSet(a: Artifact): a is ChangeSetArtifact { return a.type === 'changeSet' }
function isBash(a: Artifact):      a is BashArtifact      { return a.type === 'bashOutput' }
function isMedia(a: Artifact):     a is MediaArtifact     { return a.type === 'media' }
function isProgress(a: AnyActivity): a is ActivityProgressUpdated { return a.type === 'progressUpdated' }

// ── ArtifactItem ──────────────────────────────────────────────────────────────

function ArtifactItem({ artifact }: { artifact: Artifact }): ReactNode {
  const [open, setOpen] = useState(false)

  if (isChangeSet(artifact)) {
    const patch = artifact.gitPatch?.unidiffPatch
    const msg   = artifact.gitPatch?.suggestedCommitMessage

    return (
      <div className="rounded-lg border border-hair overflow-hidden">
        <button
          onClick={() => { setOpen(v => !v) }}
          className="w-full flex items-center gap-2.5 px-3 py-2 bg-raised hover:bg-hover transition-colors text-left"
        >
          <GitCommit className="w-3.5 h-3.5 text-fg-dim shrink-0" />
          <span className="flex-1 text-xxs font-medium text-fg-secondary">Code changes</span>
          {open
            ? <ChevronDown className="w-3 h-3 text-fg-ghost shrink-0" />
            : <ChevronRight className="w-3 h-3 text-fg-ghost shrink-0" />}
        </button>

        {open && (
          <div className="border-t border-hair p-3 space-y-3">
            {msg && (
              <p className="text-2xs text-fg-muted font-mono italic">{msg}</p>
            )}
            {patch
              ? <DiffViewer diff={patch} />
              : <p className="text-2xs text-fg-ghost">Diff not available.</p>}
          </div>
        )}
      </div>
    )
  }

  if (isBash(artifact)) {
    const exitOk = artifact.exitCode === 0

    return (
      <div className="rounded-lg border border-hair overflow-hidden">
        <button
          onClick={() => { setOpen(v => !v) }}
          className="w-full flex items-center gap-2.5 px-3 py-2 bg-raised hover:bg-hover transition-colors text-left"
        >
          <Terminal className="w-3.5 h-3.5 text-fg-dim shrink-0" />
          <span className="flex-1 text-xxs font-medium text-fg-secondary truncate">
            {artifact.command || 'Command output'}
          </span>
          {artifact.exitCode !== undefined && artifact.exitCode !== null && (
            <span className={cn(
              'text-3xs font-mono rounded px-1.5 py-0.5 shrink-0',
              exitOk ? 'bg-emerald-500/10 text-emerald-400' : 'bg-destructive/10 text-destructive',
            )}>
              exit {String(artifact.exitCode)}
            </span>
          )}
          {open
            ? <ChevronDown className="w-3 h-3 text-fg-ghost shrink-0" />
            : <ChevronRight className="w-3 h-3 text-fg-ghost shrink-0" />}
        </button>
        {open && (
          <div className="border-t border-hair p-3">
            <BashOutput output={artifact.stdout} />
          </div>
        )}
      </div>
    )
  }

  if (isMedia(artifact)) {
    return (
      <div className="rounded-lg border border-hair overflow-hidden">
        <div className="flex items-center gap-2.5 px-3 py-2 bg-raised">
          <Image className="w-3.5 h-3.5 text-fg-dim shrink-0" />
          <span className="text-xxs text-fg-secondary">Media</span>
        </div>
      </div>
    )
  }

  return null
}

// ── activity configs ──────────────────────────────────────────────────────────

const ACTIVITY_CFG: Record<string, {
  icon: (cls: string) => ReactNode
  color: string
  bgColor: string
  label: string
}> = {
  planGenerated: {
    icon: cls => <ListChecks className={cls} />,
    color: 'text-blue-400',
    bgColor: 'bg-blue-500/8',
    label: 'Plan',
  },
  progressUpdated: {
    icon: cls => <Loader2 className={cn(cls, 'animate-spin')} />,
    color: 'text-fg-dim',
    bgColor: 'bg-transparent',
    label: 'Progress',
  },
  agentMessaged: {
    icon: cls => <MessageSquare className={cls} />,
    color: 'text-primary',
    bgColor: 'bg-primary/6',
    label: 'Jules',
  },
  userMessaged: {
    icon: cls => <User className={cls} />,
    color: 'text-fg-muted',
    bgColor: 'bg-surface',
    label: 'You',
  },
  planApproved: {
    icon: cls => <CheckCircle2 className={cls} />,
    color: 'text-emerald-400',
    bgColor: 'bg-emerald-500/8',
    label: 'Plan approved',
  },
  awaitingPlanApproval: {
    icon: cls => <Clock className={cls} />,
    color: 'text-yellow-400',
    bgColor: 'bg-yellow-500/8',
    label: 'Awaiting approval',
  },
  awaitingUserFeedback: {
    icon: cls => <Clock className={cls} />,
    color: 'text-orange-400',
    bgColor: 'bg-orange-500/8',
    label: 'Awaiting feedback',
  },
  sessionCompleted: {
    icon: cls => <CheckCircle2 className={cls} />,
    color: 'text-emerald-400',
    bgColor: 'bg-emerald-500/8',
    label: 'Completed',
  },
  sessionFailed: {
    icon: cls => <XCircle className={cls} />,
    color: 'text-destructive',
    bgColor: 'bg-destructive/6',
    label: 'Failed',
  },
}

const FALLBACK_CFG = {
  icon: (cls: string) => <Loader2 className={cls} />,
  color: 'text-fg-ghost',
  bgColor: 'bg-transparent',
  label: '',
}

function fmtTime(iso: string): string {
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
}

// ── ActivityRow ───────────────────────────────────────────────────────────────

export function ActivityRow({ activity }: { activity: AnyActivity }): ReactNode {
  const cfg = ACTIVITY_CFG[activity.type] ?? FALLBACK_CFG
  const label = cfg.label || activity.type.replace(/([A-Z])/g, ' $1').trim()
  const artifacts = isProgress(activity) ? activity.artifacts : []

  return (
    <div className={cn('rounded-xl border border-hair p-3 space-y-2.5', cfg.bgColor)}>
      {/* header */}
      <div className="flex items-center gap-2">
        <span className={cfg.color}>{cfg.icon('w-3.5 h-3.5')}</span>
        <span className={cn('text-xxs font-semibold', cfg.color)}>{label}</span>
        {activity.originator && activity.originator !== 'agent' && (
          <span className="text-3xs text-fg-ghost capitalize ml-0.5">· {activity.originator}</span>
        )}
        <time className="ml-auto text-3xs font-mono text-fg-ghost">{fmtTime(activity.createTime)}</time>
      </div>

      {/* body */}
      {activity.type === 'planGenerated' && activity.plan.steps.length > 0 && (
        <ol className="space-y-1.5 pl-1">
          {activity.plan.steps.map((s, i) => (
            <li key={s.id} className="flex gap-2.5 text-2xs">
              <span className="font-mono text-fg-ghost shrink-0 tabular-nums w-4 text-right">{String(i + 1)}.</span>
              <div className="min-w-0">
                <span className="text-fg-secondary font-medium">{s.title}</span>
                {s.description && (
                  <span className="text-fg-ghost ml-1.5">{s.description}</span>
                )}
              </div>
            </li>
          ))}
        </ol>
      )}

      {activity.type === 'progressUpdated' && (
        <div className="space-y-2">
          <p className="text-xxs text-fg-secondary">{activity.title}</p>
          {activity.description && activity.description !== activity.title && (
            <p className="text-2xs text-fg-muted">{activity.description}</p>
          )}
        </div>
      )}

      {(activity.type === 'agentMessaged' || activity.type === 'userMessaged') && (
        <p className="text-xxs text-fg-primary leading-relaxed whitespace-pre-wrap pl-5">
          {activity.message}
        </p>
      )}

      {activity.type === 'sessionFailed' && activity.reason && (
        <p className="text-xxs text-destructive pl-5">{activity.reason}</p>
      )}

      {artifacts.length > 0 && (
        <div className="space-y-2 pt-0.5">
          {artifacts.map((a, i) => <ArtifactItem key={i} artifact={a} />)}
        </div>
      )}
    </div>
  )
}

// ── StateDot ──────────────────────────────────────────────────────────────────

const STATE_CFG: Record<SessionState, { dot: string; label: string }> = {
  unspecified:           { dot: 'bg-fg-ghost',                  label: 'Unknown'        },
  queued:                { dot: 'bg-fg-dim',                    label: 'Queued'         },
  planning:              { dot: 'bg-blue-400 animate-pulse',    label: 'Planning'       },
  awaitingPlanApproval:  { dot: 'bg-yellow-400',                label: 'Needs approval' },
  awaitingUserFeedback:  { dot: 'bg-orange-400',                label: 'Waiting'        },
  inProgress:            { dot: 'bg-emerald-400 animate-pulse', label: 'In progress'    },
  paused:                { dot: 'bg-fg-dim',                    label: 'Paused'         },
  failed:                { dot: 'bg-destructive',               label: 'Failed'         },
  completed:             { dot: 'bg-emerald-500',               label: 'Done'           },
}

export function StateDot({ state }: { state: SessionState }): ReactNode {
  const { dot, label } = STATE_CFG[state]
  return (
    <span className="flex items-center gap-1.5 shrink-0">
      <span className={cn('h-1.5 w-1.5 rounded-full', dot)} />
      <span className="text-2xs text-fg-muted">{label}</span>
    </span>
  )
}
