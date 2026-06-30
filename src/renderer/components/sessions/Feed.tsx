import {useState} from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import {Check, Send} from 'lucide-react'
import {jules} from '@jules'
import type {Activity, CachedSession} from './types.ts'
import {relativeTime, useActivities} from '.'

interface Props {
    session: CachedSession
}

function ActivityRow({act, sessionId, isAwaitingApproval, planApproved}: {
    act: Activity
    sessionId: string
    isAwaitingApproval: boolean
    planApproved: boolean
}) {
    const [approving, setApproving] = useState(false)

    switch (act.type) {
        case 'progressUpdated': {
            return (
                <div className="space-y-1">
                    <div className="flex items-baseline gap-2 text-xs font-mono text-fg-dim">
                        <span className="text-fg-ghost shrink-0">{relativeTime(act.createTime)}</span>
                        {act.title && <span className="text-fg-primary">{act.title}</span>}
                        {act.description && <span className="text-fg-ghost truncate">{act.description}</span>}
                    </div>
                    {act.artifacts?.map((artifact, i) => {
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
            const cs = act.artifacts?.find(a => a.type === 'changeSet')
            return (
                <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 px-3 py-2 space-y-0.5">
                    <div className="text-xs font-mono text-emerald-400">✓ done</div>
                    {cs?.type === 'changeSet' && cs.gitPatch.suggestedCommitMessage && (
                        <div className="text-[10px] text-emerald-400/60 pl-3">{cs.gitPatch.suggestedCommitMessage}</div>
                    )}
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


export function Feed({session}: Props) {
    const activities = useActivities(session.id)
    const [input, setInput] = useState('')
    const [sending, setSending] = useState(false)
    const isAwaitingApproval = session.state === 'awaitingPlanApproval'
    const planApproved = activities.some(a => a.type === 'planApproved')

    const handleSend = async () => {
        if (!input.trim() || sending) return
        setSending(true)
        try {
            await jules.session(session.id).send(input.trim())
            setInput('')
        } finally {
            setSending(false)
        }
    }

    return (
        <div className="flex h-full flex-col">
            <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
                {activities.map(act => (
                    <ActivityRow
                        key={act.id}
                        act={act}
                        sessionId={session.id}
                        isAwaitingApproval={isAwaitingApproval}
                        planApproved={planApproved}
                    />
                ))}
            </div>

            <footer className="border-t border-hair p-3 flex gap-2 items-end">
                <textarea
                    value={input}
                    onChange={e => {
                        setInput(e.target.value)
                    }}
                    onKeyDown={e => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault()
                            void handleSend()
                        }
                    }}
                    disabled={sending}
                    rows={1}
                    className="flex-1 resize-none bg-surface-raised border border-hair rounded px-3 py-2 text-sm text-fg-primary outline-none placeholder:text-fg-ghost max-h-32 min-h-[36px]"
                />
                <button
                    onClick={() => {
                        void handleSend()
                    }}
                    disabled={!input.trim() || sending}
                    className="flex h-9 w-9 items-center justify-center rounded bg-indigo-600 hover:bg-indigo-500 text-white transition-colors disabled:opacity-30 shrink-0"
                >
                    <Send className="h-4 w-4"/>
                </button>
            </footer>
        </div>
    )
}
