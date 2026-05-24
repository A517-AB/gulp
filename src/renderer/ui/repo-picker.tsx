import { useState, useRef, useEffect, type ReactNode } from 'react'
import { FolderOpen, ChevronDown, Clock, X } from 'lucide-react'
import { Button } from '@/ui/button'
import { Input } from '@/ui/input'
import { cn } from '@/utils'

const HISTORY_KEY = 'gulp:repo-history'
const MAX_HISTORY = 8

function loadHistory(): string[] {
  try {
    return JSON.parse(localStorage.getItem(HISTORY_KEY) ?? '[]') as string[]
  } catch {
    return []
  }
}

function pushHistory(path: string) {
  const h = loadHistory().filter(p => p !== path)
  h.unshift(path)
  localStorage.setItem(HISTORY_KEY, JSON.stringify(h.slice(0, MAX_HISTORY)))
}

function removeHistory(path: string) {
  localStorage.setItem(
    HISTORY_KEY,
    JSON.stringify(loadHistory().filter(p => p !== path)),
  )
}

interface RepoPickerProps {
  value: string
  onChange: (path: string) => void
  onCommit?: (path: string) => void
  placeholder?: string
  className?: string
}

export function RepoPicker({
  value,
  onChange,
  onCommit,
  placeholder = '/path/to/repo',
  className,
}: RepoPickerProps): ReactNode {
  const [open, setOpen] = useState(false)
  const [history, setHistory] = useState<string[]>(loadHistory)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const close = (e: MouseEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', close)
    return () => { document.removeEventListener('mousedown', close) }
  }, [open])

  const select = (path: string) => {
    onChange(path)
    pushHistory(path)
    onCommit?.(path)
    setOpen(false)
  }

  const remove = (e: React.MouseEvent, path: string) => {
    e.stopPropagation()
    removeHistory(path)
    setHistory(loadHistory())
  }

  const browse = async () => {
    const dir = await window.electronAPI?.sdk.repoless.pickDir()
    if (dir) select(dir)
  }

  const commit = () => {
    const p = value.trim()
    if (p) {
      pushHistory(p)
      setHistory(loadHistory())
      onCommit?.(p)
    }
  }

  const currentHistory = history.filter(p => p !== value)

  return (
    <div ref={containerRef} className={cn('relative flex gap-1', className)}>
      <div className="flex flex-1">
        <Input
          value={value}
          onChange={e => { onChange(e.target.value) }}
          onBlur={commit}
          onKeyDown={e => { if (e.key === 'Enter') commit() }}
          placeholder={placeholder}
          className="rounded-r-none font-mono text-xs"
        />
        <Button
          size="icon-sm"
          variant="outline"
          onClick={() => { setOpen(o => !o) }}
          disabled={currentHistory.length === 0}
          className="rounded-none border-l-0 shrink-0"
        >
          <ChevronDown className={cn('size-3 transition-transform', open && 'rotate-180')} />
        </Button>
      </div>
      <Button
        size="icon-sm"
        variant="outline"
        onClick={() => { void browse() }}
        className="shrink-0"
        title="Browse…"
      >
        <FolderOpen className="size-3.5" />
      </Button>

      {open && currentHistory.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-1 z-50 rounded-md border border-hair bg-overlay shadow-lg overflow-hidden">
          <div className="flex items-center gap-1.5 px-2.5 py-1.5 border-b border-hair">
            <Clock className="size-3 text-fg-ghost" />
            <span className="label-mono text-fg-ghost">Recent</span>
          </div>
          {currentHistory.map(p => (
            <div
              key={p}
              className="flex items-center gap-1 px-3 py-1.5 hover:bg-hover transition-colors group"
            >
              <button
                type="button"
                onClick={() => { select(p) }}
                className="flex-1 text-left text-xs font-mono text-fg-secondary group-hover:text-fg-primary truncate"
              >
                {p}
              </button>
              <button
                type="button"
                onClick={e => { remove(e, p) }}
                className="shrink-0 opacity-0 group-hover:opacity-100 text-fg-ghost hover:text-fg-dim transition-opacity"
              >
                <X className="size-3" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
