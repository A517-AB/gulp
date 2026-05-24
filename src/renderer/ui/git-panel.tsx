import { useState, useEffect, useCallback, type ReactNode } from 'react'
import { GitBranch, RefreshCw, GitMerge, Loader2 } from 'lucide-react'
import { ScrollArea } from '@/ui/scroll-area'
import { Button } from '@/ui/button'
import { Label } from '@/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/ui/select'
import { cn } from '@/utils'
import type { GitLogEntry, GitBranch as GitBranchType } from '@shared/types'

interface GitPanelProps {
  repoPath: string
}

type RebaseState = 'idle' | 'rebasing' | 'conflict' | 'done' | 'error'

export function GitPanel({ repoPath }: GitPanelProps): ReactNode {
  const [log, setLog] = useState<GitLogEntry[]>([])
  const [branches, setBranches] = useState<GitBranchType[]>([])
  const [currentBranch, setCurrentBranch] = useState<string>('')
  const [rebaseTarget, setRebaseTarget] = useState('')
  const [rebaseState, setRebaseState] = useState<RebaseState>('idle')
  const [rebaseMessage, setRebaseMessage] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [fetchError, setFetchError] = useState<string | null>(null)

  const git = window.electronAPI?.git

  const refresh = useCallback(async () => {
    if (!git || !repoPath.trim()) return
    setLoading(true)
    setFetchError(null)
    try {
      const [logData, branchData] = await Promise.all([
        git.log(repoPath, 15),
        git.branches(repoPath),
      ])
      setLog(logData)
      setBranches(branchData)
      setCurrentBranch(branchData.find(b => b.current)?.name ?? '')
    } catch (err) {
      setFetchError(err instanceof Error ? err.message : 'Git error')
    } finally {
      setLoading(false)
    }
  }, [git, repoPath])

  useEffect(() => {
    if (repoPath.trim()) queueMicrotask(() => { void refresh() })
  }, [refresh, repoPath])

  const handleRebase = async () => {
    if (!git || !rebaseTarget.trim()) return
    setRebaseState('rebasing')
    setRebaseMessage(null)
    try {
      const out = await git.rebase(repoPath, rebaseTarget.trim())
      setRebaseState('done')
      setRebaseMessage(out || 'Rebase complete')
      void refresh()
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Rebase failed'
      setRebaseState(msg.toLowerCase().includes('conflict') ? 'conflict' : 'error')
      setRebaseMessage(msg)
    }
  }

  const handleAbort = async () => {
    if (!git) return
    try {
      await git.rebaseAbort(repoPath)
      setRebaseState('idle')
      setRebaseMessage(null)
      void refresh()
    } catch (err) {
      setRebaseMessage(err instanceof Error ? err.message : 'Abort failed')
    }
  }

  const handleContinue = async () => {
    if (!git) return
    try {
      const out = await git.rebaseContinue(repoPath)
      setRebaseState('done')
      setRebaseMessage(out)
      void refresh()
    } catch (err) {
      setRebaseMessage(err instanceof Error ? err.message : 'Continue failed')
    }
  }

  return (
    <div className="flex flex-col h-full bg-base overflow-hidden">
      <div className="flex items-center justify-between px-4 h-toolbar border-b border-hair shrink-0">
        <div className="flex items-center gap-2">
          <GitBranch className="size-3.5 text-fg-dim" />
          <span className="label-mono text-fg-ghost">Git</span>
          {currentBranch && (
            <span className="text-2xs font-mono text-purple-400">{currentBranch}</span>
          )}
        </div>
        <Button size="icon-sm" variant="ghost" onClick={() => { void refresh() }} disabled={loading} title="Refresh">
          <RefreshCw className={cn('size-3.5', loading && 'animate-spin')} />
        </Button>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4 space-y-5">
          {fetchError && (
            <div className="rounded-md border border-red-400/20 bg-red-400/5 p-3">
              <p className="text-xxs font-mono text-red-400">{fetchError}</p>
            </div>
          )}

          {/* Rebase controls */}
          <div className="space-y-2">
            <Label className="label-mono text-fg-ghost flex items-center gap-1.5">
              <GitMerge className="size-3" />
              Rebase
            </Label>
            <div className="flex gap-1.5">
              <Select value={rebaseTarget} onValueChange={setRebaseTarget}>
                <SelectTrigger className="font-mono text-2xs flex-1">
                  <SelectValue placeholder="onto branch…" />
                </SelectTrigger>
                <SelectContent>
                  {branches.filter(b => !b.current).map(b => (
                    <SelectItem key={b.name} value={b.name} className="font-mono text-2xs">
                      {b.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                size="sm"
                onClick={() => { void handleRebase() }}
                disabled={!rebaseTarget || rebaseState === 'rebasing'}
              >
                {rebaseState === 'rebasing'
                  ? <Loader2 className="size-3 animate-spin" />
                  : <GitMerge className="size-3" />
                }
                Rebase
              </Button>
            </div>

            {rebaseState === 'conflict' && (
              <div className="flex gap-1.5">
                <Button size="sm" variant="outline" onClick={() => { void handleAbort() }} className="flex-1 text-red-400 border-red-400/30">
                  Abort
                </Button>
                <Button size="sm" onClick={() => { void handleContinue() }} className="flex-1">
                  Continue
                </Button>
              </div>
            )}

            {rebaseMessage && (
              <div className={cn(
                'rounded-md border p-2.5',
                rebaseState === 'done' && 'border-green-400/20 bg-green-400/5',
                (rebaseState === 'error' || rebaseState === 'conflict') && 'border-red-400/20 bg-red-400/5',
                rebaseState === 'rebasing' && 'border-hair bg-raised',
              )}>
                <pre className={cn(
                  'text-3xs font-mono leading-relaxed whitespace-pre-wrap break-all',
                  rebaseState === 'done' && 'text-green-400',
                  (rebaseState === 'error' || rebaseState === 'conflict') && 'text-red-400',
                  rebaseState === 'rebasing' && 'text-fg-secondary',
                )}>
                  {rebaseMessage}
                </pre>
              </div>
            )}
          </div>

          {/* Commit log */}
          <div className="space-y-2">
            <Label className="label-mono text-fg-ghost">Log</Label>
            <div className="rounded-md border border-hair overflow-hidden divide-y divide-hair">
              {log.length === 0 ? (
                <p className="text-xxs font-mono text-fg-ghost p-3 text-center">No commits</p>
              ) : (
                log.map(entry => (
                  <div key={entry.hash} className="px-3 py-2 flex items-start gap-3 hover:bg-hover transition-colors">
                    <span className="text-3xs font-mono text-purple-400 shrink-0 mt-0.5 tabular-nums">
                      {entry.short}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xxs font-mono text-fg-primary truncate">{entry.subject}</p>
                      <p className="text-3xs font-mono text-fg-ghost mt-0.5">
                        {entry.author} · {entry.relDate}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </ScrollArea>
    </div>
  )
}
