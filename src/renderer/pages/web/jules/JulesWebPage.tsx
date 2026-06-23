import { useState, useEffect, useRef, useMemo, useCallback, type ReactNode } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Send, Plus, Search, CheckCircle2, XCircle, RefreshCw, X, FileCode2, Terminal } from 'lucide-react'
import { jules as _jules } from 'modjules/browser'
import type {
    Activity,
    ActivityProgressUpdated,
    SessionResource,
    Outcome,
} from 'modjules/browser'

// ── client ────────────────────────────────────────────────────────────────────

const jules = _jules.with({
    apiKey_TEST_ONLY_DO_NOT_USE_IN_PRODUCTION: import.meta.env['JULES_API_KEY'] as string | undefined,
})

// ── types ─────────────────────────────────────────────────────────────────────

interface ParsedFile { path: string; changeType: string; additions: number; deletions: number }

// ── helpers ───────────────────────────────────────────────────────────────────

function mergeActivity(list: Activity[], next: Activity): Activity[] {
    const idx = list.findIndex(a => a.id === next.id)
    if (idx >= 0) { const out = [...list]; out[idx] = next; return out }
    return [...list, next]
}

function stateColor(state: SessionResource['state']): string {
    switch (state) {
        case 'completed':            return 'bg-green-500'
        case 'failed':               return 'bg-red-500'
        case 'planning':
        case 'inProgress':           return 'bg-blue-500 animate-pulse'
        case 'awaitingPlanApproval':
        case 'awaitingUserFeedback': return 'bg-amber-500'
        default:                     return 'bg-fg-ghost'
    }
}

function stateBadge(state: SessionResource['state']): string {
    switch (state) {
        case 'completed':            return 'bg-green-500/15 text-green-400'
        case 'failed':               return 'bg-red-500/15 text-red-400'
        case 'planning':
        case 'inProgress':           return 'bg-blue-500/15 text-blue-400'
        case 'awaitingPlanApproval':
        case 'awaitingUserFeedback': return 'bg-amber-500/15 text-amber-400'
        default:                     return 'bg-fg-ghost/15 text-fg-dim'
    }
}

function fmtDate(s: string): string {
    try {
        const d = new Date(s)
        if (isNaN(d.getTime())) return ''
        return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
    } catch { return '' }
}

function parseArtifacts(act: ActivityProgressUpdated): { changeset: ParsedFile[]; bash: { text: string; exitCode: number | null | undefined }[] } {
    const changeset: ParsedFile[] = []
    const bash: { text: string; exitCode: number | null | undefined }[] = []
    for (const art of act.artifacts ?? []) {
        if (art.type === 'changeSet') {
            try { changeset.push(...art.parsed().files) } catch { /* skip */ }
        }
        if (art.type === 'bashOutput') {
            try { bash.push({ text: art.toString(), exitCode: art.exitCode }) } catch { /* skip */ }
        }
    }
    return { changeset, bash }
}

// ── main ──────────────────────────────────────────────────────────────────────

