import { useState, useEffect, useRef, useCallback, type ReactNode } from 'react'
import type { Activity, ApplyResult, IpcSessionOutcome } from '@shared/types'
import { Button } from '@/ui/button'
import { Input } from '@/ui/input'
import { Textarea } from '@/ui/textarea'
import { Label } from '@/ui/label'
import { ScrollArea } from '@/ui/scroll-area'
import { DiffViewer } from '@/ui/diff-viewer'
import { CodeBlock } from '@/ui/code-block'
import { ChatPanel, type ChatMessage } from '@/ui/chat-panel'
import { cn } from '@/utils'
import {
  FolderOpen, Play, GitBranch, Check, Loader2, RotateCcw,
  Send, FileCode, Terminal, ListChecks, CheckCircle2, Circle,
} from 'lucide-react'

// ── local types ───────────────────────────────────────────────────────────────

type Phase = 'idle' | 'running' | 'awaiting_approval' | 'done' | 'failed'

interface PlanStep { id: string; title: string; description?: string; index: number }
interface BashEntry { id: string; command: string; stdout: string; stderr: string; exitCode: number | null }
interface FileEntry { path: string; changeType: 'created' | 'modified' | 'deleted'; content: string; additions: number; deletions: number }

// ── component ─────────────────────────────────────────────────────────────────

