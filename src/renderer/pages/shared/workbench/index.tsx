import {
  useState, useEffect, useRef, useCallback, type ReactNode,
} from 'react'
import {
  Zap, RefreshCw, Send, CheckCircle2, ExternalLink,
  AlertTriangle, XCircle, WifiOff, Sparkles,
} from 'lucide-react'
import { Button } from '@/ui/button'
import { ScrollArea } from '@/ui/scroll-area'
import { Separator } from '@/ui/separator'
import { cn } from '@/utils'
import { SERVER_URL } from '@api'
import type { components } from '@api'
import { useJules } from '@renderer/provider'
import { SessionForm } from './SessionForm'
import { SessionList } from './SessionList'
import { ActivityRow, StateDot } from './Feed'
import type {
  ApiSource, ApiSession, AnyActivity, SessionState,
  SessionFormValues, WsMsg, WsOutcome,
} from './types'

// ── useSessionStream ──────────────────────────────────────────────────────────

function useSessionStream(id: string | null, onMsg: (m: WsMsg) => void): void {
  const ref = useRef(onMsg)
  useEffect(() => { ref.current = onMsg }, [onMsg])
  useEffect(() => {
    if (!id) return
    const ws = new WebSocket(SERVER_URL.replace(/^http/, 'ws') + `/ws/sessions/${id}/stream`)
    ws.onmessage = (e: MessageEvent<string>) => {
      try { ref.current(JSON.parse(e.data) as WsMsg) } catch { /* ignore */ }
    }
    return () => { ws.close() }
  }, [id])
}

// ── helpers ───────────────────────────────────────────────────────────────────

function prFromOutcome(o: WsOutcome): { url: string; title?: string } | undefined {
  return o.pullRequest ?? undefined
}

// ── WorkbenchPage ─────────────────────────────────────────────────────────────