export default function JulesWebPage(): ReactNode {
    const [sessions, setSessions]       = useState<SessionResource[]>([])
    const [selectedId, setSelectedId]   = useState<string | null>(null)
    const [activities, setActivities]   = useState<Record<string, Activity[]>>({})
    const [outcomes, setOutcomes]       = useState<Record<string, Outcome>>({})
    const [searchQuery, setSearchQuery] = useState('')
    const [showNewForm, setShowNewForm] = useState(false)
    const [newPrompt, setNewPrompt]     = useState('')
    const [isCreating, setIsCreating]   = useState(false)
    const [messageText, setMessageText] = useState('')
    const [isSending, setIsSending]     = useState(false)
    const [approvingId, setApprovingId] = useState<string | null>(null)
    const [streamError, setStreamError] = useState<Record<string, string>>({})

    const bottomRef  = useRef<HTMLDivElement>(null)
    const streamRef  = useRef<AsyncIterator<Activity> | null>(null)

    // ── sessions ──────────────────────────────────────────────────────────────

    const fetchSessions = useCallback(async () => {
        try {
            const list = await jules.sessions().all()
            setSessions(list)
        } catch (e) { console.error('[jules] sessions:', e) }
    }, [])

    useEffect(() => {
        void fetchSessions()
        const t = setInterval(() => { void fetchSessions() }, 5000)
        return () => { clearInterval(t); }
    }, [fetchSessions])

    // ── stream ────────────────────────────────────────────────────────────────

    useEffect(() => {
        if (streamRef.current) {
            void streamRef.current.return?.()
            streamRef.current = null
        }
        if (!selectedId) return

        const sid = selectedId
        let cancelled = false

        async function run() {
            const session = jules.session(sid)
            const iter = session.stream()[Symbol.asyncIterator]()
            streamRef.current = iter
            try {
                while (true) {
                    const { value, done } = await iter.next()
                    if (done || cancelled) break
                    setActivities(prev => ({ ...prev, [sid]: mergeActivity(prev[sid] ?? [], value) }))
                    if (value.type === 'sessionCompleted' || value.type === 'sessionFailed') {
                        if (value.type === 'sessionCompleted') {
                            try {
                                const outcome = await session.result()
                                setOutcomes(prev => ({ ...prev, [sid]: outcome }))
                            } catch { /* ignore */ }
                        }
                        break
                    }
                }
            } catch (e) {
                if (!cancelled) {
                    setStreamError(prev => ({ ...prev, [sid]: e instanceof Error ? e.message : String(e) }))
                }
            }
        }

        void run()
        return () => { cancelled = true; void streamRef.current?.return?.() }
    }, [selectedId])

    // ── scroll ────────────────────────────────────────────────────────────────

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, [activities, selectedId])

    // ── derived ───────────────────────────────────────────────────────────────

    const filteredSessions  = useMemo(() =>
        sessions.filter(s => (s.title ?? '').toLowerCase().includes(searchQuery.toLowerCase())),
        [sessions, searchQuery]
    )
    const selectedSession    = useMemo(() => sessions.find(s => s.id === selectedId) ?? null, [sessions, selectedId])
    const selectedActivities = selectedId ? (activities[selectedId] ?? []) : []
    const selectedOutcome    = selectedId ? outcomes[selectedId] : undefined
    const selectedError      = selectedId ? streamError[selectedId] : undefined
    const isPlanPending      = selectedSession?.state === 'awaitingPlanApproval'

    // ── actions ───────────────────────────────────────────────────────────────

    const handleCreate = async () => {
        if (!newPrompt.trim() || isCreating) return
        setIsCreating(true)
        try {
            const result = await jules.run({ prompt: newPrompt, title: newPrompt.slice(0, 50) })
            setNewPrompt('')
            setShowNewForm(false)
            await fetchSessions()
            setSelectedId(result.id)
        } catch (e) { console.error('[jules] run:', e) }
        finally { setIsCreating(false) }
    }

    const handleSend = async () => {
        if (!messageText.trim() || !selectedId || isSending) return
        setIsSending(true)
        const text = messageText
        setMessageText('')
        try {
            await jules.session(selectedId).send(text)
        } catch (e) { console.error('[jules] send:', e) }
        finally { setIsSending(false) }
    }

    const handleApprove = async () => {
        if (!selectedId || approvingId) return
        setApprovingId(selectedId)
        try {
            await jules.session(selectedId).approve()
            await fetchSessions()
        } catch (e) { console.error('[jules] approve:', e) }
        finally { setApprovingId(null) }
    }

    // ── render ────────────────────────────────────────────────────────────────

    return (
        <div className="flex h-full w-full bg-base overflow-hidden">

            {/* sidebar */}
            <div className="flex flex-col w-72 bg-surface shrink-0 overflow-hidden">
                <div className="px-4 py-3 shrink-0 flex items-center justify-between">
                    <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-fg-dim">Jules</span>
                    <div className="flex items-center gap-1">
                        <button onClick={() => { void fetchSessions() }} className="p-1 rounded hover:bg-hover text-fg-dim transition-colors cursor-pointer">
                            <RefreshCw className="h-3 w-3" />
                        </button>
                        <button onClick={() => { setShowNewForm(p => !p); }} className="p-1 rounded hover:bg-hover text-fg-dim transition-colors cursor-pointer">
                            <Plus className="h-3 w-3" />
                        </button>
                    </div>
                </div>

                {showNewForm && (
                    <div className="mx-2 mb-2 p-3 bg-raised rounded border border-hair flex flex-col gap-2 shrink-0">
                        <div className="flex items-center justify-between">
                            <span className="text-[9px] font-mono font-bold uppercase tracking-widest text-fg-dim">New session</span>
                            <button onClick={() => { setShowNewForm(false); }} className="text-fg-ghost hover:text-fg-dim cursor-pointer">
                                <X className="h-3 w-3" />
                            </button>
                        </div>
                        <textarea
                            value={newPrompt}
                            onChange={e => { setNewPrompt(e.target.value); }}
                            placeholder="What should Jules build?"
                            rows={3}
                            className="w-full p-2 text-xs bg-base text-fg-primary placeholder-fg-ghost rounded border border-hair focus:outline-none resize-none"
                        />
                        <button
                            onClick={() => { void handleCreate() }}
                            disabled={isCreating || !newPrompt.trim()}
                            className="w-full py-1.5 text-[10px] font-mono font-bold uppercase tracking-widest bg-selected hover:bg-hover text-fg-primary rounded border border-hair transition-colors disabled:opacity-40 cursor-pointer"
                        >
                            {isCreating ? 'Starting…' : 'Start'}
                        </button>
                    </div>
                )}

                <div className="px-2 pb-2 shrink-0">
                    <div className="flex items-center bg-raised rounded border border-hair px-2 py-1 gap-1.5">
                        <Search className="h-3 w-3 text-fg-ghost shrink-0" />
                        <input
                            value={searchQuery}
                            onChange={e => { setSearchQuery(e.target.value); }}
                            placeholder="Search…"
                            className="flex-1 bg-transparent text-xs text-fg-primary placeholder-fg-ghost focus:outline-none"
                        />
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto px-2 space-y-0.5">
                    {filteredSessions.map(s => (
                        <button
                            key={s.id}
                            onClick={() => { setSelectedId(s.id); }}
                            className={`w-full text-left px-3 py-2.5 rounded transition-colors flex flex-col gap-1 cursor-pointer ${selectedId === s.id ? 'bg-selected' : 'hover:bg-hover'}`}
                        >
                            <div className="flex items-start gap-2">
                                <span className="text-xs font-medium text-fg-primary truncate flex-1 leading-snug">{s.title ?? 'Untitled'}</span>
                                <div className={`w-1.5 h-1.5 rounded-full shrink-0 mt-1 ${stateColor(s.state)}`} />
                            </div>
                            <span className="text-[9px] font-mono text-fg-dim">{fmtDate(s.createTime)}</span>
                        </button>
                    ))}
                </div>
            </div>

            {/* main */}
            <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
                {selectedSession ? (
                    <>
                        <div className="px-5 py-3 bg-surface shrink-0 flex items-center gap-3">
                            <div className="flex-1 min-w-0">
                                <h2 className="text-sm font-semibold text-fg-primary truncate">{selectedSession.title ?? 'Untitled'}</h2>
                                <span className="text-[9px] font-mono text-fg-dim">{selectedSession.id}</span>
                            </div>
                            <span className={`text-[9px] font-mono font-bold uppercase tracking-widest px-2 py-0.5 rounded ${stateBadge(selectedSession.state)}`}>
                                {selectedSession.state}
                            </span>
                        </div>

                        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
                            {selectedError && (
                                <div className="text-xs text-red-400 font-mono px-3 py-2 bg-red-500/10 rounded border border-red-500/20">{selectedError}</div>
                            )}
                            {selectedActivities.map(act => (
                                <ActivityRow
                                    key={act.id}
                                    activity={act}
                                    isPlanPending={isPlanPending && act.type === 'planGenerated'}
                                    approvingId={approvingId}
                                    onApprove={handleApprove}
                                />
                            ))}
                            {selectedOutcome && <OutcomePanel outcome={selectedOutcome} />}
                            <div ref={bottomRef} />
                        </div>

                        <div className="px-5 py-3 bg-surface shrink-0">
                            <form
                                onSubmit={e => { e.preventDefault(); void handleSend() }}
                                className="flex items-end gap-2 bg-raised rounded border border-hair px-3 py-2"
                            >
                                <textarea
                                    value={messageText}
                                    onChange={e => { setMessageText(e.target.value); }}
                                    onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void handleSend() } }}
                                    placeholder="Message Jules…"
                                    rows={1}
                                    className="flex-1 bg-transparent text-xs text-fg-primary placeholder-fg-ghost focus:outline-none resize-none max-h-32"
                                />
                                <button type="submit" disabled={isSending || !messageText.trim()} className="p-1 text-fg-ghost hover:text-fg-secondary transition-colors disabled:opacity-40 cursor-pointer shrink-0">
                                    <Send className="h-3.5 w-3.5" />
                                </button>
                            </form>
                        </div>
                    </>
                ) : (
                    <div className="flex-1 flex items-center justify-center text-xs text-fg-dim font-mono">
                        select a session
                    </div>
                )}
            </div>
        </div>
    )
}

