import { useEffect, useRef, useState } from 'react'
import { useParams } from 'react-router'
import { sdkIpc } from '@shared/bridge'
import type { Activity, PlanStep } from '@google/jules-sdk/types'
import { ScrollArea } from '@/ui/scroll-area'
import { Input } from '@/ui/input'
import { Button } from '@/ui/button'
import { CheckCircle2, FileText, Loader2, Send, XCircle } from 'lucide-react'

function ActivityItem({ a, onApprove, approving }: { a: Activity; onApprove: () => void; approving: boolean }) {
  switch (a.type) {
    case 'agentMessaged':
      return (
        <div className="rounded-lg p-3 bg-raised border border-hair space-y-1">
          <span className="text-3xs font-mono uppercase tracking-widest text-fg-dim">Jules</span>
          <p className="text-xxs text-fg-secondary leading-relaxed whitespace-pre-wrap">{a.message}</p>
        </div>
      )
    case 'userMessaged':
      return (
        <div className="rounded-lg p-3 bg-purple-600/10 border border-purple-500/20 ml-8 space-y-1">
          <span className="text-3xs font-mono uppercase tracking-widest text-purple-400">You</span>
          <p className="text-xxs text-fg-secondary leading-relaxed whitespace-pre-wrap">{a.message}</p>
        </div>
      )
    case 'planGenerated':
      return (
        <div className="rounded-lg p-3 bg-raised border border-hair space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileText className="size-3.5 text-fg-dim" />
              <span className="text-3xs font-mono uppercase tracking-widest text-fg-dim">Plan</span>
            </div>
            <Button size="sm" variant="outline" onClick={onApprove} disabled={approving} className="h-6 text-3xs font-mono">
              {approving ? <Loader2 className="size-3 animate-spin" /> : 'Approve'}
            </Button>
          </div>
          <ol className="space-y-1 pl-1">
            {a.plan.steps.map((step: PlanStep, i: number) => (
              <li key={step.id} className="flex gap-2 text-xxs text-fg-secondary">
                <span className="text-fg-ghost font-mono shrink-0">{i + 1}.</span>
                <span>{step.title}</span>
              </li>
            ))}
          </ol>
        </div>
      )
    case 'planApproved':
      return (
        <div className="flex items-center gap-2 py-0.5">
          <CheckCircle2 className="size-3.5 text-green-500 shrink-0" />
          <span className="text-3xs font-mono text-fg-ghost">Plan approved</span>
        </div>
      )
    case 'progressUpdated':
      return (
        <div className="flex items-start gap-2 py-0.5">
          <Loader2 className="size-3.5 text-fg-dim mt-0.5 shrink-0" />
          <div>
            <p className="text-xxs text-fg-secondary">{a.title}</p>
            {a.description && <p className="text-3xs text-fg-ghost mt-0.5">{a.description}</p>}
          </div>
        </div>
      )
    case 'sessionCompleted':
      return (
        <div className="flex items-center gap-2 py-0.5">
          <CheckCircle2 className="size-3.5 text-green-500 shrink-0" />
          <span className="text-3xs font-mono text-green-500">Session completed</span>
          {/* gitpatch hook-in: "View changes" button goes here */}
        </div>
      )
    case 'sessionFailed':
      return (
        <div className="flex items-center gap-2 py-0.5">
          <XCircle className="size-3.5 text-red-500 shrink-0" />
          <span className="text-3xs font-mono text-red-400">{a.reason}</span>
        </div>
      )
    default:
      return null
  }
}

export default function ActivityPage() {
  const { id } = useParams<{ id: string }>()
  const [activities, setActivities] = useState<Activity[]>([])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [approving, setApproving] = useState(false)
  const endRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [activities])

  useEffect(() => {
    if (!sdkIpc || !id) return
    let cancelled = false

    sdkIpc.activities.list(id).then(({ activities: list }) => {
      if (!cancelled) setActivities(list)
    }).catch(() => {})

    const unsub = sdkIpc.activities.updates(id, (item) => {
      if (!cancelled) setActivities(prev => [...prev, item])
    })

    return () => {
      cancelled = true
      unsub()
    }
  }, [id])

  const send = async () => {
    if (!sdkIpc || !id || !input.trim() || sending) return
    const msg = input.trim()
    setInput('')
    setSending(true)
    try {
      await sdkIpc.session.send(id, msg)
    } finally {
      setSending(false)
    }
  }

  const approve = async () => {
    if (!sdkIpc || !id || approving) return
    setApproving(true)
    try {
      await sdkIpc.session.approve(id)
    } finally {
      setApproving(false)
    }
  }

  if (!sdkIpc) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-fg-ghost text-sm font-mono select-none">Desktop only</p>
      </div>
    )
  }

  if (!id) return null

  return (
    <div className="flex flex-col h-full">
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-2 max-w-2xl mx-auto">
          {activities.length === 0 && (
            <p className="text-fg-ghost text-xs font-mono text-center pt-16 select-none">No activities yet</p>
          )}
          {activities.map((a, i) => (
            <ActivityItem key={i} a={a} onApprove={approve} approving={approving} />
          ))}
          <div ref={endRef} />
        </div>
      </ScrollArea>

      <div className="p-3 border-t border-hair shrink-0">
        <div className="flex gap-1.5 max-w-2xl mx-auto">
          <Input
            value={input}
            onChange={e => { setInput(e.target.value) }}
            placeholder="Message Jules…"
            className="font-mono text-2xs"
            onKeyDown={e => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                void send()
              }
            }}
          />
          <Button size="icon-sm" onClick={() => { void send() }} disabled={!input.trim() || sending}>
            {sending ? <Loader2 className="size-3.5 animate-spin" /> : <Send className="size-3.5" />}
          </Button>
        </div>
      </div>
    </div>
  )
}