export default function WorkbenchPage(): ReactNode {
  const { api, connected, isLoading } = useJules()

  const [sources,      setSources]      = useState<ApiSource[]>([])
  const [sessions,     setSessions]     = useState<ApiSession[]>([])
  const [activeId,     setActiveId]     = useState<string | null>(null)
  const [activities,   setActivities]   = useState<AnyActivity[]>([])
  const [state,        setState]        = useState<SessionState>('unspecified')
  const [title,        setTitle]        = useState('')
  const [sessionUrl,   setSessionUrl]   = useState<string | undefined>()
  const [outcome,      setOutcome]      = useState<WsOutcome | null>(null)
  const [submitting,   setSubmitting]   = useState(false)
  const [msgDraft,     setMsgDraft]     = useState('')
  const [sendingMsg,   setSendingMsg]   = useState(false)
  const feedEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!connected) return
    void api.GET('/sources').then(({ data }) => { setSources(data?.sources ?? []) })
    void api.GET('/sessions').then(({ data }) => { setSessions(data?.sessions ?? []) })
  }, [api, connected])

  useEffect(() => {
    feedEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [activities])

  const handleWsMsg = useCallback((msg: WsMsg) => {
    if (msg.type === 'activity' || msg.type === 'update') {
      const a = msg.activity
      setActivities(prev => prev.some(x => x.id === a.id) ? prev : [...prev, a])
      const t = a.type
      if      (t === 'sessionCompleted')     setState('completed')
      else if (t === 'sessionFailed')        setState('failed')
      else if (t === 'awaitingPlanApproval') setState('awaitingPlanApproval')
      else if (t === 'awaitingUserFeedback') setState('awaitingUserFeedback')
      else if (t === 'planGenerated')        setState('planning')
      else if (t === 'progressUpdated')      setState('inProgress')
      else if (t === 'planApproved')         setState('inProgress')
    }
    if (msg.type === 'done') {
      setOutcome(msg.outcome)
      setState(msg.outcome.state)
      const pr = prFromOutcome(msg.outcome)
      if (pr) setSessionUrl(pr.url)
    }
  }, [])

  useSessionStream(activeId, handleWsMsg)

  function openSession(s: ApiSession) {
    setActiveId(s.id)
    setActivities([])
    setOutcome(null)
    setState(s.state)
    setTitle(s.title)
    setSessionUrl(s.url)
  }

  async function createSession(values: SessionFormValues) {
    setSubmitting(true)
    setActivities([])
    setOutcome(null)
    try {
      const body: components['schemas']['SessionConfig'] = {
        prompt: values.prompt,
        title:  values.prompt.slice(0, 60),
        requireApproval: values.requireApproval,
        autoPr:          values.autoPr,
      }
      if (values.github) body.source = { github: values.github, baseBranch: values.branch }
      const { data } = await api.POST('/sessions', { body })
      if (data === undefined) return
      setActiveId(data.id)
      setState(data.state)
      setTitle(values.prompt.slice(0, 60))
      setSessionUrl(data.url)
      setSessions(prev => [{
        id: data.id, title: values.prompt.slice(0, 60),
        state: data.state, createTime: new Date().toISOString(), updateTime: new Date().toISOString(),
      }, ...prev])
    } finally {
      setSubmitting(false)
    }
  }

  async function approve() {
    if (!activeId) return
    await api.POST('/sessions/{id}/approve', { params: { path: { id: activeId } } })
    setState('inProgress')
  }

  async function sendMessage() {
    if (!activeId || !msgDraft.trim()) return
    setSendingMsg(true)
    try {
      await api.POST('/sessions/{id}/messages', {
        params: { path: { id: activeId } },
        body:   { prompt: msgDraft.trim() },
      })
      setMsgDraft('')
    } finally {
      setSendingMsg(false)
    }
  }

  const done = state === 'completed' || state === 'failed'

  // ── loading ───────────────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full gap-2 text-fg-ghost">
        <RefreshCw className="w-4 h-4 animate-spin" />
        <span className="text-sm">Connecting…</span>
      </div>
    )
  }

  // ── layout ────────────────────────────────────────────────────────────────

  return (
    <div className="flex h-screen overflow-hidden bg-base">

      {/* ══ SIDEBAR ═══════════════════════════════════════════════════════════ */}
      <aside className="w-sidebar shrink-0 flex flex-col border-r border-hair bg-surface overflow-hidden">

        <div className="flex items-center gap-2.5 px-3.5 h-toolbar border-b border-hair shrink-0">
          <Zap className="w-4 h-4 text-yellow-400 shrink-0" />
          <span className="text-sm font-semibold text-fg-primary flex-1 tracking-tight">Workbench</span>
          {!connected && <WifiOff className="w-3.5 h-3.5 text-destructive shrink-0" />}
        </div>

        <ScrollArea className="flex-1 min-h-0">

          {/* new session */}
          <div className="px-3.5 pt-3.5 pb-1">
            <span className="label-mono text-fg-ghost">New session</span>
          </div>
          <SessionForm
            sources={sources}
            disabled={submitting || !connected}
            onSubmit={v => { void createSession(v) }}
          />

          <div className="px-3.5">
            <Separator />
          </div>

          {/* history */}
          <div className="px-3.5 pt-3 pb-1 flex items-center gap-2">
            <span className="label-mono text-fg-ghost flex-1">History</span>
            {sessions.length > 0 && (
              <span className="text-3xs font-mono text-fg-ghost">{String(sessions.length)}</span>
            )}
          </div>
          <SessionList sessions={sessions} activeId={activeId} onSelect={openSession} />

        </ScrollArea>
      </aside>

      {/* ══ MAIN ══════════════════════════════════════════════════════════════ */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">

        {activeId ? (
          <>
            {/* session header */}
            <div className="flex items-center gap-3 px-5 h-toolbar border-b border-hair shrink-0 bg-surface">
              <StateDot state={state} />
              <Separator orientation="vertical" className="h-4 shrink-0" />
              <span className="flex-1 text-sm font-medium text-fg-secondary truncate">{title}</span>
              {sessionUrl && (
                <a
                  href={sessionUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1.5 text-xs text-primary hover:text-primary/80 transition-colors shrink-0"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  View PR
                </a>
              )}
              {state === 'completed' && <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />}
              {state === 'failed'    && <XCircle      className="w-4 h-4 text-destructive shrink-0" />}
            </div>

            {/* feed */}
            <ScrollArea className="flex-1 min-h-0">
              <div className="px-5 py-5 space-y-2 max-w-2xl">

                {activities.length === 0 && !done && (
                  <div className="flex items-center gap-2.5 text-fg-ghost py-6">
                    <RefreshCw className="w-3.5 h-3.5 animate-spin shrink-0" />
                    <span className="text-xxs">Waiting for Jules…</span>
                  </div>
                )}

                {activities.map(a => <ActivityRow key={a.id} activity={a} />)}

                {/* outcome card */}
                {outcome != null && (
                  <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 px-4 py-3.5 space-y-2.5 mt-2">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      <span className="text-xxs font-semibold text-fg-primary">Session completed</span>
                    </div>
                    {(() => {
                      const pr = prFromOutcome(outcome)
                      return pr ? (
                        <a
                          href={pr.url}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center gap-1.5 text-xs text-primary hover:text-primary/80 transition-colors pl-6"
                        >
                          <ExternalLink className="w-3 h-3" />
                          {pr.title ?? pr.url}
                        </a>
                      ) : null
                    })()}
                  </div>
                )}

                <div ref={feedEndRef} />
              </div>
            </ScrollArea>

            {/* approve banner */}
            {state === 'awaitingPlanApproval' && (
              <div className="shrink-0 border-t border-yellow-500/20 bg-yellow-500/5 px-5 py-3 flex items-center gap-3">
                <AlertTriangle className="w-4 h-4 text-yellow-400 shrink-0" />
                <p className="flex-1 text-xxs text-fg-secondary">
                  Jules has a plan ready. Review the steps above and approve to continue.
                </p>
                <Button size="sm" onClick={() => { void approve() }}>
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Approve plan
                </Button>
              </div>
            )}

            {/* message bar */}
            {!done && (
              <div className={cn(
                'shrink-0 border-t border-hair bg-surface px-3.5 py-3',
                'flex items-end gap-2',
              )}>
                <textarea
                  rows={2}
                  value={msgDraft}
                  onChange={e => { setMsgDraft(e.target.value) }}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) { void sendMessage() }
                  }}
                  placeholder="Message Jules… (⌘↵ to send)"
                  className={cn(
                    'flex-1 resize-none bg-raised border border-hair rounded-lg',
                    'px-3 py-2 text-xxs text-fg-secondary outline-none leading-relaxed',
                    'focus:border-subtle placeholder:text-fg-ghost transition-colors',
                  )}
                />
                <Button
                  size="icon-sm"
                  variant="outline"
                  disabled={sendingMsg || !msgDraft.trim()}
                  onClick={() => { void sendMessage() }}
                >
                  {sendingMsg
                    ? <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    : <Send className="w-3.5 h-3.5" />}
                </Button>
              </div>
            )}
          </>
        ) : (
          /* empty state */
          <div className="flex-1 flex flex-col items-center justify-center gap-5 px-8 text-center">
            <div className="relative">
              <div className="w-16 h-16 rounded-2xl bg-surface border border-hair flex items-center justify-center">
                <Sparkles className="w-7 h-7 text-yellow-400" />
              </div>
            </div>
            <div className="space-y-1.5">
              <p className="text-sm font-semibold text-fg-secondary tracking-tight">
                {connected ? 'Ready' : 'Server offline'}
              </p>
              <p className="text-xs text-fg-ghost max-w-xs leading-relaxed">
                {connected
                  ? 'Pick a repo, write a prompt, and let Jules handle the rest.'
                  : 'Run npm run dev:server to start the Jules sidecar, then refresh.'}
              </p>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
