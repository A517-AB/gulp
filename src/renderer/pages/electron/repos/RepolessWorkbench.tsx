import { useEffect, useMemo, useState } from 'react'
import { useJulesLocalSession } from '@/hooks/use-jules-local-session'
import {
  localJules,
  type JulesLocalSessionOutcome,
  type JulesLocalSessionSnapshot,
} from '@/lib/jules/local'
import { Button } from '@/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/ui/card'
import { Input } from '@/ui/input'
import { Textarea } from '@/ui/textarea'
import {
  formatTimestamp,
  getStateToneClass,
  pickFilePath,
  summarizeActivity,
  summarizeArtifacts,
} from './utils'

const DEFAULT_REPOLESS_PROMPT = [
  'Read the context I provide and work entirely repoless.',
  'If you need to propose files, return concrete file content or markdown artifacts.',
  'Keep the result directly actionable.',
].join('\n')

export function RepolessWorkbench() {
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [title, setTitle] = useState('')
  const [prompt, setPrompt] = useState(DEFAULT_REPOLESS_PROMPT)
  const [resumeId, setResumeId] = useState('')
  const [messageDraft, setMessageDraft] = useState('')
  const [requireApproval, setRequireApproval] = useState(false)
  const [snapshot, setSnapshot] = useState<JulesLocalSessionSnapshot | null>(null)
  const [outcome, setOutcome] = useState<JulesLocalSessionOutcome | null>(null)
  const [selectedFilePath, setSelectedFilePath] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  const [loadingSnapshot, setLoadingSnapshot] = useState(false)
  const [loadingOutcome, setLoadingOutcome] = useState(false)

  const {
    session,
    activities,
    generatedFiles,
    loadingSession,
    loadingFiles,
    streaming,
    error,
    refreshSession,
    refreshActivities,
    hydrateSession,
    loadFiles,
    loadMarkdownFiles,
    approve,
    sendMessage,
    ask,
    startStream,
    stopStream,
  } = useJulesLocalSession(sessionId, { autoStart: true })

  const selectedFile = useMemo(
    () => generatedFiles.find((file) => file.path === selectedFilePath) ?? null,
    [generatedFiles, selectedFilePath],
  )

  useEffect(() => {
    setSelectedFilePath((current) => pickFilePath(generatedFiles, current))
  }, [generatedFiles])

  useEffect(() => {
    setSnapshot(null)
    setOutcome(null)
  }, [sessionId])

  const combinedError = actionError ?? error

  const handleCreateSession = async () => {
    if (!prompt.trim()) {
      setActionError('A repoless prompt is required.')
      return
    }

    try {
      setCreating(true)
      setActionError(null)
      const request = {
        prompt: prompt.trim(),
        requireApproval,
        ...(title.trim() ? { title: title.trim() } : {}),
      }
      const info = await localJules.createSession(request)
      setSessionId(info.id)
      setResumeId(info.id)
    } catch (cause) {
      setActionError(cause instanceof Error ? cause.message : 'Failed to create the repoless session.')
    } finally {
      setCreating(false)
    }
  }

  const handleResumeSession = async () => {
    if (!resumeId.trim()) {
      setActionError('Enter an existing session ID to resume it.')
      return
    }

    try {
      setCreating(true)
      setActionError(null)
      const info = await localJules.resumeSession(resumeId.trim())
      setSessionId(info.id)
    } catch (cause) {
      setActionError(cause instanceof Error ? cause.message : 'Failed to resume the repoless session.')
    } finally {
      setCreating(false)
    }
  }

  const handleAsk = async () => {
    if (!messageDraft.trim()) {
      return
    }

    try {
      setActionError(null)
      await ask(messageDraft.trim())
      setMessageDraft('')
      await refreshSession()
    } catch (cause) {
      setActionError(cause instanceof Error ? cause.message : 'Failed to ask Jules for a reply.')
    }
  }

  const handleSend = async () => {
    if (!messageDraft.trim()) {
      return
    }

    try {
      setActionError(null)
      await sendMessage(messageDraft.trim())
      setMessageDraft('')
      await refreshSession()
    } catch (cause) {
      setActionError(cause instanceof Error ? cause.message : 'Failed to send the follow-up message.')
    }
  }

  const handleSnapshot = async () => {
    if (!sessionId) {
      return
    }

    try {
      setLoadingSnapshot(true)
      setActionError(null)
      setSnapshot(await localJules.getSnapshot(sessionId))
    } catch (cause) {
      setActionError(cause instanceof Error ? cause.message : 'Failed to load the session snapshot.')
    } finally {
      setLoadingSnapshot(false)
    }
  }

  const handleOutcome = async () => {
    if (!sessionId) {
      return
    }

    if (session && session.state !== 'completed' && session.state !== 'failed') {
      setActionError('Wait for the session to finish before requesting the final outcome.')
      return
    }

    try {
      setLoadingOutcome(true)
      setActionError(null)
      const result = await localJules.getResult(sessionId)
      setOutcome(result)
      await loadFiles()
    } catch (cause) {
      setActionError(cause instanceof Error ? cause.message : 'Failed to load the session outcome.')
    } finally {
      setLoadingOutcome(false)
    }
  }

  return (
    <div className="grid gap-4 xl:grid-cols-[420px_minmax(0,1fr)]">
      <div className="space-y-4">
        <Card className="border-white/5 bg-black/40 backdrop-blur-xl shadow-2xl text-white transition-all duration-500 hover:bg-black/50">
          <CardHeader>
            <CardTitle>Start or resume repoless</CardTitle>
            <CardDescription className="text-white/60">
              This uses the interactive Jules session route with no repository attached, then keeps the transcript and generated files live through the local bridge.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-xs uppercase tracking-[0.24em] text-white/50">Title</label>
              <Input
                value={title}
                onChange={(event) => { setTitle(event.target.value); }}
                placeholder="Repoless design review"
                className="border-white/10 bg-black/60 text-white placeholder:text-zinc-600 focus:border-sky-500/50 focus:ring-sky-500/20 transition-all duration-300"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs uppercase tracking-[0.24em] text-white/50">Initial prompt</label>
              <Textarea
                value={prompt}
                onChange={(event) => { setPrompt(event.target.value); }}
                className="min-h-[150px] border-white/10 bg-black/60 text-white placeholder:text-zinc-600 focus:border-sky-500/50 focus:ring-sky-500/20 transition-all duration-300"
              />
            </div>

            <label className="flex items-center gap-3 rounded-md border border-white/10 bg-black/30 px-3 py-2 text-sm text-white/70">
              <input
                type="checkbox"
                checked={requireApproval}
                onChange={(event) => { setRequireApproval(event.target.checked); }}
                className="size-3.5 appearance-none rounded border border-white/20 bg-black/40 checked:bg-sky-500 checked:border-sky-500 transition-all focus:ring-1 focus:ring-sky-500/50 cursor-pointer"
              />
              Require plan approval before execution
            </label>

            <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto]">
              <Input
                value={resumeId}
                onChange={(event) => { setResumeId(event.target.value); }}
                placeholder="Existing session id"
                className="border-white/10 bg-black/60 text-white placeholder:text-zinc-600 focus:border-sky-500/50 focus:ring-sky-500/20 transition-all duration-300"
              />
              <Button
                variant="outline"
                onClick={() => {
                  void handleResumeSession()
                }}
                disabled={creating}
                className="border-white/10 bg-white/5 text-zinc-300 hover:bg-white/10 hover:text-white transition-all"
              >
                Resume Existing
              </Button>
            </div>

            <Button
              onClick={() => {
                void handleCreateSession()
              }}
              disabled={creating}
              className="w-full"
            >
              {creating ? 'Starting...' : 'Start Repoless Session'}
            </Button>

            {combinedError && (
              <div className="rounded-md border border-red-400/20 bg-red-500/10 px-3 py-2 text-sm text-red-200">
                {combinedError}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-white/5 bg-black/40 backdrop-blur-xl shadow-2xl text-white transition-all duration-500 hover:bg-black/50">
          <CardHeader>
            <CardTitle>Session controls</CardTitle>
            <CardDescription className="text-white/60">
              Refresh the cached activity history, inspect snapshot analytics, or pull the final outcome after completion.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {session ? (
              <>
                <div className="flex flex-wrap items-center gap-2 text-sm text-white/70">
                  <span className={`rounded-full px-2 py-1 text-xs font-medium ${getStateToneClass(session.state)}`}>
                    {session.state}
                  </span>
                  <span>Updated {formatTimestamp(session.updatedAt)}</span>
                </div>

                <div className="grid gap-2 text-sm text-white/70">
                  <div>ID: <span className="font-mono text-white/90">{session.id}</span></div>
                  <div>Created: {formatTimestamp(session.createdAt)}</div>
                  <div>Outputs: {session.outputTypes.join(', ') || 'none yet'}</div>
                  {session.url && (
                    <a
                      href={session.url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-sky-300 underline-offset-4 hover:underline"
                    >
                      Open session in Jules
                    </a>
                  )}
                </div>

                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    onClick={() => {
                      void refreshSession()
                    }}
                    disabled={loadingSession}
                    className="border-white/10 bg-white/5 text-zinc-300 hover:bg-white/10 hover:text-white transition-all"
                  >
                    {loadingSession ? 'Refreshing...' : 'Refresh Session'}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      void refreshActivities()
                    }}
                    className="border-white/10 bg-white/5 text-zinc-300 hover:bg-white/10 hover:text-white transition-all"
                  >
                    Refresh Transcript
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      void hydrateSession()
                    }}
                    className="border-white/10 bg-white/5 text-zinc-300 hover:bg-white/10 hover:text-white transition-all"
                  >
                    Hydrate Cache
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      void handleSnapshot()
                    }}
                    disabled={loadingSnapshot}
                    className="border-white/10 bg-white/5 text-zinc-300 hover:bg-white/10 hover:text-white transition-all"
                  >
                    {loadingSnapshot ? 'Loading Snapshot...' : 'Load Snapshot'}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      void handleOutcome()
                    }}
                    disabled={loadingOutcome}
                    className="border-white/10 bg-white/5 text-zinc-300 hover:bg-white/10 hover:text-white transition-all"
                  >
                    {loadingOutcome ? 'Loading Outcome...' : 'Load Outcome'}
                  </Button>
                </div>

                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    onClick={() => {
                      void loadMarkdownFiles()
                    }}
                    disabled={loadingFiles}
                    className="border-white/10 bg-white/5 text-zinc-300 hover:bg-white/10 hover:text-white transition-all"
                  >
                    Markdown Files
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      void loadFiles()
                    }}
                    disabled={loadingFiles}
                    className="border-white/10 bg-white/5 text-zinc-300 hover:bg-white/10 hover:text-white transition-all"
                  >
                    {loadingFiles ? 'Loading Files...' : 'All Files'}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      void (streaming ? stopStream() : startStream())
                    }}
                    className="border-white/10 bg-white/5 text-zinc-300 hover:bg-white/10 hover:text-white transition-all"
                  >
                    {streaming ? 'Stop Stream' : 'Start Stream'}
                  </Button>
                  {session.state === 'awaitingPlanApproval' && (
                    <Button
                      onClick={() => {
                        void approve()
                      }}
                    >
                      Approve Plan
                    </Button>
                  )}
                </div>

                {(snapshot || outcome) && (
                  <div className="grid gap-3 md:grid-cols-2">
                    {snapshot && (
                      <div className="rounded-xl border border-white/5 bg-white/5 p-4 shadow-inner backdrop-blur-md text-sm text-white/70 transition-colors hover:bg-white/10">
                        <div className="text-xs uppercase tracking-[0.24em] text-white/40">Snapshot</div>
                        <div className="mt-2">Duration: {(snapshot.durationMs / 1000).toFixed(1)}s</div>
                        <div>Timeline entries: {snapshot.timeline.length}</div>
                        <div>Generated files: {snapshot.generatedFiles.length}</div>
                        <div>Failed commands: {snapshot.insights.failedCommandCount}</div>
                      </div>
                    )}
                    {outcome && (
                      <div className="rounded-xl border border-white/5 bg-white/5 p-4 shadow-inner backdrop-blur-md text-sm text-white/70 transition-colors hover:bg-white/10">
                        <div className="text-xs uppercase tracking-[0.24em] text-white/40">Outcome</div>
                        <div className="mt-2">State: {outcome.state}</div>
                        <div>Generated files: {outcome.generatedFiles.length}</div>
                        <div>Outputs: {outcome.outputTypes.join(', ') || 'none'}</div>
                        {outcome.pullRequestUrl && (
                          <a
                            href={outcome.pullRequestUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="mt-1 block text-sky-300 underline-offset-4 hover:underline"
                          >
                            {outcome.pullRequestTitle ?? 'Open pull request'}
                          </a>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </>
            ) : (
              <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-white/10 bg-white/[0.02] px-6 py-10 text-center text-sm font-medium text-zinc-500 shadow-inner">
                Start or resume a repoless session to unlock the controls.
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(320px,420px)]">
        <Card className="border-white/5 bg-black/40 backdrop-blur-xl shadow-2xl text-white transition-all duration-500 hover:bg-black/50">
          <CardHeader>
            <CardTitle>Transcript</CardTitle>
            <CardDescription className="text-white/60">
              Cached history plus live stream events. Use Ask for request-response or Send for fire-and-forget follow-ups.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="max-h-[560px] space-y-3 overflow-auto pr-2">
              {activities.length > 0 ? (
                activities.map((activity) => {
                  const artifactSummary = summarizeArtifacts(activity)

                  return (
                    <div key={activity.id} className="rounded-xl border border-white/5 bg-white/[0.03] p-4 transition-all hover:bg-white/[0.06] hover:shadow-lg">
                      <div className="flex flex-wrap items-center justify-between gap-2 text-xs uppercase tracking-[0.22em] text-white/40">
                        <span>{activity.type}</span>
                        <span>{formatTimestamp(activity.createTime)}</span>
                      </div>
                      <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-white/90">
                        {summarizeActivity(activity)}
                      </p>
                      {artifactSummary && (
                        <p className="mt-2 text-xs text-white/50">{artifactSummary}</p>
                      )}
                    </div>
                  )
                })
              ) : (
                <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-white/10 bg-white/[0.02] px-6 py-10 text-center text-sm font-medium text-zinc-500 shadow-inner">
                  No activity history yet.
                </div>
              )}
            </div>

            <div className="space-y-3 border-t border-white/10 pt-4">
              <Textarea
                value={messageDraft}
                onChange={(event) => { setMessageDraft(event.target.value); }}
                placeholder="Ask for a refinement, request a markdown artifact, or continue the task..."
                className="min-h-[120px] border-white/10 bg-black/60 text-white placeholder:text-zinc-600 focus:border-sky-500/50 focus:ring-sky-500/20 transition-all duration-300"
              />
              <div className="flex flex-wrap gap-2">
                <Button
                  onClick={() => {
                    void handleAsk()
                  }}
                  disabled={!sessionId || !messageDraft.trim()}
                >
                  Ask and Wait
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    void handleSend()
                  }}
                  disabled={!sessionId || !messageDraft.trim()}
                  className="border-white/10 bg-white/5 text-zinc-300 hover:bg-white/10 hover:text-white transition-all"
                >
                  Send Only
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card className="border-white/5 bg-black/40 backdrop-blur-xl shadow-2xl text-white transition-all duration-500 hover:bg-black/50">
            <CardHeader>
              <CardTitle>Generated files</CardTitle>
              <CardDescription className="text-white/60">
                Pull markdown-only files or the full generated file set, then inspect the content locally.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="max-h-[220px] space-y-2 overflow-auto pr-2">
                {generatedFiles.length > 0 ? (
                  generatedFiles.map((file) => (
                    <button
                      key={file.path}
                      type="button"
                      onClick={() => { setSelectedFilePath(file.path); }}
                      className={`group w-full rounded-xl border px-4 py-3 text-left transition-all duration-300 ${selectedFilePath === file.path ? 'border-sky-500/50 bg-sky-500/10 text-white shadow-[0_0_15px_rgba(14,165,233,0.15)]' : 'border-white/5 bg-white/5 text-zinc-400 hover:border-white/20 hover:bg-white/10 hover:text-zinc-200'}`}
                    >
                      <div className="font-mono text-xs text-white/90">{file.path}</div>
                      <div className="mt-1 text-[11px] uppercase tracking-[0.24em] text-white/40">
                        {file.changeType} • +{file.additions} / -{file.deletions}
                      </div>
                    </button>
                  ))
                ) : (
                  <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-white/10 bg-white/[0.02] px-6 py-10 text-center text-sm font-medium text-zinc-500 shadow-inner">
                    No generated files loaded yet.
                  </div>
                )}
              </div>

              <div className="rounded-xl border border-white/5 bg-white/5 p-4 shadow-inner backdrop-blur-md transition-colors hover:bg-white/10">
                <div className="mb-2 text-xs uppercase tracking-[0.22em] text-white/40">
                  {selectedFile?.path ?? 'File preview'}
                </div>
                <pre className="max-h-[340px] overflow-auto whitespace-pre-wrap text-xs leading-6 text-white/80">
                  {selectedFile?.content || 'Select a generated file to inspect its content.'}
                </pre>
              </div>
            </CardContent>
          </Card>

          <Card className="border-white/5 bg-black/40 backdrop-blur-xl shadow-2xl text-white transition-all duration-500 hover:bg-black/50">
            <CardHeader>
              <CardTitle>Snapshot markdown</CardTitle>
              <CardDescription className="text-white/60">
                The SDK snapshot summary is useful when you want a compact run report without opening the Jules web UI.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <pre className="max-h-[320px] overflow-auto whitespace-pre-wrap rounded-xl border border-white/10 bg-black/30 p-3 text-xs leading-6 text-white/80">
                {snapshot?.markdown || 'Load a snapshot to inspect the derived markdown summary.'}
              </pre>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}