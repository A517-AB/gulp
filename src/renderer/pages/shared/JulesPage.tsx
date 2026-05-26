import {
  useState, useEffect, useRef, useCallback, useMemo, type ReactNode,
} from 'react'
import { RefreshCw, Send, CheckCircle2, AlertTriangle } from 'lucide-react'
import { useJules } from '@renderer/lib/jules/provider'
import type { Source, Session, Activity } from '@/types/jules'
import { cn } from '@/utils'

// ── helpers ───────────────────────────────────────────────────────────────────

function statusColor(status: Session['status']) {
  switch (status) {
    case 'active':    return 'text-emerald-400'
    case 'completed': return 'text-blue-400'
    case 'failed':    return 'text-red-400'
    case 'paused':    return 'text-yellow-400'
    default:          return 'text-fg-ghost'
  }
}

function filterActivities(list: Activity[]): Activity[] {
  return list.filter(a => {
    if (a.bashOutput || a.diff) return true
    const c = a.content.trim()
    if (!c) return false
    if (c === '{}' || c === '[]') return false
    if (/^\[[\w,\s]+\]$/.test(c)) return false
    try {
      const p = JSON.parse(c) as unknown
      if (typeof p === 'object' && p !== null && !Array.isArray(p) && Object.keys(p).length === 0) return false
      if (Array.isArray(p) && p.length === 0) return false
    } catch { /* not json */ }
    return true
  })
}

// ── JulesPage ─────────────────────────────────────────────────────────────────