export default function WorkbenchPage(): ReactNode {
  const [phase, setPhase] = useState<Phase>('idle')
  const [repoPath, setRepoPath] = useState('')
  const [prompt, setPrompt] = useState('')
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [progressTitle, setProgressTitle] = useState<string | null>(null)

  const [planSteps, setPlanSteps] = useState<PlanStep[]>([])
  const [chatLog, setChatLog] = useState<ChatMessage[]>([])
  const [diffPatch, setDiffPatch] = useState<string | null>(null)
  const [bashEntries, setBashEntries] = useState<BashEntry[]>([])
  const [generatedFiles, setGeneratedFiles] = useState<FileEntry[]>([])
  const [selectedFile, setSelectedFile] = useState<string | null>(null)

  const [branchName, setBranchName] = useState('jules/changes')
  const [applyResult, setApplyResult] = useState<ApplyResult | null>(null)
  const [applyLoading, setApplyLoading] = useState(false)
  const [applyError, setApplyError] = useState<string | null>(null)

  const unsubRef = useRef<(() => void) | null>(null)
  const idRef = useRef(0)
  const nextId = () => String(idRef.current++)

  const isActive = phase === 'running' || phase === 'awaiting_approval'
  const hasChat = chatLog.length > 0
  const hasOutput = diffPatch || bashEntries.length > 0 || generatedFiles.length > 0

  // ── reset ─────────────────────────────────────────────────────────────────

  const reset = () => {
    setPhase('idle')
    setSessionId(null)
    setPlanSteps([])
    setProgressTitle(null)
    setChatLog([])
    setDiffPatch(null)
    setBashEntries([])
    setGeneratedFiles([])
    setSelectedFile(null)
    setApplyResult(null)
    setApplyError(null)
    setErrorMessage(null)
    idRef.current = 0
    unsubRef.current?.()
    unsubRef.current = null
  }

  // ── activity ──────────────────────────────────────────────────────────────

  const processArtifacts = useCallback((artifacts: unknown[] | undefined) => {
    if (!artifacts) return
    for (const raw of artifacts) {
      const a = raw as Record<string, unknown>
      if (a['type'] === 'changeSet') {
        const patch = (a['gitPatch'] as Record<string, unknown>)?.['unidiffPatch']
        if (typeof patch === 'string') setDiffPatch(patch)
      } else if (a['type'] === 'bashOutput') {
        setBashEntries(prev => [...prev, {
          id: nextId(),
          command: String(a['command'] ?? ''),
          stdout: String(a['stdout'] ?? a['output'] ?? ''),
          stderr: String(a['stderr'] ?? ''),
          exitCode: typeof a['exitCode'] === 'number' ? a['exitCode'] : null,
        }])
      }
    }
  }, [])

  const handleActivity = useCallback((item: Activity) => {
    const a = item as unknown as Record<string, unknown>
    switch (item.type) {
      case 'planGenerated':
        setPlanSteps((a['plan'] as { steps: PlanStep[] })?.steps ?? [])
        setPhase('awaiting_approval')
        break
      case 'progressUpdated':
        setProgressTitle(String(a['title'] ?? a['description'] ?? ''))
        processArtifacts(a['artifacts'] as unknown[])
        break
      case 'agentMessaged':
        setChatLog(prev => [...prev, { id: nextId(), origin: 'agent', message: String(a['message'] ?? ''), time: new Date() }])
        break
      case 'userMessaged':
        setChatLog(prev => [...prev, { id: nextId(), origin: 'user', message: String(a['message'] ?? ''), time: new Date() }])
        break
      case 'sessionCompleted':
        setPhase('done')
        break
      case 'sessionFailed':
        setErrorMessage(String(a['reason'] ?? 'Session failed'))
        setPhase('failed')
        break
    }
  }, [processArtifacts])

  const handleStreamDone = useCallback(() => {
    setPhase(prev => prev === 'running' ? 'done' : prev)
  }, [])

  useEffect(() => {
    if (!sessionId || !isActive) return
    const unsub = window.electronAPI?.sdk.session.stream(sessionId, handleActivity, handleStreamDone)
    unsubRef.current = unsub ?? null
    return () => { unsub?.(); unsubRef.current = null }
  }, [sessionId, isActive, handleActivity, handleStreamDone])

  useEffect(() => {
    if (phase !== 'done' || !sessionId) return
    window.electronAPI?.sdk.session.result(sessionId)
      .then((outcome: IpcSessionOutcome) => {
        const outputs = (outcome as unknown as Record<string, unknown>)['outputs'] as unknown[] | undefined
        if (!outputs) return
        for (const out of outputs) {
          const o = out as Record<string, unknown>
          if (o['type'] === 'changeSet') {
            const patch = ((o['changeSet'] as Record<string, unknown>)?.['gitPatch'] as Record<string, unknown>)?.['unidiffPatch']
            if (typeof patch === 'string') setDiffPatch(patch)
          }
        }
      })
      .catch(() => undefined)
  }, [phase, sessionId])

  // ── actions ───────────────────────────────────────────────────────────────

  const handleBrowse = async () => {
    const dir = await window.electronAPI?.sdk.repoless.pickDir()
    if (dir) setRepoPath(dir)
  }

  const handleRun = async () => {
    if (!prompt.trim()) return
    reset()
    setPhase('running')
    try {
      const res = await window.electronAPI?.sdk.repoless.start(prompt, repoPath.trim() || undefined)
      if (!res) throw new Error('No response from main process')
      setSessionId(res.id)
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Failed to start session')
      setPhase('failed')
    }
  }

  const handleApprove = async () => {
    if (!sessionId) return
    try {
      await window.electronAPI?.sdk.session.approve(sessionId)
      setPhase('running')
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Failed to approve')
    }
  }

  const handleApply = async () => {
    if (!sessionId || !repoPath.trim()) return
    setApplyLoading(true)
    setApplyError(null)
    try {
      const res = await window.electronAPI?.sdk.repoless.apply(sessionId, repoPath.trim(), branchName)
      if (res) setApplyResult(res)
    } catch (err) {
      setApplyError(err instanceof Error ? err.message : 'Apply failed')
    } finally {
      setApplyLoading(false)
    }
  }

  const handleSendChat = async (message: string) => {
    if (!sessionId) return
    setChatLog(prev => [...prev, { id: nextId(), origin: 'user', message, time: new Date() }])
    try { await window.electronAPI?.sdk.session.send(sessionId, message) } catch { /* stream reflects state */ }
  }

  // ── idle ──────────────────────────────────────────────────────────────────

  if (phase === 'idle') {
    return (
      <div className="flex h-full items-center justify-center bg-[#0a0a0a]">
        <div className="w-full max-w-xl px-6 space-y-4">
          <div className="space-y-1">
            <p className="text-xs font-mono text-neutral-500 uppercase tracking-widest">Workbench</p>
            <h2 className="text-lg font-mono text-neutral-200">What should Jules do?</h2>
          </div>

          <Textarea
            value={prompt}
            onChange={e => setPrompt(e.target.value)}
            placeholder="Describe the task…"
            className="min-h-[120px] font-mono text-sm resize-none bg-[#111] border-white/8 text-neutral-200 placeholder:text-neutral-600 focus-visible:ring-purple-500/30"
            onKeyDown={e => {
              if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); void handleRun() }
            }}
          />

          <div className="flex items-center gap-2">
            <div className="flex gap-1.5 flex-1">
              <Input
                value={repoPath}
                onChange={e => setRepoPath(e.target.value)}
                placeholder="/path/to/repo (optional)"
                className="font-mono text-xs bg-[#111] border-white/8 text-neutral-300 placeholder:text-neutral-600"
              />
              <Button size="icon-sm" variant="outline" onClick={handleBrowse} className="border-white/8 bg-[#111] hover:bg-white/5">
                <FolderOpen className="size-3.5 text-neutral-400" />
              </Button>
            </div>
            <Button
              onClick={handleRun}
              disabled={!prompt.trim()}
              className="bg-purple-600 hover:bg-purple-500 text-white gap-1.5 px-4"
            >
              <Play className="size-3.5" />
              Run
            </Button>
          </div>

          <p className="text-[11px] font-mono text-neutral-700">⌘ Enter to run</p>
        </div>
      </div>
    )
  }

  // ── selected file content ─────────────────────────────────────────────────

  const selectedFileEntry = generatedFiles.find(f => f.path === selectedFile)

  // ── active / done ─────────────────────────────────────────────────────────

  return (
    <div className="flex h-full overflow-hidden bg-[#0a0a0a]">

      {/* ── LEFT: session meta + plan ───────────────────────────────────── */}
      <div className="w-[260px] shrink-0 flex flex-col border-r border-white/5">

        {/* status bar */}
        <div className="px-4 py-3 border-b border-white/5 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono text-neutral-500 uppercase tracking-widest">Session</span>
            <div className="flex items-center gap-1.5">
              <span className={cn(
                'size-1.5 rounded-full',
                phase === 'running' && 'bg-blue-400 animate-pulse',
                phase === 'awaiting_approval' && 'bg-amber-400',
                phase === 'done' && 'bg-green-400',
                phase === 'failed' && 'bg-red-400',
              )} />
              <span className={cn(
                'text-[11px] font-mono',
                phase === 'running' && 'text-blue-400',
                phase === 'awaiting_approval' && 'text-amber-400',
                phase === 'done' && 'text-green-400',
                phase === 'failed' && 'text-red-400',
              )}>
                {phase === 'awaiting_approval' ? 'needs approval' : phase}
              </span>
            </div>
          </div>

          {progressTitle && (
            <p className="text-[11px] font-mono text-neutral-500 leading-relaxed line-clamp-2">
              {progressTitle}
            </p>
          )}

          <div className="flex gap-1.5">
            <Button
              size="sm"
              variant="outline"
              onClick={reset}
              className="flex-1 text-[11px] font-mono border-white/8 bg-transparent hover:bg-white/5 text-neutral-400"
            >
              <RotateCcw className="size-3" />
              New
            </Button>
            {phase === 'awaiting_approval' && (
              <Button
                size="sm"
                onClick={handleApprove}
                className="flex-1 text-[11px] bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/20"
              >
                <Check className="size-3" />
                Approve
              </Button>
            )}
          </div>

          {errorMessage && (
            <p className="text-[11px] font-mono text-red-400 leading-relaxed">{errorMessage}</p>
          )}
        </div>

        {/* plan steps */}
        <ScrollArea className="flex-1">
          {planSteps.length > 0 ? (
            <div className="p-4 space-y-1">
              <p className="text-[10px] font-mono text-neutral-600 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                <ListChecks className="size-3" /> Plan
              </p>
              {planSteps.map((step, i) => (
                <div key={step.id} className="flex gap-2.5 group">
                  <div className="flex flex-col items-center pt-0.5">
                    <div className={cn(
                      'size-4 rounded-full flex items-center justify-center shrink-0',
                      phase === 'done'
                        ? 'text-green-400'
                        : phase === 'awaiting_approval'
                        ? 'text-amber-400'
                        : 'text-neutral-600',
                    )}>
                      {phase === 'done'
                        ? <CheckCircle2 className="size-3.5" />
                        : <Circle className="size-3.5" />
                      }
                    </div>
                    {i < planSteps.length - 1 && (
                      <div className="w-px flex-1 bg-white/5 mt-1" />
                    )}
                  </div>
                  <div className="pb-3 flex-1 min-w-0">
                    <p className="text-[12px] font-mono text-neutral-300 leading-snug">{step.title}</p>
                    {step.description && (
                      <p className="text-[11px] text-neutral-600 mt-0.5 leading-relaxed">{step.description}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex items-center justify-center h-24">
              <p className="text-[11px] font-mono text-neutral-700">
                {isActive ? 'Building plan…' : ''}
              </p>
            </div>
          )}

          {/* apply panel — shown when done and repo is set */}
          {phase === 'done' && repoPath.trim() && (
            <div className="mx-4 mb-4 p-3 rounded-lg border border-white/5 bg-white/[0.02] space-y-2">
              <p className="text-[10px] font-mono text-neutral-600 uppercase tracking-widest flex items-center gap-1.5">
                <GitBranch className="size-3" /> Apply
              </p>
              <Input
                value={branchName}
                onChange={e => setBranchName(e.target.value)}
                className="font-mono text-[11px] bg-transparent border-white/8 text-neutral-300 h-7"
              />
              <Button
                size="sm"
                onClick={handleApply}
                disabled={applyLoading || !branchName.trim()}
                className="w-full text-[11px] bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 border border-purple-500/20"
              >
                {applyLoading ? <Loader2 className="size-3 animate-spin" /> : <Check className="size-3" />}
                Apply to branch
              </Button>
              {applyError && <p className="text-[11px] font-mono text-red-400">{applyError}</p>}
              {applyResult && !applyError && (
                <p className="text-[11px] font-mono text-green-400">
                  ✓ {applyResult.applied.length} files on {applyResult.branch}
                </p>
              )}
            </div>
          )}
        </ScrollArea>
      </div>

      {/* ── CENTER: output ──────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <ScrollArea className="flex-1">
          <div className="p-5 space-y-6">

            {/* running skeleton / waiting state */}
            {isActive && !hasOutput && (
              <div className="space-y-3">
                {[80, 60, 72, 45].map((w, i) => (
                  <div
                    key={i}
                    className="h-2 rounded-full bg-white/5 animate-pulse"
                    style={{ width: `${w}%`, animationDelay: `${i * 150}ms` }}
                  />
                ))}
              </div>
            )}

            {/* diff */}
            {diffPatch && (
              <section className="space-y-2">
                <p className="text-[10px] font-mono text-neutral-600 uppercase tracking-widest flex items-center gap-1.5">
                  <FileCode className="size-3" /> Code Changes
                </p>
                <DiffViewer diff={diffPatch} branch={branchName} />
              </section>
            )}

            {/* generated files */}
            {generatedFiles.length > 0 && (
              <section className="space-y-2">
                <p className="text-[10px] font-mono text-neutral-600 uppercase tracking-widest">
                  Files · {generatedFiles.length}
                </p>
                <div className="rounded-lg border border-white/5 overflow-hidden">
                  {generatedFiles.map(file => (
                    <button
                      key={file.path}
                      type="button"
                      onClick={() => setSelectedFile(prev => prev === file.path ? null : file.path)}
                      className={cn(
                        'w-full text-left px-3 py-2 flex items-center gap-3 border-b border-white/5 last:border-0',
                        'hover:bg-white/[0.03] transition-colors',
                        selectedFile === file.path && 'bg-white/[0.05]',
                      )}
                    >
                      <span className={cn(
                        'text-[10px] font-mono font-bold w-3 shrink-0',
                        file.changeType === 'created' && 'text-green-400',
                        file.changeType === 'modified' && 'text-amber-400',
                        file.changeType === 'deleted' && 'text-red-400',
                      )}>
                        {file.changeType === 'created' ? 'A' : file.changeType === 'deleted' ? 'D' : 'M'}
                      </span>
                      <span className="text-[12px] font-mono text-neutral-300 truncate flex-1">{file.path}</span>
                      <span className="text-[10px] font-mono text-neutral-700 shrink-0">
                        +{file.additions} -{file.deletions}
                      </span>
                    </button>
                  ))}
                </div>
                {selectedFileEntry && (
                  <CodeBlock code={selectedFileEntry.content} language="typescript" />
                )}
              </section>
            )}

            {/* terminal */}
            {bashEntries.length > 0 && (
              <section className="space-y-2">
                <p className="text-[10px] font-mono text-neutral-600 uppercase tracking-widest flex items-center gap-1.5">
                  <Terminal className="size-3" /> Terminal · {bashEntries.length}
                </p>
                <div className="space-y-2">
                  {bashEntries.map(entry => (
                    <div key={entry.id} className="rounded-lg border border-white/5 overflow-hidden">
                      <div className="px-3 py-2 bg-white/[0.03] border-b border-white/5 flex items-center gap-2">
                        <span className="text-[11px] font-mono text-neutral-600">$</span>
                        <span className="text-[12px] font-mono text-neutral-300">{entry.command}</span>
                        {entry.exitCode !== null && entry.exitCode !== 0 && (
                          <span className="ml-auto text-[10px] font-mono text-red-400">exit {entry.exitCode}</span>
                        )}
                      </div>
                      {(entry.stdout || entry.stderr) && (
                        <CodeBlock
                          code={[entry.stdout, entry.stderr].filter(Boolean).join('\n')}
                          language="bash"
                        />
                      )}
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* failed */}
            {phase === 'failed' && !hasOutput && (
              <div className="rounded-lg border border-red-500/20 bg-red-500/5 p-4">
                <p className="text-[12px] font-mono text-red-400">{errorMessage ?? 'Session failed'}</p>
              </div>
            )}
          </div>
        </ScrollArea>

        {/* inline reply bar — only when there's an active session to message */}
        {sessionId && isActive && (
          <div className="border-t border-white/5 px-4 py-3">
            <ReplyBar sessionId={sessionId} onSend={handleSendChat} />
          </div>
        )}
      </div>

      {/* ── RIGHT: chat — only rendered once messages exist ─────────────── */}
      {hasChat && (
        <ChatPanel
          messages={chatLog}
          onSend={handleSendChat}
          isActive={isActive}
          canSend={!!sessionId}
          agentLabel="Jules"
        />
      )}
    </div>
  )
}

// ── inline reply bar ──────────────────────────────────────────────────────────

function ReplyBar({ sessionId, onSend }: { sessionId: string; onSend: (msg: string) => void }) {
  const [value, setValue] = useState('')

  const submit = () => {
    const msg = value.trim()
    if (!msg) return
    setValue('')
    onSend(msg)
  }

  return (
    <div className="flex gap-2 items-center">
      <Input
        value={value}
        onChange={e => setValue(e.target.value)}
        placeholder="Reply to Jules…"
        className="font-mono text-[12px] bg-transparent border-white/8 text-neutral-300 placeholder:text-neutral-700 h-8"
        onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submit() } }}
      />
      <Button size="icon-sm" onClick={submit} disabled={!value.trim()} className="shrink-0 bg-purple-600/20 hover:bg-purple-600/30 border border-purple-500/20">
        <Send className="size-3.5 text-purple-300" />
      </Button>
    </div>
  )
}
