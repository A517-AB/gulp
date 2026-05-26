import { useState, type ReactNode } from 'react'
import { Play, GitBranch, ChevronDown } from 'lucide-react'
import { Button } from '@/ui/button'
import { cn } from '@/utils'
import type { ApiSource, SessionFormValues } from './types'

// ── helpers ───────────────────────────────────────────────────────────────────

function branchList(source: ApiSource): string[] {
  const raw = source.githubRepo.branches
  if (!Array.isArray(raw) || raw.length === 0) return []
  const first = raw[0]
  if (typeof first === 'string') return raw
  return (raw as { displayName?: string }[]).map(b => b.displayName ?? '').filter(Boolean)
}

function getDefaultBranch(source: ApiSource): string {
  const db = source.githubRepo.defaultBranch
  if (typeof db === 'string' && db) return db
  return 'main'
}

// ── field wrapper ─────────────────────────────────────────────────────────────

function Field({ label, children }: { label: string; children: ReactNode }): ReactNode {
  return (
    <div className="space-y-1.5">
      <label className="label-mono text-fg-ghost">{label}</label>
      {children}
    </div>
  )
}

const inputCls = cn(
  'w-full bg-raised border border-hair rounded-lg',
  'text-xxs text-fg-secondary outline-none transition-colors',
  'focus:border-subtle placeholder:text-fg-ghost',
)

// ── SessionForm ───────────────────────────────────────────────────────────────

interface Props {
  sources: ApiSource[]
  disabled: boolean
  onSubmit: (values: SessionFormValues) => void
}

export function SessionForm({ sources, disabled, onSubmit }: Props): ReactNode {
  const [prompt,          setPrompt]          = useState('')
  const [github,          setGithub]          = useState('')
  const [branch,          setBranch]          = useState('main')
  const [requireApproval, setRequireApproval] = useState(false)
  const [autoPr,          setAutoPr]          = useState(true)

  const selectedSource = sources.find(s => s.id === github)
  const availBranches  = selectedSource ? branchList(selectedSource) : []

  function handleSourceChange(id: string) {
    setGithub(id)
    const src = sources.find(s => s.id === id)
    setBranch(src ? getDefaultBranch(src) : 'main')
  }

  function submit() {
    if (!prompt.trim()) return
    onSubmit({ prompt: prompt.trim(), github, branch, requireApproval, autoPr })
    setPrompt('')
  }

  return (
    <div className="px-3 pb-4 space-y-3">

      <Field label="Repository">
        <div className="relative">
          {sources.length > 0 ? (
            <>
              <select
                value={github}
                onChange={e => { handleSourceChange(e.target.value) }}
                className={cn(inputCls, 'pl-3 pr-8 py-2 appearance-none cursor-pointer')}
              >
                <option value="">— select repo —</option>
                {sources.map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-fg-ghost" />
            </>
          ) : (
            <input
              value={github}
              onChange={e => { setGithub(e.target.value) }}
              placeholder="owner/repo"
              className={cn(inputCls, 'px-3 py-2')}
            />
          )}
        </div>
      </Field>

      <Field label="Branch">
        <div className="relative">
          <GitBranch className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-fg-ghost" />
          {availBranches.length > 0 ? (
            <>
              <select
                value={branch}
                onChange={e => { setBranch(e.target.value) }}
                className={cn(inputCls, 'pl-8 pr-8 py-2 appearance-none cursor-pointer')}
              >
                {availBranches.map(b => (
                  <option key={b} value={b}>{b}</option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-fg-ghost" />
            </>
          ) : (
            <input
              value={branch}
              onChange={e => { setBranch(e.target.value) }}
              placeholder="main"
              className={cn(inputCls, 'pl-8 pr-3 py-2')}
            />
          )}
        </div>
      </Field>

      <Field label="Prompt">
        <textarea
          rows={6}
          value={prompt}
          onChange={e => { setPrompt(e.target.value) }}
          onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) { submit() } }}
          placeholder={"Describe the task…\n\n⌘↵ to start"}
          className={cn(inputCls, 'px-3 py-2.5 resize-none leading-relaxed')}
        />
      </Field>

      <div className="flex gap-5">
        {([
          ['requireApproval', 'Require approval', requireApproval, setRequireApproval],
          ['autoPr',          'Auto PR',          autoPr,          setAutoPr],
        ] as [string, string, boolean, (v: boolean) => void][]).map(([key, lbl, val, set]) => (
          <label key={key} className="flex items-center gap-1.5 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={val}
              onChange={e => { set(e.target.checked) }}
              className="accent-primary"
            />
            <span className="text-2xs text-fg-muted">{lbl}</span>
          </label>
        ))}
      </div>

      <Button
        onClick={submit}
        disabled={disabled || !prompt.trim()}
        className="w-full"
        size="sm"
      >
        <Play className="w-3.5 h-3.5" />
        Start Session
      </Button>
    </div>
  )
}
