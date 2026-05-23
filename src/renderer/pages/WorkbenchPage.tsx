import { useState, useEffect, useRef, useCallback, type ReactNode } from 'react'
import type { Activity, ApplyResult, IpcSessionOutcome } from '@shared/types'
import { Button } from '@/ui/button'
import { Input } from '@/ui/input'
import { Textarea } from '@/ui/textarea'
import { Label } from '@/ui/label'
import { Badge } from '@/ui/badge'
import { ScrollArea } from '@/ui/scroll-area'
import { Separator } from '@/ui/separator'
import { ChatPanel, type ChatMessage } from '@/ui/chat-panel'
import { OutputTabs, type PlanStep, type BashEntry, type MediaEntry, type FileEntry, type OutputPhase } from '@/ui/output-tabs'
import { cn } from '@/utils'
import { FolderOpen, Play, GitBranch, Check, Loader2, RotateCcw } from 'lucide-react'

export default function WorkbenchPage(): ReactNode {
  // ── session state ──────────────────────────────────────────────────────────
  const [phase, setPhase] = useState<OutputPhase>('idle')
  const [repoPath, setRepoPath] = useState('')
  const [prompt, setPrompt] = useState('')
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [progressTitle, setProgressTitle] = useState<string | null>(null)

  // ── output state ───────────────────────────────────────────────────────────
  const [planSteps, setPlanSteps] = useState<PlanStep[]>([])
  const [chatLog, setChatLog] = useState<ChatMessage[]>([])
  const [diffPatch, setDiffPatch] = useState<string | null>(null)
  const [bashEntries, setBashEntries] = useState<BashEntry[]>([])
  const [mediaEntries, setMediaEntries] = useState<MediaEntry[]>([])
  const [generatedFiles, setGeneratedFiles] = useState<FileEntry[]>([])
  const [selectedFile, setSelectedFile] = useState<string | null>(null)

  // ── apply state ────────────────────────────────────────────────────────────
  const [branchName, setBranchName] = useState('jules/changes')
  const [applyResult, setApplyResult] = useState<ApplyResult | null>(null)
  const [applyLoading, setApplyLoading] = useState(false)
  const [applyError, setApplyError] = useState<string | null>(null)

  const unsubRef = useRef<(() => void) | null>(null)
  const idCounter = useRef(0)

  const isActive = phase === 'running' || phase === 'awaiting_approval'

  // ── helpers ────────────────────────────────────────────────────────────────

  const nextId = () => `${idCounter.current++}`

  const resetState = () => {
    setPhase('idle')
    setSessionId(null)
    setPlanSteps([])
    setProgressTitle(null)
    setChatLog([])
    setDiffPatch(null)
    setBashEntries([])
    setMediaEntries([])
    setGeneratedFiles([])
    setSelectedFile(null)
    setApplyResult(null)
    setApplyError(null)
    setErrorMessage(null)
    idCounter.current = 0
    unsubRef.current?.()
    unsubRef.current = null
  }

  // ── activity processing ────────────────────────────────────────────────────

  const processArtifacts = useCallback((artifacts: unknown[] | undefined) => {
    if (!artifacts) return
    for (const raw of artifacts) {
      const artifact = raw as Record<string, unknown>
      if (artifact['type'] === 'changeSet') {
        const patch = (artifact['gitPatch'] as Record<string, unknown>)?.['unidiffPatch']
        if (typeof patch === 'string') setDiffPatch(patch)
      } else if (artifact['type'] === 'bashOutput') {
        setBashEntries(prev => [...prev, {
          id: nextId(),
          command: String(artifact['command'] ?? ''),
          stdout: String(artifact['stdout'] ?? artifact['output'] ?? ''),
          stderr: String(artifact['stderr'] ?? ''),
          exitCode: typeof artifact['exitCode'] === 'number' ? artifact['exitCode'] : null,
        }])
      } else if (artifact['type'] === 'media' && artifact['data']) {
        const dataUrl = `data:${artifact['mimeType'] ?? 'image/png'};base64,${artifact['data']}`
        setMediaEntries(prev => [...prev, {
          id: nextId(),
          dataUrl,
          format: String(artifact['format'] ?? artifact['mimeType'] ?? 'png'),
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
        setChatLog(prev => [...prev, {
          id: nextId(),
          origin: 'agent',
          message: String(a['message'] ?? ''),
          time: new Date(),
        }])
        break
      case 'userMessaged':
        setChatLog(prev => [...prev, {
          id: nextId(),
          origin: 'user',
          message: String(a['message'] ?? ''),
          time: new Date(),
        }])
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

  // ── stream subscription ────────────────────────────────────────────────────

  useEffect(() => {
    if (!sessionId || !isActive) return
    const unsub = window.electronAPI?.sdk.session.stream(sessionId, handleActivity, handleStreamDone)
    unsubRef.current = unsub ?? null
    return () => { unsub?.(); unsubRef.current = null }
  }, [sessionId, isActive, handleActivity, handleStreamDone])

  // ── fetch result on completion ─────────────────────────────────────────────

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

  // ── actions ────────────────────────────────────────────────────────────────

  const handleBrowse = async () => {
    const dir = await window.electronAPI?.sdk.repoless.pickDir()
    if (dir) setRepoPath(dir)
  }

  const handleRun = async () => {
    if (!prompt.trim()) return
    resetState()
    setPhase('running')
    try {
      const res = await window.electronAPI?.sdk.repoless.start(
        prompt,
        repoPath.trim() || undefined,
      )
      if (!res) throw new Error('No response from main process')
      setSessionId(res.id)
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Failed to start session')
      setPhase('failed')
    }
  }

  const handleApprovePlan = async () => {
    if (!sessionId) return
    try {
      await window.electronAPI?.sdk.session.approve(sessionId)
      setPhase('running')
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Failed to approve plan')
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
    try {
      await window.electronAPI?.sdk.session.send(sessionId, message)
    } catch { /* stream will reflect real state */ }
  }

  // ── status helpers ─────────────────────────────────────────────────────────

  const phaseColor: Record<OutputPhase, string> = {
    idle: 'text-fg-ghost',
    running: 'text-blue-400',
    awaiting_approval: 'text-amber-400',
    done: 'text-green-400',
    failed: 'text-red-400',
  }
  const phaseBorder: Record<OutputPhase, string> = {
    idle: 'border-subtle',
    running: 'border-blue-400/30',
    awaiting_approval: 'border-amber-400/30',
    done: 'border-green-400/30',
    failed: 'border-red-400/30',
  }
  const phaseLabel: Record<OutputPhase, string> = {
    idle: 'idle',
    running: 'running',
    awaiting_approval: 'awaiting approval',
    done: 'done',
    failed: 'failed',
  }

  // ── render ─────────────────────────────────────────────────────────────────

  return (
    <div className="flex h-full overflow-hidden">

      {/* Left: Controls */}
      <div className="w-[280px] shrink-0 flex flex-col border-r border-hair bg-base">
        <div className="flex items-center justify-between px-4 h-toolbar border-b border-hair shrink-0">
          <span className="label-mono text-fg-ghost">Workbench</span>
          <Badge
            variant="outline"
            className={cn(
              'label-mono text-3xs bg-transparent',
              phaseColor[phase],
              phaseBorder[phase],
              phase === 'running' && 'animate-pulse',
            )}
          >
            {phaseLabel[phase]}
          </Badge>
        </div>

        <ScrollArea className="flex-1">
          <div className="p-4 space-y-4">

            <div className="space-y-1.5">
              <Label className="label-mono text-fg-ghost">Repository</Label>
              <div className="flex gap-1.5">
                <Input
                  value={repoPath}
                  onChange={e => setRepoPath(e.target.value)}
                  placeholder="/path/to/repo (optional)"
                  disabled={isActive}
                  className="font-mono text-2xs"
                />
                <Button size="icon-sm" variant="outline" onClick={handleBrowse} disabled={isActive}>
                  <FolderOpen className="size-3.5" />
                </Button>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="label-mono text-fg-ghost">Task</Label>
              <Textarea
                value={prompt}
                onChange={e => setPrompt(e.target.value)}
                placeholder="Describe what Jules should do…"
                disabled={isActive}
                className="min-h-[140px] font-mono text-2xs resize-none"
                onKeyDown={e => {
                  if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                    e.preventDefault()
                    void handleRun()
                  }
                }}
              />
            </div>

            <div className="flex gap-1.5">
              <Button onClick={handleRun} disabled={isActive || !prompt.trim()} className="flex-1">
                {phase === 'running'
                  ? <><Loader2 className="size-3.5 animate-spin" /> Running…</>
                  : <><Play className="size-3.5" /> Run</>
                }
              </Button>
              {phase !== 'idle' && (
                <Button size="icon-sm" variant="outline" onClick={resetState} title="Reset">
                  <RotateCcw className="size-3.5" />
                </Button>
              )}
            </div>

            {errorMessage && (
              <div className="rounded-md border border-red-400/20 bg-red-400/5 p-3">
                <p className="text-xxs font-mono text-red-400 leading-relaxed">{errorMessage}</p>
              </div>
            )}

            {progressTitle && (
              <>
                <Separator className="bg-hair" />
                <div className="space-y-1.5">
                  <div className="label-mono text-fg-ghost">Progress</div>
                  <div className="flex items-start gap-2">
                    <Loader2 className="size-3 text-blue-400 animate-spin shrink-0 mt-0.5" />
                    <span className="text-xxs font-mono text-fg-secondary leading-relaxed">
                      {progressTitle}
                    </span>
                  </div>
                </div>
              </>
            )}

            {phase === 'done' && repoPath.trim() && (
              <>
                <Separator className="bg-hair" />
                <div className="space-y-2">
                  <div className="label-mono text-fg-ghost">Apply to Local</div>
                  <div className="flex gap-1.5">
                    <div className="flex items-center gap-1.5 flex-1">
                      <GitBranch className="size-3 text-fg-dim shrink-0" />
                      <Input
                        value={branchName}
                        onChange={e => setBranchName(e.target.value)}
                        className="font-mono text-2xs"
                      />
                    </div>
                    <Button size="sm" onClick={handleApply} disabled={applyLoading || !branchName.trim()}>
                      {applyLoading ? <Loader2 className="size-3 animate-spin" /> : <Check className="size-3" />}
                      Apply
                    </Button>
                  </div>
                  {applyError && <p className="text-xxs font-mono text-red-400">{applyError}</p>}
                  {applyResult && !applyError && (
                    <p className="text-xxs font-mono text-green-400">
                      ✓ {applyResult.applied.length} file{applyResult.applied.length !== 1 ? 's' : ''} on {applyResult.branch}
                    </p>
                  )}
                </div>
              </>
            )}
          </div>
        </ScrollArea>
      </div>

      {/* Center: Output */}
      <div className="flex-1 flex flex-col overflow-hidden bg-surface">
        <OutputTabs
          phase={phase}
          planSteps={planSteps}
          diffPatch={diffPatch}
          bashEntries={bashEntries}
          mediaEntries={mediaEntries}
          generatedFiles={generatedFiles}
          applyResult={applyResult}
          branchName={branchName}
          selectedFile={selectedFile}
          onSelectFile={setSelectedFile}
          onApprovePlan={handleApprovePlan}
        />
      </div>

      {/* Right: Chat */}
      <ChatPanel
        messages={chatLog}
        onSend={handleSendChat}
        isActive={isActive}
        canSend={!!sessionId}
        agentLabel="Jules"
      />
    </div>
  )
}