// ── activity row ──────────────────────────────────────────────────────────────

function ActivityRow({ activity: act, isPlanPending, approvingId, onApprove }: {
    activity: Activity
    isPlanPending: boolean
    approvingId: string | null
    onApprove: () => void
}): ReactNode {
    const isUser = act.originator === 'user'

    return (
        <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[82%] rounded-lg border text-xs px-3 py-2.5 space-y-1.5 ${isUser ? 'bg-purple-500/5 border-purple-500/15' : 'bg-surface border-hair'}`}>
                <div className="flex items-center gap-1.5 font-mono text-[9px] text-fg-dim">
                    <span className={isUser ? 'text-purple-400 font-bold' : 'text-blue-400 font-bold'}>
                        {isUser ? 'you' : 'jules'}
                    </span>
                    <span>·</span>
                    <span>{fmtDate(act.createTime)}</span>
                </div>

                {(act.type === 'agentMessaged' || act.type === 'userMessaged') && (
                    <div className="prose dark:prose-invert prose-xs max-w-none leading-relaxed break-words prose-p:my-0.5">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>{act.message}</ReactMarkdown>
                    </div>
                )}

                {act.type === 'planGenerated' && (
                    <PlanView plan={act.plan} isPending={isPlanPending} approvingId={approvingId} onApprove={onApprove} />
                )}

                {act.type === 'planApproved' && (
                    <div className="flex items-center gap-1.5 text-green-400">
                        <CheckCircle2 className="h-3 w-3 shrink-0" />
                        <span>Plan approved</span>
                    </div>
                )}

                {act.type === 'progressUpdated' && <ProgressView activity={act} />}

                {act.type === 'sessionCompleted' && (
                    <div className="flex items-center gap-1.5 text-green-400 font-mono text-[10px]">
                        <CheckCircle2 className="h-3 w-3 shrink-0" />
                        <span>Completed</span>
                    </div>
                )}

                {act.type === 'sessionFailed' && (
                    <div className="flex items-center gap-1.5 text-red-400 font-mono text-[10px]">
                        <XCircle className="h-3 w-3 shrink-0" />
                        <span>{act.reason ?? 'Session failed'}</span>
                    </div>
                )}
            </div>
        </div>
    )
}

// ── plan view ─────────────────────────────────────────────────────────────────

function PlanView({ plan, isPending, approvingId, onApprove }: {
    plan: { steps: { title: string; description?: string }[]; description?: string }
    isPending: boolean
    approvingId: string | null
    onApprove: () => void
}): ReactNode {
    return (
        <div className="space-y-2">
            {plan.description && <p className="text-fg-secondary text-xs leading-relaxed">{plan.description}</p>}
            <ul className="space-y-1">
                {plan.steps.map((step, i) => (
                    <li key={i} className="px-2.5 py-2 bg-raised rounded border border-hair flex flex-col gap-0.5">
                        <span className="font-semibold text-fg-primary text-[11px]">{i + 1}. {step.title}</span>
                        {step.description && <span className="text-[10px] text-fg-dim">{step.description}</span>}
                    </li>
                ))}
            </ul>
            {isPending && (
                <button
                    onClick={onApprove}
                    disabled={!!approvingId}
                    className="px-3 py-1.5 text-[10px] font-mono font-bold uppercase tracking-widest bg-selected hover:bg-hover text-fg-primary rounded border border-hair transition-colors disabled:opacity-50 cursor-pointer"
                >
                    {approvingId ? 'Approving…' : 'Approve Plan'}
                </button>
            )}
        </div>
    )
}

// ── progress view ─────────────────────────────────────────────────────────────

function ProgressView({ activity }: { activity: ActivityProgressUpdated }): ReactNode {
    const { changeset, bash } = parseArtifacts(activity)
    return (
        <div className="space-y-1.5">
            {activity.title && <div className="font-semibold text-fg-primary text-[11px]">{activity.title}</div>}
            {activity.description && <div className="text-[10px] text-fg-secondary leading-relaxed">{activity.description}</div>}
            {changeset.length > 0 && (
                <div className="space-y-0.5 pt-0.5">
                    {changeset.map(f => (
                        <div key={f.path} className="flex items-center gap-1.5 font-mono text-[9px]">
                            <FileCode2 className="h-3 w-3 text-fg-ghost shrink-0" />
                            <span className="text-fg-secondary truncate flex-1">{f.path}</span>
                            <span className="text-green-400">+{f.additions}</span>
                            <span className="text-red-400">-{f.deletions}</span>
                        </div>
                    ))}
                </div>
            )}
            {bash.map((b, i) => b.text ? (
                <div key={i} className="bg-black/40 rounded border border-hair px-2.5 py-2 font-mono text-[10px] text-green-300 whitespace-pre-wrap break-words max-h-32 overflow-y-auto">
                    <div className="text-[9px] text-fg-dim mb-1 flex items-center gap-1">
                        <Terminal className="h-2.5 w-2.5" />
                        <span>exit {b.exitCode ?? '?'}</span>
                    </div>
                    {b.text}
                </div>
            ) : null)}
        </div>
    )
}

// ── outcome panel ─────────────────────────────────────────────────────────────

function OutcomePanel({ outcome }: { outcome: Outcome }): ReactNode {
    const files = outcome.generatedFiles().all()
    const cs    = outcome.changeSet()
    return (
        <div className="bg-surface rounded-lg border border-hair px-4 py-3 space-y-2.5">
            <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-fg-dim">Result</span>
                <span className={`text-[9px] font-mono font-bold uppercase px-2 py-0.5 rounded ${outcome.state === 'completed' ? 'bg-green-500/15 text-green-400' : 'bg-red-500/15 text-red-400'}`}>
                    {outcome.state}
                </span>
            </div>
            {outcome.pullRequest && (
                <a href={outcome.pullRequest.url} target="_blank" rel="noreferrer" className="text-xs text-blue-400 hover:underline font-mono block truncate">
                    {outcome.pullRequest.url}
                </a>
            )}
            {files.length > 0 && (
                <div className="space-y-0.5">
                    {files.map(f => {
                        const tag = f.changeType === 'created' ? 'A' : f.changeType === 'deleted' ? 'D' : 'M'
                        const color = tag === 'A' ? 'text-green-400' : tag === 'D' ? 'text-red-400' : 'text-blue-400'
                        return (
                            <div key={f.path} className="flex items-center gap-2 font-mono text-[10px]">
                                <span className={`font-bold w-3 ${color}`}>{tag}</span>
                                <span className="text-fg-secondary truncate flex-1">{f.path}</span>
                                <span className="text-green-400">+{f.additions}</span>
                                <span className="text-red-400">-{f.deletions}</span>
                            </div>
                        )
                    })}
                    <div className="text-[9px] font-mono text-fg-dim pt-1">{files.length} file{files.length !== 1 ? 's' : ''} changed</div>
                </div>
            )}
            {cs && (
                <details className="group">
                    <summary className="text-[9px] font-mono text-fg-dim cursor-pointer hover:text-fg-secondary">raw diff</summary>
                    <pre className="mt-1.5 text-[9px] font-mono text-fg-dim bg-black/30 rounded p-2 overflow-x-auto max-h-48 whitespace-pre-wrap">
                        {cs.gitPatch.unidiffPatch.slice(0, 2000)}
                    </pre>
                </details>
            )}
        </div>
    )
}
