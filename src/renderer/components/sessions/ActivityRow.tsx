import {useState} from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import {Check} from 'lucide-react'
import type {ChangeSetArtifact, MediaArtifact} from '@jules'
import {jules} from '@jules'
import {type Activity, relativeTime} from './index.ts'
import {ChangeSetCard, MediaCard} from './artifacts/index.ts'

export function ActivityRow({act, sessionId, isAwaitingApproval, planApproved}: {
    act: Activity
    sessionId: string
    isAwaitingApproval: boolean
    planApproved: boolean
}) {
    const [approving, setApproving] = useState(false)

    switch (act.type) {
        // ── progress · timestamp + title + description + bash/changeSet/media artifacts
        case 'progressUpdated': {
            const media = act.artifacts.filter((a): a is MediaArtifact => a.type === 'media')
            const changeSet = act.artifacts.find((a): a is ChangeSetArtifact => a.type === 'changeSet')
            return (
                <div className="space-y-1">
                    <div className="flex items-baseline gap-2 text-xs font-mono text-fg-dim">
                        <span className="text-fg-ghost shrink-0">{relativeTime(act.createTime)}</span>
                        {act.title && <span className="text-fg-primary">{act.title}</span>}
                        {act.description && <span className="text-fg-ghost truncate">{act.description}</span>}
                    </div>
                    {act.artifacts.map((artifact, i) => {
                        if (artifact.type !== 'bashOutput') return null
                        const out = artifact.stdout || artifact.stderr
                        if (!out) return null
                        return (
                            <pre key={i}
                                 className="text-[10px] font-mono text-fg-ghost bg-raised border border-hair rounded px-2 py-1 overflow-x-auto whitespace-pre-wrap">
                                <span className="text-fg-dim">$ {artifact.command}</span>{'\n'}{out.trim()}
                            </pre>
                        )
                    })}
                    {changeSet && <ChangeSetCard artifact={changeSet} media={media}/>}
                    {media.map((m, i) => <MediaCard key={i} artifact={m}/>)}
                </div>
            )
        }

        case 'planGenerated': {
            const handleApprove = async () => {
                if (approving) return
                setApproving(true)
                try {
                    await jules.session(sessionId).approve()
                } finally {
                    setApproving(false)
                }
            }
            return (
                <div className="rounded-lg border border-indigo-500/20 bg-indigo-500/5 px-3 py-2.5 space-y-2">
                    <ol className="space-y-1.5">
                        {act.plan.steps.map((step, i) => (
                            <li key={step.id} className="flex gap-2 text-xs">
                                <span
                                    className="text-indigo-400/60 shrink-0 tabular-nums font-mono">{(step.index ?? i) + 1}.</span>
                                <div>
                                    <span className="text-fg-primary font-medium">{step.title}</span>
                                    {step.description &&
                                        <p className="text-fg-dim mt-0.5 text-[11px]">{step.description}</p>}
                                </div>
                            </li>
                        ))}
                    </ol>
                    {isAwaitingApproval && !planApproved && (
                        <button
                            onClick={() => {
                                void handleApprove()
                            }}
                            disabled={approving}
                            className="flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-mono uppercase tracking-wider rounded-md bg-indigo-600 hover:bg-indigo-500 text-fg-primary transition-colors disabled:opacity-40"
                        >
                            <Check className="h-3 w-3"/>
                            Approve
                        </button>
                    )}
                </div>
            )
        }

        case 'planApproved': {
            return (
                <div
                    className="flex items-center gap-1.5 text-[10px] font-mono text-emerald-400 rounded-md border border-emerald-500/15 bg-emerald-500/5 px-2.5 py-1.5 w-fit">
                    <Check className="h-3 w-3"/>
                    plan approved
                </div>
            )
        }

        case 'sessionCompleted': {
            const cs = act.artifacts.find((a): a is ChangeSetArtifact => a.type === 'changeSet')
            const media = act.artifacts.filter((a): a is MediaArtifact => a.type === 'media')
            return (
                <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 px-3 py-2 space-y-1.5">
                    <div className="text-xs font-mono text-emerald-400">✓ done</div>
                    {cs && <ChangeSetCard artifact={cs} media={media}/>}
                    {media.map((m, i) => <MediaCard key={i} artifact={m}/>)}
                </div>
            )
        }

        case 'sessionFailed': {
            return (
                <div className="rounded-lg border border-red-500/20 bg-red-500/5 px-3 py-2 space-y-0.5">
                    <div className="text-xs font-mono text-red-400">✗ failed</div>
                    {act.reason &&
                        <div className="text-[10px] text-red-400/70 whitespace-pre-wrap pl-3">{act.reason}</div>}
                </div>
            )
        }

        case 'userMessaged':
        case 'agentMessaged': {
            const isUser = act.originator === 'user'
            return (
                <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[80%] rounded-lg px-3 py-2 text-sm border ${
                        isUser
                            ? 'bg-purple-500/10 border-purple-500/20 text-fg-primary'
                            : 'bg-blue-500/5 border-blue-500/15 text-fg-primary'
                    }`}>
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>{act.message}</ReactMarkdown>
                    </div>
                </div>
            )
        }

        default: {
            const fallbackAct = act as { type: string; createTime: string }
            return (
                <div className="text-[10px] font-mono text-fg-ghost">
                    {fallbackAct.type} — {relativeTime(fallbackAct.createTime)}
                </div>
            )
        }
    }
}
