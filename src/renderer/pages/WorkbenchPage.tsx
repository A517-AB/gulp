import { useState, useEffect, useRef, useCallback, useMemo, type ReactNode } from 'react'
import type { Activity, ApplyResult, IpcSessionOutcome } from '@shared/types'
import { Button } from '@/ui/button'
import { Input } from '@/ui/input'
import { Textarea } from '@/ui/textarea'
import { Label } from '@/ui/label'
import { Badge } from '@/ui/badge'
import { ScrollArea } from '@/ui/scroll-area'
import { Separator } from '@/ui/separator'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/ui/tabs'
import { DiffViewer } from '@/ui/diff-viewer'
import { CodeBlock } from '@/ui/code-block'
import { cn } from '@/utils'
import {
  FolderOpen,
  Play,
  Send,
  GitBranch,
  Check,
  Terminal,
  FileCode,
  Image,
  ListChecks,
  MessageSquare,
  ChevronLeft,
  ChevronRight,
  Files,
  Loader2,
  RotateCcw,
} from 'lucide-react'

// ── types ─────────────────────────────────────────────────────────────────────

type Phase = 'idle' | 'running' | 'awaiting_approval' | 'done' | 'failed'

interface ChatEntry {
  id: string
  origin: 'agent' | 'user'
  message: string
  time: Date
}

interface BashEntry {
  id: string
  command: string
  stdout: string
  stderr: string
  exitCode: number | null
}

interface MediaEntry {
  id: string
  dataUrl: string
  format: string
}

interface FileEntry {
  path: string
  changeType: 'created' | 'modified' | 'deleted'
  content: string
  additions: number
  deletions: number
}

/** Inline from SDK — PlanStep isn't re-exported through @shared/types */
interface PlanStep {
  id: string
  title: string
  description?: string
  index: number
}

// ── component ─────────────────────────────────────────────────────────────────

