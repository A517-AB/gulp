import { useState, useRef, useEffect } from 'react'
import { useLoaderData, useSearchParams, useRevalidator } from 'react-router-dom'
import { RefreshCw, Send, Loader2, Plus } from 'lucide-react'
import type { SessionResource, ActivityPlanGenerated } from '@/types/jules-sdk'
import { getSessions, createSession, sendMessage } from '@api/sdk'
import { useSessionWs } from '@/hooks/use-session-ws'
import { usePresets } from '@/hooks/use-presets'
import { ActivityFeed } from '@/components/activity-feed'
import { SessionRow } from '@/components/session-row'
import { PlanApprovalBanner } from '@/components/plan-approval-banner'
import { GeneratedFileList } from '@/components/generated-file-list'
import { PresetPicker } from '@/components/preset-picker'
import { applyPreset } from '@/lib/presets'
import { cn } from '@/utils'

type Session = SessionResource
interface SessionsData { sessions: Session[] }

export async function loader(): Promise<SessionsData> {
  const sessions = await getSessions(50)
  console.log(`[sessions] loaded ${sessions.length} sessions`)
  return { sessions }
}

export default function SessionsPage() {
  const { sessions } = useLoaderData() as SessionsData
  const [searchParams, setSearchParams] = useSearchParams()
  const { revalidate, state } = useRevalidator()
  const { presets } = usePresets()

  const selectedId = searchParams.get('id')
  const selectedSession = sessions.find(s => s.id === selectedId) ?? null

  const { activities, status, outcome, error } = useSessionWs(selectedId)

  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [approvedAt, setApprovedAt] = useState<string | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const planActivity = activities.find((a): a is ActivityPlanGenerated => a.type === 'planGenerated')
  const isAwaitingApproval = selectedSession?.state === 'awaitingPlanApproval' && !approvedAt

  const isTerminal = selectedSession
    ? ['completed', 'failed', 'paused'].includes(selectedSession.state)
    : false

  useEffect(() => {
    setApprovedAt(null)
  }, [selectedId])

  async function send() {
    if (!selectedId || !input.trim() || sending) return
    setSending(true)
    console.log(`[sessions] sending message to session=${selectedId}`)
    try {
      await sendMessage(selectedId, input.trim())
      setInput('')
      textareaRef.current?.focus()
      console.log(`[sessions] message sent session=${selectedId}`)
    } catch (err) {
      console.error('[sessions] send failed', err)
    } finally {
      setSending(false)
    }
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      void send()
    }
  }

  async function startNewSession() {
    const prompt = input.trim()
    if (!prompt) return
    setSending(true)
    console.log('[sessions] creating new session')
    try {
      const { id } = await createSession({ prompt })
      setInput('')
      setSearchParams({ id })
      console.log(`[sessions] created session=${id}`)
      setTimeout(() => revalidate(), 500)
    } catch (err) {
      console.error('[sessions] create failed', err)
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="flex h-full">
      {/* ── Left panel: session list ── */}
      <div className="w-64 shrink-0 flex flex-col border-r border-hair bg-surface/30">
        <div className="flex items-center justify-between px-3 py-2.5 border-b border-hair">
          <span className="text-xs font-semibold text-fg-secondary">Sessions</span>
          <div className="flex items-center gap-1">
            <span className="text-[10px] text-fg-dim">{sessions.length}</span>
            <button
              type="button"
              onClick={revalidate}
              disabled={state === 'loading'}
              title="Refresh sessions"
              className="p-1 rounded hover:bg-hover text-fg-dim hover:text-fg-primary transition-colors"
            >
              <RefreshCw size={11} className={cn(state === 'loading' && 'animate-spin')} />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto divide-y divide-hair">
          {sessions.length === 0 ? (
            <p className="px-3 py-6 text-xs text-fg-dim text-center">No sessions yet</p>
          ) : (
            sessions.map(session => (
              <SessionRow
                key={session.id}
                session={session}
                selected={session.id === selectedId}
                onClick={() => setSearchParams({ id: session.id })}
              />
            ))
          )}
        </div>
      </div>

      {/* ── Right panel: activity + compose ── */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {selectedSession ? (
          <>
            {/* Session header */}
            <div className="shrink-0 flex items-center justify-between px-4 py-2.5 border-b border-hair bg-surface/20">
              <div className="min-w-0">
                <p className="text-sm font-medium text-fg-primary truncate">
                  {selectedSession.title || selectedSession.id}
                </p>
                <p className="text-[10px] text-fg-dim font-mono">{selectedSession.id}</p>
              </div>
              {selectedSession.url && (
                <a
                  href={selectedSession.url}
                  target="_blank"
                  rel="noreferrer"
                  className="shrink-0 text-[10px] text-fg-dim hover:text-fg-primary transition-colors"
                >
                  Jules ↗
                </a>
              )}
            </div>

            {/* Plan approval banner */}
            {isAwaitingApproval && (
              <PlanApprovalBanner
                sessionId={selectedId!}
                planActivity={planActivity}
                onApproved={() => setApprovedAt(new Date().toISOString())}
              />
            )}

            {/* Activity feed */}
            <ActivityFeed
              activities={activities}
              status={status}
              outcome={outcome}
              error={error}
            />

            {/* TODO: generatedFiles stripped over IPC — add sdk:session.generatedFiles handler in main to return plain array */}

            {/* Compose bar */}
            <div className="shrink-0 border-t border-hair p-3">
              <div className="flex items-end gap-2 rounded-lg border border-hair bg-surface px-3 py-2 focus-within:border-moderate transition-colors">
                <textarea
                  ref={textareaRef}
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={onKeyDown}
                  disabled={isTerminal || sending}
                  placeholder={isTerminal ? 'Session ended' : 'Message Jules… (Enter to send)'}
                  rows={1}
                  className="flex-1 resize-none bg-transparent text-sm text-fg-primary placeholder:text-fg-ghost outline-none min-h-[1.5rem] max-h-32 overflow-y-auto disabled:opacity-50 leading-relaxed"
                  style={{ fieldSizing: 'content' } as React.CSSProperties}
                />
                <div className="flex items-center gap-1.5 shrink-0 pb-0.5">
                  <PresetPicker
                    presets={presets}
                    onSelect={p => setInput(applyPreset(p, input))}
                  />
                  <button
                    type="button"
                    onClick={() => { void send() }}
                    disabled={!input.trim() || isTerminal || sending}
                    className="p-1.5 rounded-md bg-purple-600 text-white hover:bg-purple-500 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    {sending ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />}
                  </button>
                </div>
              </div>
            </div>
          </>
        ) : (
          /* No session selected — show create form */
          <div className="flex-1 flex flex-col items-center justify-center p-8 gap-4">
            <p className="text-sm text-fg-dim">Start a new session or select one from the list</p>
            <div className="w-full max-w-lg space-y-2">
              <div className="rounded-lg border border-hair bg-surface px-3 py-2 focus-within:border-moderate transition-colors">
                <textarea
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void startNewSession() } }}
                  placeholder="What should Jules work on?"
                  rows={3}
                  className="w-full resize-none bg-transparent text-sm text-fg-primary placeholder:text-fg-ghost outline-none leading-relaxed"
                />
              </div>
              <div className="flex items-center justify-between">
                <PresetPicker
                  presets={presets}
                  onSelect={p => setInput(applyPreset(p, input))}
                />
                <button
                  type="button"
                  onClick={() => { void startNewSession() }}
                  disabled={!input.trim() || sending}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-purple-600 text-white text-xs font-medium hover:bg-purple-500 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  {sending ? <Loader2 size={12} className="animate-spin" /> : <Plus size={12} />}
                  New session
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
