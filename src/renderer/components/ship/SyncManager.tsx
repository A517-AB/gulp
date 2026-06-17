import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { GitBranch, GitCommit, Upload, Download, RefreshCw, CheckCircle2, Loader2, Clock } from 'lucide-react'
import { cn } from '@/utils'
import { useSyncStore } from '@/store/sync'

const STATUS_COLOR: Record<string, string> = {
  modified:  'bg-yellow-500',
  added:     'bg-green-500',
  deleted:   'bg-red-500',
  untracked: 'bg-fg-ghost',
}

function ActionBtn({
  state, icon, label, busyLabel, onClick, className,
}: {
  state: 'idle' | 'busy' | 'done'
  icon: React.ReactNode
  label: string
  busyLabel?: string
  onClick: () => void
  className?: string
}) {
  return (
    <motion.button
      whileTap={{ scale: 0.93 }}
      onClick={onClick}
      disabled={state !== 'idle'}
      className={cn(
        'flex items-center gap-1.5 px-3 py-1 rounded border text-[10px] font-mono transition-all',
        state === 'done'
          ? 'text-green-400 border-green-500/30 bg-green-500/5'
          : cn('text-fg-ghost border-hair hover:text-fg-primary hover:border-subtle', className),
        state !== 'idle' && 'opacity-60 cursor-not-allowed',
      )}
    >
      {state === 'busy'
        ? <Loader2 className="h-3 w-3 animate-spin" />
        : state === 'done'
          ? <CheckCircle2 className="h-3 w-3" />
          : icon}
      <span>{state === 'busy' ? (busyLabel ?? label) : state === 'done' ? 'Done' : label}</span>
    </motion.button>
  )
}

export function SyncManager({ repoPath, repoName }: { repoPath: string; repoName: string }) {
  const {
    statusFiles, currentBranch, lastCommit,
    syncState, fetchState,
    checkGitStatus, syncRepo, fetchRepo, commitRepo, pushRepo,
  } = useSyncStore()

  const [commitMsg, setCommitMsg] = useState('')
  const [pushState, setPushState] = useState<'idle' | 'busy' | 'done'>('idle')
  const [commitState, setCommitState] = useState<'idle' | 'busy' | 'done'>('idle')

  useEffect(() => {
    void checkGitStatus(repoPath)
  }, [repoPath, checkGitStatus])

  const handleCommit = async () => {
    setCommitState('busy')
    await commitRepo(repoPath, commitMsg)
    setCommitMsg('')
    setCommitState('done')
    setTimeout(() => { setCommitState('idle') }, 2000)
  }

  const handlePush = async () => {
    setPushState('busy')
    await pushRepo(repoPath)
    setPushState('done')
    setTimeout(() => { setPushState('idle') }, 2000)
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.18 }}
      className="space-y-px"
    >
      {/* Repo header row */}
      <div className="flex items-center gap-3 py-3 px-3 rounded-md bg-hover/30">
        <div className="flex-1 min-w-0">
          <span className="text-[12px] font-semibold text-fg-primary block truncate">{repoName}</span>
          <div className="flex items-center gap-3 mt-0.5">
            <div className="flex items-center gap-1.5">
              <GitBranch className="h-2.5 w-2.5 text-fg-ghost shrink-0" />
              <span className="text-3xs font-mono text-fg-ghost">{currentBranch}</span>
            </div>
            {lastCommit.message && (
              <div className="flex items-center gap-1.5">
                <Clock className="h-2.5 w-2.5 text-fg-ghost shrink-0" />
                <span className="text-3xs font-mono text-fg-dim truncate max-w-[200px]">{lastCommit.age}</span>
              </div>
            )}
          </div>
        </div>
        <button
          onClick={() => { void checkGitStatus(repoPath) }}
          className="p-1 rounded hover:bg-hover text-fg-ghost hover:text-fg-primary transition-colors"
          title="Refresh status"
        >
          <RefreshCw className="h-3 w-3" />
        </button>
      </div>

      {/* Changed files */}
      <AnimatePresence initial={false}>
        {statusFiles.length > 0 && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            {statusFiles.map((f, i) => (
              <motion.div
                key={f.path}
                initial={{ opacity: 0, x: -5 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.14, delay: i * 0.03 }}
                className={cn('flex items-center gap-3 px-4 py-2 border-t border-hair', i === 0 && 'border-t-0')}
              >
                <span className={cn('h-1.5 w-1.5 rounded-full shrink-0', STATUS_COLOR[f.status] ?? 'bg-fg-ghost')} />
                <span className="flex-1 min-w-0 text-[11px] font-mono text-fg-secondary truncate">{f.path}</span>
                <span className="text-3xs font-mono text-fg-ghost uppercase">{f.status}</span>
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {statusFiles.length === 0 && (
        <p className="text-[10px] font-mono text-fg-ghost uppercase tracking-widest text-center py-8">
          clean — nothing to commit
        </p>
      )}

      {/* Commit row */}
      {statusFiles.length > 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="border-t border-hair px-3 pt-3 pb-1 flex items-center gap-2"
        >
          <input
            type="text"
            value={commitMsg}
            onChange={e => { setCommitMsg(e.target.value) }}
            onKeyDown={e => { if (e.key === 'Enter') void handleCommit() }}
            placeholder="commit message…"
            className="flex-1 min-w-0 bg-hover border border-hair rounded px-2 py-1 text-[10px] font-mono text-fg-primary placeholder-fg-ghost/40 outline-none focus:border-purple-500/40 transition-colors"
          />
          <ActionBtn
            state={commitState}
            icon={<GitCommit className="h-3 w-3" />}
            label="Commit"
            busyLabel="Committing…"
            onClick={() => { void handleCommit() }}
          />
        </motion.div>
      )}

      {/* Action footer */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.1 }}
        className="border-t border-hair px-3 py-3 flex items-center gap-2 flex-wrap"
      >
        <ActionBtn
          state={pushState}
          icon={<Upload className="h-3 w-3" />}
          label="Push"
          busyLabel="Pushing…"
          onClick={() => { void handlePush() }}
        />
        <ActionBtn
          state={fetchState === 'busy' ? 'busy' : 'idle'}
          icon={<Download className="h-3 w-3" />}
          label="Pull"
          busyLabel="Pulling…"
          onClick={() => { void fetchRepo(repoPath) }}
        />
        <ActionBtn
          state={syncState === 'busy' ? 'busy' : syncState === 'done' ? 'done' : 'idle'}
          icon={<RefreshCw className="h-3 w-3" />}
          label="Sync all"
          busyLabel="Syncing…"
          onClick={() => { void syncRepo(repoPath) }}
          className="hover:text-purple-400 hover:border-purple-500/30"
        />
        <span className="flex-1" />
        {lastCommit.message && (
          <span className="text-3xs font-mono text-fg-ghost truncate max-w-[160px]" title={lastCommit.message}>
            {lastCommit.message}
          </span>
        )}
      </motion.div>
    </motion.div>
  )
}