export default function JulesPage(): ReactNode {
  const { client } = useJules()

  const [sources,       setSources]       = useState<Source[]>([])
  const [sessions,      setSessions]      = useState<Session[]>([])
  const [activeSession, setActiveSession] = useState<Session | null>(null)
  const [activities,    setActivities]    = useState<Activity[]>([])
  const [loadingActs,   setLoadingActs]   = useState(false)
  const [error,         setError]         = useState<string | null>(null)

  // form state
  const [sourceId,   setSourceId]   = useState('')
  const [branch,     setBranch]     = useState('')
  const [prompt,     setPrompt]     = useState('')
  const [submitting, setSubmitting] = useState(false)

  // message bar
  const [msgDraft,   setMsgDraft]   = useState('')
  const [sendingMsg, setSendingMsg] = useState(false)
  const [approvingPlan, setApprovingPlan] = useState(false)

  const feedEndRef = useRef<HTMLDivElement>(null)

  // ── load sources + sessions ─────────────────────────────────────────────────

  useEffect(() => {
    if (!client) return
    void client.listSources().then(setSources).catch((e: unknown) => { console.error('[JulesPage] sources error', e) })
    void client.listSessions().then(setSessions).catch((e: unknown) => { console.error('[JulesPage] sessions error', e) })
  }, [client])

  // ── scroll to bottom ────────────────────────────────────────────────────────

  useEffect(() => {
    feedEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [activities])

  // ── activity polling ────────────────────────────────────────────────────────

  const loadActivities = useCallback(async (isInitial: boolean) => {
    if (!client || !activeSession) return
    if (isInitial) setLoadingActs(true)
    setError(null)
    try {
      const data = await client.listActivities(activeSession.id)
      setActivities(prev => {
        if (isInitial || prev.length === 0) return data
        const pending = prev.filter(p => p.id === 'pending')
        const stillPending = pending.filter(p => !data.some(d => d.content === p.content))
        const nonPending = prev.filter(p => p.id !== 'pending')
        
        const newOnes = data.filter(a => !nonPending.some(p => p.id === a.id))
        
        if (newOnes.length > 0 || stillPending.length !== pending.length) {
          return [...nonPending, ...newOnes, ...stillPending].sort((a, b) => 
            new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
          )
        }
        return prev
      })
    } catch (e) {
      console.error('[JulesPage] activities error', e)
      if (isInitial) setError(e instanceof Error ? e.message : 'Failed to load')
    } finally {
      if (isInitial) setLoadingActs(false)
    }
  }, [client, activeSession])

  useEffect(() => {
    if (!activeSession) return
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadActivities(true)
    if (activeSession.status !== 'active') return
    const t = setInterval(() => { void loadActivities(false) }, 5000)
    return () => { clearInterval(t) }
  }, [activeSession, loadActivities])

  // ── select session ──────────────────────────────────────────────────────────

  function selectSession(s: Session) {
    setActiveSession(s)
    setActivities([])
    setError(null)
  }

  // ── create session ──────────────────────────────────────────────────────────

  async function createSession() {
    if (!client || !sourceId || !prompt.trim()) return
    setSubmitting(true)
    setError(null)
    try {
      const rawSess = await client.createSession({
        sourceId,
        prompt: prompt.trim(),
        title: prompt.trim().slice(0, 60),
        startingBranch: branch || 'main',
      })
      const raw = rawSess as unknown as Record<string, unknown>
      const statusValue = raw.status ?? (
        raw.state === 'COMPLETED' ? 'completed' :
        raw.state === 'FAILED' ? 'failed' :
        raw.state === 'PAUSED' ? 'paused' : 'active'
      )
      // WORKAROUND: client.createSession returns an ApiSession instead of Session
      const sess: Session = {
        ...rawSess,
        status: statusValue as Session['status']
      }
      setSessions(prev => [sess, ...prev])
      setActiveSession(sess)
      setActivities([])
      setPrompt('')
    } catch (e) {
      console.error('[JulesPage] create error', e)
      setError(e instanceof Error ? e.message : 'Failed to create session')
    } finally {
      setSubmitting(false)
    }
  }

  // ── approve plan ────────────────────────────────────────────────────────────

  async function approvePlan() {
    if (!client || !activeSession || approvingPlan) return
    setApprovingPlan(true)
    try {
      await client.approvePlan(activeSession.id)
      setActiveSession(s => s ? { ...s, status: 'active' } : s)
      setTimeout(() => { void loadActivities(false) }, 1000)
    } catch (e) {
      console.error('[JulesPage] approve error', e)
    } finally {
      setApprovingPlan(false)
    }
  }

  // ── send message ────────────────────────────────────────────────────────────

  async function sendMessage() {
    if (!client || !activeSession || !msgDraft.trim()) return
    setSendingMsg(true)
    try {
      const act = await client.createActivity({ sessionId: activeSession.id, content: msgDraft.trim() })
      setActivities(prev => [...prev, act])
      setMsgDraft('')
      setTimeout(() => { void loadActivities(false) }, 2000)
    } catch (e) {
      console.error('[JulesPage] send error', e)
    } finally {
      setSendingMsg(false)
    }
  }

  // ── derived ─────────────────────────────────────────────────────────────────

  const filtered = useMemo(() => filterActivities(activities), [activities])

  const selectedSource = sources.find(s => s.id === sourceId)
  const branches: string[] = (() => {
    const meta = selectedSource?.metadata
    const repo = meta?.['githubRepo'] as Record<string, unknown> | undefined
    const list = repo?.['branches'] as { displayName?: string }[] | undefined
    return list?.map(b => b.displayName ?? '').filter(Boolean) ?? []
  })()

  const hasPlan = filtered.some(a =>
    a.type === 'plan' && activeSession?.status === 'active'
  )
  const done = activeSession?.status === 'completed' || activeSession?.status === 'failed'


  // ── layout ───────────────────────────────────────────────────────────────────

  return (
    <div className="flex h-screen overflow-hidden bg-base">

      {/* ── SIDEBAR ──────────────────────────────────────────────────────────── */}
      <aside className="w-64 shrink-0 flex flex-col border-r border-hair bg-surface overflow-hidden">

        <div className="px-3.5 py-2.5 border-b border-hair shrink-0">
          <span className="text-xs font-semibold text-fg-primary tracking-tight">Jules</span>
        </div>

        {/* new session form */}
        <div className="px-3 py-3 border-b border-hair shrink-0 space-y-2">
          <span className="text-3xs font-mono uppercase tracking-widest text-fg-ghost">New session</span>

          <select
            value={sourceId}
            onChange={e => { setSourceId(e.target.value); setBranch('') }}
            className="w-full bg-raised border border-hair rounded-md px-2 py-1.5 text-xs text-fg-primary outline-none"
          >
            <option value="">Select repo…</option>
            {sources.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>

          {branches.length > 0 && (
            <select
              value={branch}
              onChange={e => { setBranch(e.target.value) }}
              className="w-full bg-raised border border-hair rounded-md px-2 py-1.5 text-xs text-fg-primary outline-none"
            >
              <option value="">Branch (main)</option>
              {branches.map(b => <option key={b} value={b}>{b}</option>)}
            </select>
          )}

          <textarea
            rows={3}
            value={prompt}
            onChange={e => { setPrompt(e.target.value) }}
            placeholder="Describe the task…"
            className="w-full resize-none bg-raised border border-hair rounded-md px-2 py-1.5 text-xs text-fg-primary outline-none placeholder:text-fg-ghost focus:border-subtle"
          />

          <button
            onClick={() => { void createSession() }}
            disabled={submitting || !sourceId || !prompt.trim()}
            className="w-full py-1.5 text-xs font-medium bg-primary text-white rounded-md hover:bg-primary/80 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {submitting ? 'Starting…' : 'Start session'}
          </button>

          {error && <p className="text-3xs text-red-400 font-mono">{error}</p>}
        </div>

        {/* session list */}
        <div className="flex-1 overflow-y-auto">
          {sessions.length === 0
            ? <p className="px-3.5 py-3 text-3xs text-fg-ghost font-mono">No sessions yet</p>
            : sessions.map(s => (
              <button
                key={s.id}
                onClick={() => { selectSession(s) }}
                className={cn(
                  'w-full text-left px-3.5 py-2.5 border-b border-hair transition-colors',
                  activeSession?.id === s.id
                    ? 'bg-active'
                    : 'hover:bg-hover',
                )}
              >
                <p className="text-xs text-fg-primary truncate">{s.title || 'Untitled'}</p>
                <p className={cn('text-3xs font-mono', statusColor(s.status))}>{s.status}</p>
              </button>
            ))
          }
        </div>
      </aside>

      {/* ── MAIN ─────────────────────────────────────────────────────────────── */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">

        {activeSession ? (
          <>
            {/* header */}
            <div className="flex items-center gap-3 px-5 py-2.5 border-b border-hair shrink-0 bg-surface">
              <span className={cn('text-3xs font-mono font-bold', statusColor(activeSession.status))}>
                {activeSession.status.toUpperCase()}
              </span>
              <span className="flex-1 text-sm font-medium text-fg-secondary truncate">
                {activeSession.title || 'Untitled'}
              </span>
            </div>

            {/* feed */}
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3 min-h-0">
              {loadingActs && (
                <div className="flex items-center gap-2 text-fg-ghost">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span className="text-xs">Loading…</span>
                </div>
              )}

              {!loadingActs && filtered.length === 0 && (
                <div className="flex items-center gap-2 text-fg-ghost py-4">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span className="text-xs">Waiting for Jules…</span>
                </div>
              )}

              {filtered.map(a => (
                <div key={a.id} className={cn('flex gap-2.5', a.role === 'user' ? 'flex-row-reverse' : '')}>
                  <div className={cn(
                    'w-5 h-5 rounded-full shrink-0 flex items-center justify-center text-3xs font-bold mt-0.5',
                    a.role === 'user' ? 'bg-purple-500 text-white' : 'bg-white text-black',
                  )}>
                    {a.role === 'user' ? 'U' : 'J'}
                  </div>
                  <div className={cn(
                    'flex-1 rounded-lg px-3 py-2.5 text-xs text-fg-primary border border-hair max-w-2xl',
                    a.role === 'user' ? 'bg-purple-500/10 border-purple-500/20' : 'bg-surface',
                  )}>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-3xs font-mono text-fg-ghost uppercase">{a.type}</span>
                    </div>
                    <p className="leading-relaxed whitespace-pre-wrap break-words">{a.content}</p>
                    {a.diff && (
                      <pre className="mt-2 text-3xs font-mono bg-raised border border-hair rounded p-2 overflow-x-auto max-h-48">
                        {a.diff}
                      </pre>
                    )}
                    {a.bashOutput && (
                      <pre className="mt-2 text-3xs font-mono bg-raised border border-hair rounded p-2 overflow-x-auto max-h-32 text-emerald-400">
                        {a.bashOutput}
                      </pre>
                    )}
                  </div>
                </div>
              ))}

              <div ref={feedEndRef} />
            </div>

            {/* plan approval banner */}
            {hasPlan && (
              <div className="shrink-0 border-t border-yellow-500/20 bg-yellow-500/5 px-5 py-3 flex items-center gap-3">
                <AlertTriangle className="w-4 h-4 text-yellow-400 shrink-0" />
                <p className="flex-1 text-xs text-fg-secondary">Plan ready — review activities above then approve.</p>
                <button
                  onClick={() => { void approvePlan() }}
                  disabled={approvingPlan}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-primary text-white rounded-md hover:bg-primary/80 disabled:opacity-40 transition-colors"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  {approvingPlan ? 'Approving…' : 'Approve'}
                </button>
              </div>
            )}

            {/* message bar */}
            {!done && (
              <div className="shrink-0 border-t border-hair bg-surface px-3.5 py-3 flex items-end gap-2">
                <textarea
                  rows={2}
                  value={msgDraft}
                  onChange={e => { setMsgDraft(e.target.value) }}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) { void sendMessage() }
                  }}
                  placeholder="Message Jules… (⌘↵ to send)"
                  className="flex-1 resize-none bg-raised border border-hair rounded-lg px-3 py-2 text-xs text-fg-primary outline-none placeholder:text-fg-ghost focus:border-subtle"
                />
                <button
                  onClick={() => { void sendMessage() }}
                  disabled={sendingMsg || !msgDraft.trim()}
                  className="p-2 border border-hair rounded-lg bg-raised hover:bg-hover disabled:opacity-40 transition-colors"
                >
                  {sendingMsg
                    ? <RefreshCw className="w-3.5 h-3.5 animate-spin text-fg-secondary" />
                    : <Send className="w-3.5 h-3.5 text-fg-secondary" />}
                </button>
              </div>
            )}
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-fg-ghost">
            <p className="text-sm">Select a session or start a new one</p>
          </div>
        )}
      </main>
    </div>
  )
}