export default function WorkbenchPage(): ReactNode {
  // ── state ─────────────────────────────────────────────────────────────────
  const [phase, setPhase] = useState<Phase>('idle')
  const [repoPath, setRepoPath] = useState('')
  const [prompt, setPrompt] = useState('')
  const [sessionId, setSessionId] = useState<string | null>(null)

  // plan
  const [planSteps, setPlanSteps] = useState<PlanStep[]>([])

  // progress
  const [progressTitle, setProgressTitle] = useState<string | null>(null)

  // chat
  const [chatLog, setChatLog] = useState<ChatEntry[]>([])
  const [chatInput, setChatInput] = useState('')
  const [chatOpen, setChatOpen] = useState(true)

  // artifacts
  const [diffPatch, setDiffPatch] = useState<string | null>(null)
  const [bashEntries, setBashEntries] = useState<BashEntry[]>([])
  const [mediaEntries, setMediaEntries] = useState<MediaEntry[]>([])
  const [generatedFiles, setGeneratedFiles] = useState<FileEntry[]>([])
  const [selectedFile, setSelectedFile] = useState<string | null>(null)

  // apply
  const [branchName, setBranchName] = useState('jules/changes')
  const [applyResult, setApplyResult] = useState<ApplyResult | null>(null)
  const [applyLoading, setApplyLoading] = useState(false)
  const [applyError, setApplyError] = useState<string | null>(null)

  // errors
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  // refs
  const chatEndRef = useRef<HTMLDivElement>(null)
  const unsubRef = useRef<(() => void) | null>(null)
  const activityIdCounter = useRef(0)

  // ── derived ───────────────────────────────────────────────────────────────

  const activeTab = useMemo(() => {
    if (planSteps.length > 0 && phase === 'awaiting_approval') return 'plan'
    if (diffPatch) return 'code'
    if (bashEntries.length > 0) return 'terminal'
    if (mediaEntries.length > 0) return 'media'
    if (generatedFiles.length > 0) return 'files'
    return 'plan'
  }, [planSteps, phase, diffPatch, bashEntries, mediaEntries, generatedFiles])

  const selectedFileContent = useMemo(() => {
    if (!selectedFile) return null
    return generatedFiles.find(f => f.path === selectedFile) ?? null
  }, [selectedFile, generatedFiles])

  // ── auto-scroll chat ──────────────────────────────────────────────────────

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [chatLog])

  // ── handlers ──────────────────────────────────────────────────────────────

  const handleBrowse = async () => {
    const dir = await window.electronAPI?.sdk.repoless.pickDir()
    if (dir) setRepoPath(dir)
  }

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
    activityIdCounter.current = 0
    unsubRef.current?.()
    unsubRef.current = null
  }

  const handleRun = async () => {
    if (!prompt.trim()) return

    resetState()
    setPhase('running')

    try {
      const res = await window.electronAPI?.sdk.repoless.start(
        prompt,
        repoPath.trim() !== '' ? repoPath.trim() : undefined,
      )
      if (!res) throw new Error('No response from main process')
      setSessionId(res.id)
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Failed to start session')
      setPhase('failed')
    }
  }

  const processArtifacts = useCallback((artifacts: any[] | undefined) => {
    if (!artifacts) return
    for (const artifact of artifacts) {
      if (artifact.type === 'changeSet' && artifact.gitPatch?.unidiffPatch) {
        setDiffPatch(artifact.gitPatch.unidiffPatch)
      } else if (artifact.type === 'bashOutput') {
        setBashEntries(prev => [
          ...prev,
          {
            id: `bash-${activityIdCounter.current++}`,
            command: artifact.command ?? '',
            stdout: artifact.stdout ?? artifact.output ?? '',
            stderr: artifact.stderr ?? '',
            exitCode: artifact.exitCode ?? null,
          },
        ])
      } else if (artifact.type === 'media' && artifact.data) {
        const dataUrl = typeof artifact.toUrl === 'function'
          ? artifact.toUrl()
          : `data:${artifact.mimeType ?? 'image/png'};base64,${artifact.data}`
        setMediaEntries(prev => [
          ...prev,
          {
            id: `media-${activityIdCounter.current++}`,
            dataUrl,
            format: artifact.format ?? artifact.mimeType ?? 'png',
          },
        ])
      }
    }
  }, [])

  const handleActivity = useCallback(
    (item: Activity) => {
      const a = item as any // activities arrive serialized from IPC
      switch (item.type) {
        case 'planGenerated': {
          setPlanSteps(a.plan?.steps ?? [])
          setPhase('awaiting_approval')
          break
        }
        case 'progressUpdated': {
          setProgressTitle(a.title || a.description || null)
          processArtifacts(a.artifacts)
          break
        }
        case 'agentMessaged': {
          setChatLog(prev => [
            ...prev,
            {
              id: `chat-${activityIdCounter.current++}`,
              origin: 'agent',
              message: a.message ?? '',
              time: new Date(),
            },
          ])
          break
        }
        case 'userMessaged': {
          setChatLog(prev => [
            ...prev,
            {
              id: `chat-${activityIdCounter.current++}`,
              origin: 'user',
              message: a.message ?? '',
              time: new Date(),
            },
          ])
          break
        }
        case 'sessionCompleted':
          setPhase('done')
          break
        case 'sessionFailed': {
          setErrorMessage(a.reason ?? 'Session failed')
          setPhase('failed')
          break
        }
      }
    },
    [processArtifacts],
  )

  const handleStreamDone = useCallback(() => {
    setPhase(prev => (prev === 'running' ? 'done' : prev))
  }, [])

  // ── stream subscription ───────────────────────────────────────────────────

  useEffect(() => {
    if (!sessionId || (phase !== 'running' && phase !== 'awaiting_approval')) return

    const unsub = window.electronAPI?.sdk.session.stream(
      sessionId,
      handleActivity,
      handleStreamDone,
    )
    unsubRef.current = unsub ?? null

    return () => {
      unsub?.()
      unsubRef.current = null
    }
  }, [sessionId, phase, handleActivity, handleStreamDone])

  // ── fetch generated files on completion ───────────────────────────────────

  useEffect(() => {
    if (phase !== 'done' || !sessionId) return

    window.electronAPI?.sdk.session
      .result(sessionId)
      .then((outcome: IpcSessionOutcome) => {
        // IpcSessionOutcome has outputs[] which may contain changeSets
        if (outcome?.outputs) {
          for (const output of outcome.outputs) {
            if (output.type === 'changeSet') {
              const cs = output as any
              if (cs.changeSet?.gitPatch?.unidiffPatch) {
                setDiffPatch(cs.changeSet.gitPatch.unidiffPatch)
              }
            }
          }
        }
      })
      .catch(() => {
        // outcome not available yet or session still running
      })
  }, [phase, sessionId])

  // ── chat send ─────────────────────────────────────────────────────────────

  const handleSendChat = async () => {
    if (!chatInput.trim() || !sessionId) return
    const msg = chatInput.trim()
    setChatInput('')

    // optimistic add
    setChatLog(prev => [
      ...prev,
      {
        id: `chat-${activityIdCounter.current++}`,
        origin: 'user',
        message: msg,
        time: new Date(),
      },
    ])

    try {
      await window.electronAPI?.sdk.session.send(sessionId, msg)
    } catch {
      // message send failed — silently handled, activity stream will show the real state
    }
  }

  // ── plan approval ─────────────────────────────────────────────────────────

  const handleApprovePlan = async () => {
    if (!sessionId) return
    try {
      await window.electronAPI?.sdk.session.approve(sessionId)
      setPhase('running')
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Failed to approve plan')
    }
  }

  // ── apply ─────────────────────────────────────────────────────────────────

  const handleApply = async () => {
    if (!sessionId || !repoPath.trim()) return

    setApplyLoading(true)
    setApplyError(null)

    try {
      const res = await window.electronAPI?.sdk.repoless.apply(
        sessionId,
        repoPath.trim(),
        branchName,
      )
      if (res) setApplyResult(res)
    } catch (err) {
      setApplyError(err instanceof Error ? err.message : 'Apply failed')
    } finally {
      setApplyLoading(false)
    }
  }

  // ── status helpers ────────────────────────────────────────────────────────

  const phaseColor: Record<Phase, string> = {
    idle: 'text-fg-ghost',
    running: 'text-blue-400',
    awaiting_approval: 'text-amber-400',
    done: 'text-green-400',
    failed: 'text-red-400',
  }

  const phaseBorder: Record<Phase, string> = {
    idle: 'border-subtle',
    running: 'border-blue-400/30',
    awaiting_approval: 'border-amber-400/30',
    done: 'border-green-400/30',
    failed: 'border-red-400/30',
  }

  const phaseLabel: Record<Phase, string> = {
    idle: 'idle',
    running: 'running',
    awaiting_approval: 'awaiting approval',
    done: 'done',
    failed: 'failed',
  }

  const isActive = phase === 'running' || phase === 'awaiting_approval'
  const hasOutput = diffPatch || bashEntries.length > 0 || mediaEntries.length > 0 || generatedFiles.length > 0

  // ── render ────────────────────────────────────────────────────────────────

  return (
    <div className="flex h-full overflow-hidden">

      {/* ── LEFT: Controls ──────────────────────────────────────────────── */}
      <div className="w-[280px] shrink-0 flex flex-col border-r border-hair bg-base">

        {/* header */}
        <div className="flex items-center justify-between px-4 h-toolbar border-b border-hair shrink-0">
          <span className="label-mono text-fg-ghost">Workbench</span>
          <Badge
            variant="outline"
            className={cn(
              'label-mono text-3xs',
              phaseColor[phase],
              phaseBorder[phase],
              'bg-transparent',
              phase === 'running' && 'animate-pulse',
            )}
          >
            {phaseLabel[phase]}
          </Badge>
        </div>

        <ScrollArea className="flex-1">
          <div className="p-4 space-y-4">

            {/* directory */}
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
                <Button
                  size="icon-sm"
                  variant="outline"
                  onClick={handleBrowse}
                  disabled={isActive}
                >
                  <FolderOpen className="size-3.5" />
                </Button>
              </div>
            </div>

            {/* prompt */}
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
                    handleRun()
                  }
                }}
              />
            </div>

            {/* run / reset */}
            <div className="flex gap-1.5">
              <Button
                onClick={handleRun}
                disabled={isActive || !prompt.trim()}
                className="flex-1"
              >
                {phase === 'running' ? (
                  <><Loader2 className="size-3.5 animate-spin" /> Running…</>
                ) : (
                  <><Play className="size-3.5" /> Run</>
                )}
              </Button>
              {phase !== 'idle' && (
                <Button
                  size="icon-sm"
                  variant="outline"
                  onClick={resetState}
                  title="Reset"
                >
                  <RotateCcw className="size-3.5" />
                </Button>
              )}
            </div>

            {/* error */}
            {errorMessage && (
              <div className="rounded-md border border-red-400/20 bg-red-400/5 p-3">
                <p className="text-xxs font-mono text-red-400 leading-relaxed">{errorMessage}</p>
              </div>
            )}

            {/* progress */}
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

            {/* apply (done state) */}
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
                    <Button
                      size="sm"
                      onClick={handleApply}
                      disabled={applyLoading || !branchName.trim()}
                    >
                      {applyLoading ? (
                        <Loader2 className="size-3 animate-spin" />
                      ) : (
                        <Check className="size-3" />
                      )}
                      Apply
                    </Button>
                  </div>
                  {applyError && (
                    <p className="text-xxs font-mono text-red-400">{applyError}</p>
                  )}
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

      {/* ── CENTER: Output ──────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col overflow-hidden bg-surface">

        {/* idle state */}
        {phase === 'idle' && !hasOutput && (
          <div className="flex-1 flex flex-col items-center justify-center gap-3">
            <div className="size-12 rounded-xl bg-raised border border-hair flex items-center justify-center">
              <FileCode className="size-5 text-fg-ghost" />
            </div>
            <div className="text-center space-y-1">
              <p className="label-mono text-fg-ghost">No active session</p>
              <p className="text-3xs text-fg-ghost font-mono">
                Enter a prompt and hit Run — or Ctrl+Enter
              </p>
            </div>
          </div>
        )}

        {/* tabbed output */}
        {(isActive || hasOutput || phase === 'done' || phase === 'failed') && (
          <Tabs defaultValue={activeTab} className="flex-1 flex flex-col overflow-hidden gap-0">
            <div className="flex items-center px-3 h-toolbar border-b border-hair shrink-0">
              <TabsList className="bg-transparent gap-0.5 h-7">
                <TabsTrigger
                  value="plan"
                  className="text-2xs font-mono gap-1 px-2 h-6 data-[state=active]:bg-raised"
                >
                  <ListChecks className="size-3" />
                  Plan
                  {planSteps.length > 0 && (
                    <span className="text-3xs text-fg-dim ml-0.5">{planSteps.length}</span>
                  )}
                </TabsTrigger>
                <TabsTrigger
                  value="code"
                  className="text-2xs font-mono gap-1 px-2 h-6 data-[state=active]:bg-raised"
                >
                  <FileCode className="size-3" />
                  Code
                </TabsTrigger>
                <TabsTrigger
                  value="terminal"
                  className="text-2xs font-mono gap-1 px-2 h-6 data-[state=active]:bg-raised"
                >
                  <Terminal className="size-3" />
                  Terminal
                  {bashEntries.length > 0 && (
                    <span className="text-3xs text-fg-dim ml-0.5">{bashEntries.length}</span>
                  )}
                </TabsTrigger>
                <TabsTrigger
                  value="media"
                  className="text-2xs font-mono gap-1 px-2 h-6 data-[state=active]:bg-raised"
                >
                  <Image className="size-3" />
                  Media
                  {mediaEntries.length > 0 && (
                    <span className="text-3xs text-fg-dim ml-0.5">{mediaEntries.length}</span>
                  )}
                </TabsTrigger>
                <TabsTrigger
                  value="files"
                  className="text-2xs font-mono gap-1 px-2 h-6 data-[state=active]:bg-raised"
                >
                  <Files className="size-3" />
                  Files
                  {generatedFiles.length > 0 && (
                    <span className="text-3xs text-fg-dim ml-0.5">{generatedFiles.length}</span>
                  )}
                </TabsTrigger>
              </TabsList>
            </div>

            {/* ── Plan tab ──────────────────────────────────────────────── */}
            <TabsContent value="plan" className="flex-1 overflow-hidden">
              <ScrollArea className="h-full">
                <div className="p-4 space-y-3">
                  {planSteps.length === 0 ? (
                    <p className="label-mono text-fg-ghost text-center pt-12">
                      {isActive ? 'Waiting for plan…' : 'No plan generated'}
                    </p>
                  ) : (
                    <>
                      {phase === 'awaiting_approval' && (
                        <div className="flex items-center gap-2 mb-4 p-3 rounded-lg border border-amber-400/20 bg-amber-400/5">
                          <span className="text-xxs font-mono text-amber-400 flex-1">
                            Plan ready — review and approve to proceed
                          </span>
                          <Button size="sm" onClick={handleApprovePlan}>
                            <Check className="size-3" /> Approve
                          </Button>
                        </div>
                      )}
                      {planSteps.map((step, i) => (
                        <div key={step.id} className="flex gap-3">
                          <div className="flex flex-col items-center">
                            <div className={cn(
                              'size-6 rounded-full flex items-center justify-center text-3xs font-mono font-bold',
                              phase === 'awaiting_approval'
                                ? 'bg-amber-400/10 text-amber-400 border border-amber-400/30'
                                : 'bg-raised text-fg-dim border border-hair',
                            )}>
                              {i + 1}
                            </div>
                            {i < planSteps.length - 1 && (
                              <div className="w-px flex-1 bg-hair mt-1" />
                            )}
                          </div>
                          <div className="pb-4 flex-1 min-w-0">
                            <p className="text-xxs font-mono text-fg-primary font-medium leading-relaxed">
                              {step.title}
                            </p>
                            {step.description && (
                              <p className="text-3xs text-fg-muted mt-1 leading-relaxed">
                                {step.description}
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                    </>
                  )}
                </div>
              </ScrollArea>
            </TabsContent>

            {/* ── Code tab ──────────────────────────────────────────────── */}
            <TabsContent value="code" className="flex-1 overflow-hidden">
              <ScrollArea className="h-full">
                <div className="p-4">
                  {diffPatch ? (
                    <DiffViewer diff={diffPatch} branch={branchName} />
                  ) : applyResult?.diff ? (
                    <DiffViewer diff={applyResult.diff} branch={applyResult.branch} />
                  ) : (
                    <p className="label-mono text-fg-ghost text-center pt-12">
                      {isActive ? 'Waiting for code changes…' : 'No code changes'}
                    </p>
                  )}
                </div>
              </ScrollArea>
            </TabsContent>

            {/* ── Terminal tab ──────────────────────────────────────────── */}
            <TabsContent value="terminal" className="flex-1 overflow-hidden">
              <ScrollArea className="h-full">
                <div className="p-4 space-y-3">
                  {bashEntries.length === 0 ? (
                    <p className="label-mono text-fg-ghost text-center pt-12">
                      {isActive ? 'Waiting for commands…' : 'No terminal output'}
                    </p>
                  ) : (
                    bashEntries.map(entry => (
                      <div key={entry.id} className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-3xs font-mono text-fg-dim">$</span>
                          <span className="text-xxs font-mono text-fg-primary font-medium">
                            {entry.command}
                          </span>
                          {entry.exitCode !== null && entry.exitCode !== 0 && (
                            <Badge
                              variant="outline"
                              className="text-3xs text-red-400 border-red-400/30 bg-transparent"
                            >
                              exit {entry.exitCode}
                            </Badge>
                          )}
                        </div>
                        <CodeBlock
                          code={[entry.stdout, entry.stderr].filter(Boolean).join('\n')}
                          language="bash"
                        />
                      </div>
                    ))
                  )}
                </div>
              </ScrollArea>
            </TabsContent>

            {/* ── Media tab ────────────────────────────────────────────── */}
            <TabsContent value="media" className="flex-1 overflow-hidden">
              <ScrollArea className="h-full">
                <div className="p-4">
                  {mediaEntries.length === 0 ? (
                    <p className="label-mono text-fg-ghost text-center pt-12">
                      {isActive ? 'Waiting for media…' : 'No media captured'}
                    </p>
                  ) : (
                    <div className="grid grid-cols-2 gap-3">
                      {mediaEntries.map(entry => (
                        <div
                          key={entry.id}
                          className="rounded-lg border border-hair overflow-hidden bg-raised"
                        >
                          <img
                            src={entry.dataUrl}
                            alt={`Screenshot (${entry.format})`}
                            className="w-full h-auto"
                          />
                          <div className="px-2 py-1.5 border-t border-hair">
                            <span className="text-3xs font-mono text-fg-dim uppercase">
                              {entry.format}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </ScrollArea>
            </TabsContent>

            {/* ── Files tab ────────────────────────────────────────────── */}
            <TabsContent value="files" className="flex-1 overflow-hidden">
              {generatedFiles.length === 0 ? (
                <div className="h-full flex items-center justify-center">
                  <p className="label-mono text-fg-ghost">
                    {isActive ? 'Waiting for files…' : 'No generated files'}
                  </p>
                </div>
              ) : (
                <div className="flex h-full">
                  {/* file tree */}
                  <div className="w-[200px] shrink-0 border-r border-hair overflow-y-auto">
                    {generatedFiles.map(file => (
                      <button
                        key={file.path}
                        type="button"
                        onClick={() => setSelectedFile(file.path)}
                        className={cn(
                          'w-full text-left px-3 py-1.5 flex items-center gap-2 transition-colors',
                          'hover:bg-hover',
                          selectedFile === file.path && 'bg-selected',
                        )}
                      >
                        <span className={cn(
                          'text-3xs font-mono font-bold shrink-0',
                          file.changeType === 'created' && 'text-green-400',
                          file.changeType === 'modified' && 'text-amber-400',
                          file.changeType === 'deleted' && 'text-red-400',
                        )}>
                          {file.changeType === 'created' ? 'A' : file.changeType === 'deleted' ? 'D' : 'M'}
                        </span>
                        <span className="text-2xs font-mono text-fg-secondary truncate">
                          {file.path}
                        </span>
                        <span className="text-3xs font-mono text-fg-ghost ml-auto shrink-0">
                          +{file.additions} -{file.deletions}
                        </span>
                      </button>
                    ))}
                  </div>
                  {/* file content */}
                  <ScrollArea className="flex-1">
                    <div className="p-4">
                      {selectedFileContent ? (
                        <CodeBlock code={selectedFileContent.content} language="typescript" />
                      ) : (
                        <p className="label-mono text-fg-ghost text-center pt-12">
                          Select a file
                        </p>
                      )}
                    </div>
                  </ScrollArea>
                </div>
              )}
            </TabsContent>
          </Tabs>
        )}
      </div>

      {/* ── RIGHT: Chat ─────────────────────────────────────────────────── */}
      {chatOpen ? (
        <div className="w-[320px] shrink-0 flex flex-col border-l border-hair bg-base">

          {/* header */}
          <div className="flex items-center justify-between px-4 h-toolbar border-b border-hair shrink-0">
            <div className="flex items-center gap-2">
              <MessageSquare className="size-3.5 text-fg-dim" />
              <span className="label-mono text-fg-ghost">Agent</span>
            </div>
            <Button
              size="icon-sm"
              variant="ghost"
              onClick={() => setChatOpen(false)}
              title="Collapse chat"
            >
              <ChevronRight className="size-3.5" />
            </Button>
          </div>

          {/* messages */}
          <ScrollArea className="flex-1">
            <div className="p-3 space-y-3">
              {chatLog.length === 0 && (
                <p className="label-mono text-fg-ghost text-center pt-8">
                  {isActive ? 'Listening…' : 'No messages yet'}
                </p>
              )}
              {chatLog.map(entry => (
                <div
                  key={entry.id}
                  className={cn(
                    'rounded-lg p-3 space-y-1',
                    entry.origin === 'agent'
                      ? 'bg-raised border border-hair'
                      : 'bg-purple-600/10 border border-purple-500/20 ml-4',
                  )}
                >
                  <div className="flex items-center justify-between">
                    <span className={cn(
                      'text-3xs font-mono uppercase tracking-widest',
                      entry.origin === 'agent' ? 'text-fg-dim' : 'text-purple-400',
                    )}>
                      {entry.origin === 'agent' ? 'Jules' : 'You'}
                    </span>
                    <span className="text-3xs font-mono text-fg-ghost">
                      {entry.time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <p className="text-xxs text-fg-secondary leading-relaxed whitespace-pre-wrap">
                    {entry.message}
                  </p>
                </div>
              ))}
              <div ref={chatEndRef} />
            </div>
          </ScrollArea>

          {/* input */}
          {sessionId && (
            <div className="p-3 border-t border-hair shrink-0">
              <div className="flex gap-1.5">
                <Input
                  value={chatInput}
                  onChange={e => setChatInput(e.target.value)}
                  placeholder="Message Jules…"
                  className="font-mono text-2xs"
                  onKeyDown={e => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault()
                      handleSendChat()
                    }
                  }}
                />
                <Button
                  size="icon-sm"
                  onClick={handleSendChat}
                  disabled={!chatInput.trim()}
                >
                  <Send className="size-3.5" />
                </Button>
              </div>
            </div>
          )}
        </div>
      ) : (
        /* collapsed chat toggle */
        <div className="w-10 shrink-0 flex flex-col items-center border-l border-hair bg-base pt-3">
          <Button
            size="icon-sm"
            variant="ghost"
            onClick={() => setChatOpen(true)}
            title="Open chat"
          >
            <ChevronLeft className="size-3.5" />
          </Button>
          <div className="mt-2 flex flex-col items-center">
            <MessageSquare className="size-3.5 text-fg-dim" />
            {chatLog.length > 0 && (
              <span className="text-3xs font-mono text-fg-dim mt-1">{chatLog.length}</span>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
