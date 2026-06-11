import {useEffect, useRef, useState} from 'react'
import {useParams} from 'react-router'
import {sdkIpc} from '@shared/bridge'
import type {Activity, ChangeSetArtifact, PlanStep} from '@google/jules-sdk/types'
import {parseUnidiff} from '@/utils/activity'
import {Input} from '@/ui/input'
import {Button} from '@/ui/button'
import {CheckCircle2, ChevronDown, ChevronRight, FileText, Send, XCircle} from 'lucide-react'

function ChangeSetDropdown({artifact}: { artifact: ChangeSetArtifact }) {
    const [open, setOpen] = useState(false)
    const patch = artifact.gitPatch.unidiffPatch
    if (!patch) return null
    const files = parseUnidiff(patch)
    if (files.length === 0) return null
    const totalAdd = files.reduce((s, f) => s + f.additions, 0)
    const totalDel = files.reduce((s, f) => s + f.deletions, 0)
    return (
        <div className="mt-2">
            <button
                onClick={() => {
                    setOpen(o => !o)
                }}
                className="flex items-center gap-1.5 text-3xs font-mono text-fg-dim hover:text-fg-secondary transition-colors"
            >
                {open ? <ChevronDown className="size-3"/> : <ChevronRight className="size-3"/>}
                <span>{files.length} file{files.length !== 1 ? 's' : ''} changed</span>
                <span className="text-green-400">+{totalAdd}</span>
                <span className="text-red-400">-{totalDel}</span>
            </button>
            {open && (
                <div className="mt-1.5 space-y-0.5 pl-4">
                    {files.map((f, i) => (
                        <div key={i} className="flex items-center justify-between gap-2 text-3xs font-mono">
                            <span className="text-fg-dim truncate">{f.path}</span>
                            <span className="shrink-0 flex gap-1.5">
                                <span className="text-green-400">+{f.additions}</span>
                                <span className="text-red-400">-{f.deletions}</span>
                            </span>
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}

function ActivityItem({a, onApprove, approving, changeset}: {
    a: Activity;
    onApprove: () => void;
    approving: boolean;
    changeset: ChangeSetArtifact | undefined
}) {
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
                Approve
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
          <span className="size-3.5 mt-0.5 shrink-0 flex items-center justify-center">
            <span className="h-1 w-1 rounded-full bg-fg-dim"/>
          </span>
          <div>
            <p className="text-xxs text-fg-secondary">{a.title}</p>
            {a.description && <p className="text-3xs text-fg-ghost mt-0.5">{a.description}</p>}
          </div>
        </div>
      )
    case 'sessionCompleted':
      return (
          <div className="py-0.5">
              <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-2">
                      <CheckCircle2 className="size-3.5 text-green-500 shrink-0"/>
                      <span className="text-3xs font-mono text-green-500">Session completed</span>
                  </div>
                  {changeset && <ChangeSetDropdown artifact={changeset}/>}
              </div>
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
    const viewportRef = useRef<HTMLDivElement>(null)
    const hasScrolled = useRef(false)

  useEffect(() => {
      if (activities.length === 0) return
      const el = viewportRef.current
      if (!el) return
      if (hasScrolled.current) {
          el.scrollTo({top: el.scrollHeight, behavior: 'smooth'})
      } else {
          el.scrollTop = el.scrollHeight
      }
      hasScrolled.current = true
  }, [activities])

    useEffect(() => {
        hasScrolled.current = false
    }, [id])

  useEffect(() => {
    if (!sdkIpc || !id) return
    let cancelled = false

    sdkIpc.activities.list(id).then(({ activities: list }) => {
      if (!cancelled) setActivities(list)
    }).catch(console.error)

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

    const changeset = activities
        .flatMap(a => Array.isArray(a.artifacts) ? a.artifacts : [])
        .find((x): x is ChangeSetArtifact => x.type === 'changeSet')

  return (
    <div className="flex flex-col h-full">
        <div ref={viewportRef} className="flex-1 overflow-y-auto">
        <div className="p-4 space-y-2 max-w-2xl mx-auto">
          {activities.length === 0 && (
            <p className="text-fg-ghost text-xs font-mono text-center pt-16 select-none">No activities yet</p>
          )}
          {activities.map((a, i) => (
              <ActivityItem key={i} a={a} onApprove={() => {
                  void approve()
              }} approving={approving} changeset={a.type === 'sessionCompleted' ? changeset : undefined}/>
          ))}
        </div>
        </div>

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
              <Send className="size-3.5"/>
          </Button>
        </div>
      </div>
    </div>
  )
}
