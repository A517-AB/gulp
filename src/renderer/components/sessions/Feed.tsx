import {useEffect, useRef, useState} from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import {Check, Send} from 'lucide-react'
import type {Activity, CachedSession} from './types.ts'
import {relativeTime, syncFeed, useActivities} from '.'

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

    if (act.type === 'progressUpdated') {
        return (
            <div className="space-y-1">
                <div className="flex items-baseline gap-2 text-xs font-mono text-fg-dim">
                    <span className="text-fg-ghost shrink-0">{relativeTime(act.createTime)}</span>
                    <span className="text-fg-primary">{act.title}</span>
                    {act.description && <span className="text-fg-ghost truncate">{act.description}</span>}
                </div>
                {act.artifacts.map((artifact, i) => {
                    if (artifact.type !== 'bashOutput') return null
                    const out = artifact.stdout || artifact.stderr
                    if (!out) return null
                    return (
                        <pre key={i}
                             className="text-[10px] font-mono text-fg-ghost bg-black/30 rounded px-2 py-1 overflow-x-auto whitespace-pre-wrap">
                            <span className="text-fg-dim">$ {artifact.command}</span>{'\n'}{out.trim()}
                        </pre>
                    )
                })}
            </div>
        )
    }

    if (act.type === 'planGenerated') {
        const handleApprove = async () => {
            if (approving) return
            setApproving(true)
            try {
                await window.jules?.cache.approve(sessionId)
            } finally {
                setApproving(false)
            }
        }
        return (
            <div className="rounded border border-hair bg-surface px-3 py-2 space-y-2">
                <ol className="space-y-1">
                    {act.plan.steps.map(step => (
                        <li key={step.id} className="flex gap-2 text-xs">
                            <span className="text-fg-ghost shrink-0 tabular-nums">{step.index + 1}.</span>
                            <div>
                                <span className="text-fg-primary font-medium">{step.title}</span>
                                {step.description && <span className="text-fg-dim ml-1.5">{step.description}</span>}
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
                        className="flex items-center gap-1 px-2 py-1 text-[10px] font-mono uppercase tracking-wider rounded bg-indigo-600 hover:bg-indigo-500 text-white transition-colors disabled:opacity-40"
                    >
                        <Check className="h-3 w-3"/>
                        Approve
                    </button>
                )}
            </div>
        )
    }

    if (act.type === 'planApproved') {
        return (
            <div className="text-[10px] font-mono text-indigo-400 flex items-center gap-1.5">
                <Check className="h-3 w-3"/>
                plan approved
            </div>
        )
    }

    if (act.type === 'sessionCompleted') {
        const cs = act.artifacts.find(a => a.type === 'changeSet')
        return (
            <div className="text-xs font-mono text-emerald-400 space-y-0.5">
                <div>✓ done</div>
                {cs?.type === 'changeSet' && cs.gitPatch.suggestedCommitMessage && (
                    <div className="text-[10px] text-emerald-400/60 pl-3">{cs.gitPatch.suggestedCommitMessage}</div>
                )}
            </div>
        )
    }

    if (act.type === 'sessionFailed') {
        return (
            <div className="text-xs font-mono text-red-400 space-y-0.5">
                <div>✗ failed</div>
                {act.reason && <div className="text-[10px] text-red-400/70 whitespace-pre-wrap pl-3">{act.reason}</div>}
            </div>
        )
    }

    if (act.type === 'userMessaged' || act.type === 'agentMessaged') {
        const isUser = act.originator === 'user'
        return (
            <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[80%] rounded-lg px-3 py-2 text-sm ${
                    isUser
                        ? 'bg-indigo-600/20 border border-indigo-500/25 text-fg-primary'
                        : 'bg-surface border border-hair text-fg-primary'
                }`}>
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{act.message}</ReactMarkdown>
                </div>
            </div>
        )
    }

    return (
        <div className="text-[10px] font-mono text-fg-ghost">
            {act.type} — {relativeTime(act.createTime)}
        </div>
    )
}

export function Feed({session}: Props) {
    const activities = useActivities(session.id)
    const [input, setInput] = useState('')
    const [sending, setSending] = useState(false)
    const bottomRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        const id = setInterval(() => {
            void syncFeed(session.id)
        }, 4000)
        return () => clearInterval(id)
    }, [session.id])

    useEffect(() => {
        bottomRef.current?.scrollIntoView({behavior: 'smooth'})
    }, [activities.length])

    const isAwaitingApproval = session.state === 'awaitingPlanApproval'
    const planApproved = activities.some(a => a.type === 'planApproved')

    const handleSend = async () => {
        if (!input.trim() || sending) return
        setSending(true)
        try {
            await window.jules?.cache.send(session.id, input.trim())
            setInput('')
            await syncFeed(session.id)
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
                <div ref={bottomRef}/>
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
