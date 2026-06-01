import { useDeferredValue, useEffect, useMemo, useState } from 'react'
import { useJulesLocalSession } from '@/hooks/use-jules-local-session'
import {
  localJules,
  type JulesLocalFleetIssueFixResult,
  type JulesLocalSessionOutcome,
  type JulesLocalSessionSnapshot,
  type JulesLocalSource,
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
  mergeRepositoryList,
  parseRepositoryList,
  pickFilePath,
  summarizeActivity,
  summarizeArtifacts,
} from './utils'

const DEFAULT_FLEET_PROMPT = [
  'Investigate the issue, implement a fix, and run the most relevant checks for the repository.',
  'Keep the change narrowly scoped and summarize the result in the final session output.',
].join('\n')

export function FleetIssueDispatch() {
  const [repositoriesRaw, setRepositoriesRaw] = useState('')
  const [issue, setIssue] = useState(DEFAULT_FLEET_PROMPT)
  const [branch, setBranch] = useState('main')
  const [titlePrefix, setTitlePrefix] = useState('Fleet fix')
  const [concurrency, setConcurrency] = useState('2')
  const [delayMs, setDelayMs] = useState('0')
  const [autoPr, setAutoPr] = useState(true)
  const [requireApproval, setRequireApproval] = useState(false)
  const [stopOnError, setStopOnError] = useState(false)
  const [sources, setSources] = useState<JulesLocalSource[]>([])
  const [loadingSources, setLoadingSources] = useState(false)
  const [sourceError, setSourceError] = useState<string | null>(null)
  const [sourceQuery, setSourceQuery] = useState('')
  const [dispatching, setDispatching] = useState(false)
  const [dispatchError, setDispatchError] = useState<string | null>(null)
  const [results, setResults] = useState<JulesLocalFleetIssueFixResult[]>([])
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null)
  const [selectedFilePath, setSelectedFilePath] = useState<string | null>(null)
  const [snapshot, setSnapshot] = useState<JulesLocalSessionSnapshot | null>(null)
  const [outcome, setOutcome] = useState<JulesLocalSessionOutcome | null>(null)
  const [loadingSnapshot, setLoadingSnapshot] = useState(false)
  const [loadingOutcome, setLoadingOutcome] = useState(false)

  const repositoryList = useMemo(
    () => parseRepositoryList(repositoriesRaw),
    [repositoriesRaw],
  )

  const deferredSourceQuery = useDeferredValue(sourceQuery)
  const filteredSources = useMemo(() => {
    const query = deferredSourceQuery.trim().toLowerCase()
    if (!query) {
      return sources
    }

    return sources.filter((source) =>
      [source.fullName, source.owner, source.repo]
        .some((value) => value.toLowerCase().includes(query)),
    )
  }, [deferredSourceQuery, sources])

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
    startStream,
    stopStream,
  } = useJulesLocalSession(selectedSessionId, { autoStart: false })

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
  }, [selectedSessionId])

  const loadSources = async () => {
    try {
      setLoadingSources(true)
      setSourceError(null)
      setSources(await localJules.listSources())
    } catch (cause) {
      setSourceError(cause instanceof Error ? cause.message : 'Failed to load connected Jules sources.')
    } finally {
      setLoadingSources(false)
    }
  }

  useEffect(() => {
    void loadSources()
  }, [])

  const appendRepository = (repository: string) => {
    setRepositoriesRaw((current) => mergeRepositoryList(current, repository))
  }

  const handleDispatch = async () => {
    if (!issue.trim()) {
      setDispatchError('A fleet issue prompt is required.')
      return
    }

    if (repositoryList.length === 0) {
      setDispatchError('Add at least one repository before dispatching the fleet run.')
      return
    }

    try {
      setDispatching(true)
      setDispatchError(null)
      const request = {
        repositories: repositoryList,
        issue: issue.trim(),
        autoPr,
        requireApproval,
        stopOnError,
        ...(branch.trim() ? { branch: branch.trim() } : {}),
        ...(titlePrefix.trim() ? { titlePrefix: titlePrefix.trim() } : {}),
        ...(Number(concurrency) > 0 ? { concurrency: Number(concurrency) } : {}),
        ...(Number(delayMs) > 0 ? { delayMs: Number(delayMs) } : {}),
      }
      const nextResults = await localJules.dispatchFleetIssueFix(request)

      setResults(nextResults)
      setSelectedSessionId(nextResults[0]?.session.id ?? null)
    } catch (cause) {
      setDispatchError(cause instanceof Error ? cause.message : 'Failed to dispatch the fleet issue fix request.')
    } finally {
      setDispatching(false)
    }
  }

  const handleRefreshResults = async () => {
    if (!results.length) {
      return
    }

    try {
      setDispatchError(null)
      const refreshed = await Promise.all(
        results.map(async (item) => ({
          repository: item.repository,
          session: await localJules.getSession(item.session.id),
        })),
      )
      setResults(refreshed)
    } catch (cause) {
      setDispatchError(cause instanceof Error ? cause.message : 'Failed to refresh fleet session states.')
    }
  }

  const handleSnapshot = async () => {
    if (!selectedSessionId) {
      return
    }

    try {
      setLoadingSnapshot(true)
      setDispatchError(null)
      setSnapshot(await localJules.getSnapshot(selectedSessionId))
    } catch (cause) {
      setDispatchError(cause instanceof Error ? cause.message : 'Failed to load the selected session snapshot.')
    } finally {
      setLoadingSnapshot(false)
    }
  }

  const handleOutcome = async () => {
    if (!selectedSessionId) {
      return
    }

    if (session && session.state !== 'completed' && session.state !== 'failed') {
      setDispatchError('Wait for the selected session to finish before requesting the final outcome.')
      return
    }

    try {
      setLoadingOutcome(true)
      setDispatchError(null)
      const result = await localJules.getResult(selectedSessionId)
      setOutcome(result)
      await loadFiles()
    } catch (cause) {
      setDispatchError(cause instanceof Error ? cause.message : 'Failed to load the selected session outcome.')
    } finally {
      setLoadingOutcome(false)
    }
  }

  const combinedError = dispatchError ?? sourceError ?? error

  return (
    <div className="grid gap-4 xl:grid-cols-[420px_360px_minmax(0,1fr)]">
      <div className="space-y-4">
        <Card className="border-white/5 bg-black/40 backdrop-blur-xl shadow-2xl text-white transition-all duration-500 hover:bg-black/50">
          <CardHeader>
            <CardTitle>Dispatch a fleet issue fix</CardTitle>
            <CardDescription className="text-white/55">
              One repo per line or comma-separated. The Electron bridge fans these out through the Jules SDK and returns concrete session IDs immediately.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-xs uppercase tracking-[0.24em] text-white/45">Repositories</label>
              <Textarea
                value={repositoriesRaw}
                onChange={(event) => setRepositoriesRaw(event.target.value)}
                placeholder="owner/repo-a&#10;owner/repo-b"
                className="min-h-[150px] border-white/10 bg-black/60 text-white placeholder:text-zinc-600 focus:border-sky-500/50 focus:ring-sky-500/20 transition-all duration-300"
              />
              <p className="text-xs text-white/40">{repositoryList.length} unique repositories queued</p>
            </div>

            <div className="space-y-2">
              <label className="text-xs uppercase tracking-[0.24em] text-white/45">Issue prompt</label>
              <Textarea
                value={issue}
                onChange={(event) => setIssue(event.target.value)}
                className="min-h-[160px] border-white/10 bg-black/60 text-white placeholder:text-zinc-600 focus:border-sky-500/50 focus:ring-sky-500/20 transition-all duration-300"
              />
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <label className="text-xs uppercase tracking-[0.24em] text-white/45">Base branch</label>
                <Input
                  value={branch}
                  onChange={(event) => setBranch(event.target.value)}
                  className="border-white/10 bg-black/60 text-white placeholder:text-zinc-600 focus:border-sky-500/50 focus:ring-sky-500/20 transition-all duration-300"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs uppercase tracking-[0.24em] text-white/45">Title prefix</label>
                <Input
                  value={titlePrefix}
                  onChange={(event) => setTitlePrefix(event.target.value)}
                  className="border-white/10 bg-black/60 text-white placeholder:text-zinc-600 focus:border-sky-500/50 focus:ring-sky-500/20 transition-all duration-300"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs uppercase tracking-[0.24em] text-white/45">Concurrency</label>
                <Input
                  type="number"
                  min="1"
                  value={concurrency}
                  onChange={(event) => setConcurrency(event.target.value)}
                  className="border-white/10 bg-black/60 text-white placeholder:text-zinc-600 focus:border-sky-500/50 focus:ring-sky-500/20 transition-all duration-300"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs uppercase tracking-[0.24em] text-white/45">Inter-run delay (ms)</label>
                <Input
                  type="number"
                  min="0"
                  value={delayMs}
                  onChange={(event) => setDelayMs(event.target.value)}
                  className="border-white/10 bg-black/60 text-white placeholder:text-zinc-600 focus:border-sky-500/50 focus:ring-sky-500/20 transition-all duration-300"
                />
              </div>
            </div>

            <div className="grid gap-2 text-sm text-white/70">
              <label className="flex items-center gap-3 rounded-md border border-white/10 bg-black/25 px-3 py-2">
                <input
                  type="checkbox"
                  checked={autoPr}
                  onChange={(event) => setAutoPr(event.target.checked)}
                  className="size-4 rounded border-white/20 bg-black"
                />
                Auto-create PR when possible
              </label>
              <label className="flex items-center gap-3 rounded-md border border-white/10 bg-black/25 px-3 py-2">
                <input
                  type="checkbox"
                  checked={requireApproval}
                  onChange={(event) => setRequireApproval(event.target.checked)}
                  className="size-4 rounded border-white/20 bg-black"
                />
                Require plan approval on every run
              </label>
              <label className="flex items-center gap-3 rounded-md border border-white/10 bg-black/25 px-3 py-2">
                <input
                  type="checkbox"
                  checked={stopOnError}
                  onChange={(event) => setStopOnError(event.target.checked)}
                  className="size-4 rounded border-white/20 bg-black"
                />
                Stop the fleet if a repo fails early
              </label>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button
                onClick={() => {
                  void handleDispatch()
                }}
                disabled={dispatching}
              >
                {dispatching ? 'Dispatching...' : 'Dispatch Fleet'}
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  void handleRefreshResults()
                }}
                disabled={!results.length}
                className="border-white/10 bg-white/5 text-zinc-300 hover:bg-white/10 hover:text-white transition-all"
              >
                Refresh Fleet States
              </Button>
            </div>

            {combinedError && (
              <div className="rounded-md border border-red-400/20 bg-red-500/10 px-3 py-2 text-sm text-red-200">
                {combinedError}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-white/5 bg-black/40 backdrop-blur-xl shadow-2xl text-white transition-all duration-500 hover:bg-black/50">
          <CardHeader>
            <CardTitle>Connected sources</CardTitle>
            <CardDescription className="text-white/55">
              Pull connected repos from Jules locally, filter them fast, and drop them straight into the fleet target list.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex gap-2">
              <Input
                value={sourceQuery}
                onChange={(event) => setSourceQuery(event.target.value)}
                placeholder="Filter connected repos"
                className="border-white/10 bg-black/60 text-white placeholder:text-zinc-600 focus:border-sky-500/50 focus:ring-sky-500/20 transition-all duration-300"
              />
              <Button
                variant="outline"
                onClick={() => {
                  void loadSources()
                }}
                disabled={loadingSources}
                className="border-white/10 bg-white/5 text-zinc-300 hover:bg-white/10 hover:text-white transition-all"
              >
                {loadingSources ? 'Loading...' : 'Reload'}
              </Button>
            </div>

            <div className="max-h-[420px] space-y-2 overflow-auto pr-2">
              {filteredSources.length > 0 ? (
                filteredSources.slice(0, 40).map((source) => (
                  <div key={source.id} className="rounded-xl border border-white/5 bg-white/[0.03] p-4 transition-all hover:bg-white/[0.06] hover:shadow-lg">
                    <div className="font-mono text-sm text-white/90">{source.fullName}</div>
                    <div className="mt-1 text-xs uppercase tracking-[0.22em] text-white/35">
                      {source.defaultBranch ?? 'no default branch'} • {source.isPrivate ? 'private' : 'public'}
                    </div>
                    <div className="mt-3 flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => appendRepository(source.fullName)}
                      >
                        Add to Fleet
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setSourceQuery(source.fullName)}
                        className="border-white/10 bg-white/5 text-zinc-300 hover:bg-white/10 hover:text-white transition-all"
                      >
                        Focus
                      </Button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-white/10 bg-white/[0.02] px-6 py-10 text-center text-sm font-medium text-zinc-500 shadow-inner">
                  {loadingSources ? 'Loading connected sources...' : 'No connected sources matched the current filter.'}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-white/5 bg-black/40 backdrop-blur-xl shadow-2xl text-white transition-all duration-500 hover:bg-black/50">
        <CardHeader>
          <CardTitle>Fleet sessions</CardTitle>
          <CardDescription className="text-white/55">
            Each dispatch returns real session IDs immediately. Pick one to inspect its live transcript, outputs, and final result.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="max-h-[920px] space-y-2 overflow-auto pr-2">
            {results.length > 0 ? (
              results.map((item) => {
                const active = selectedSessionId === item.session.id

                return (
                  <button
                    key={item.session.id}
                    type="button"
                    onClick={() => setSelectedSessionId(item.session.id)}
                    className={`group w-full rounded-xl border px-4 py-3 text-left transition-all duration-300 ${active ? 'border-sky-500/50 bg-sky-500/10 shadow-[0_0_15px_rgba(14,165,233,0.15)]' : 'border-white/5 bg-white/5 hover:border-white/20 hover:bg-white/10'}`}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <div className="font-mono text-sm text-white/90">{item.repository}</div>
                        <div className="mt-1 text-xs text-white/40">{item.session.title || 'Untitled session'}</div>
                      </div>
                      <span className={`rounded-full px-2 py-1 text-xs font-medium ${getStateToneClass(item.session.state)}`}>
                        {item.session.state}
                      </span>
                    </div>
                    <div className="mt-3 grid gap-1 text-xs text-white/45">
                      <div>Session ID: {item.session.id}</div>
                      <div>Updated: {formatTimestamp(item.session.updatedAt)}</div>
                      {item.session.pullRequestUrl && <div>PR ready</div>}
                    </div>
                  </button>
                )
              })
            ) : (
              <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-white/10 bg-white/[0.02] px-6 py-10 text-center text-sm font-medium text-zinc-500 shadow-inner">
                Dispatch a fleet run to populate this list.
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="space-y-4">
        <Card className="border-white/5 bg-black/40 backdrop-blur-xl shadow-2xl text-white transition-all duration-500 hover:bg-black/50">
          <CardHeader>
            <CardTitle>Selected session inspector</CardTitle>
            <CardDescription className="text-white/55">
              Inspect one session in detail without leaving the app.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {session ? (
              <>
                <div className="flex flex-wrap items-center gap-2 text-sm text-white/70">
                  <span className={`rounded-full px-2 py-1 text-xs font-medium ${getStateToneClass(session.state)}`}>
                    {session.state}
                  </span>
                  <span>{session.source ?? 'repoless'}</span>
                  <span>Updated {formatTimestamp(session.updatedAt)}</span>
                </div>

                <div className="grid gap-2 text-sm text-white/65">
                  <div className="font-mono text-white/85">{session.id}</div>
                  <div>{session.title || 'Untitled session'}</div>
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
                  {session.pullRequestUrl && (
                    <a
                      href={session.pullRequestUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-emerald-300 underline-offset-4 hover:underline"
                    >
                      Open pull request
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
                      void (streaming ? stopStream() : startStream())
                    }}
                    className="border-white/10 bg-white/5 text-zinc-300 hover:bg-white/10 hover:text-white transition-all"
                  >
                    {streaming ? 'Stop Stream' : 'Start Stream'}
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
                      void handleSnapshot()
                    }}
                    disabled={loadingSnapshot}
                    className="border-white/10 bg-white/5 text-zinc-300 hover:bg-white/10 hover:text-white transition-all"
                  >
                    {loadingSnapshot ? 'Loading Snapshot...' : 'Snapshot'}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      void handleOutcome()
                    }}
                    disabled={loadingOutcome}
                    className="border-white/10 bg-white/5 text-zinc-300 hover:bg-white/10 hover:text-white transition-all"
                  >
                    {loadingOutcome ? 'Loading Outcome...' : 'Outcome'}
                  </Button>
                </div>

                {(snapshot || outcome) && (
                  <div className="grid gap-3 md:grid-cols-2">
                    {snapshot && (
                      <div className="rounded-xl border border-white/5 bg-white/5 p-4 shadow-inner backdrop-blur-md text-sm text-white/70 transition-colors hover:bg-white/10">
                        <div className="text-xs uppercase tracking-[0.24em] text-white/40">Snapshot</div>
                        <div className="mt-2">Timeline entries: {snapshot.timeline.length}</div>
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
                            className="mt-1 block text-emerald-300 underline-offset-4 hover:underline"
                          >
                            {outcome.pullRequestTitle ?? 'Open pull request'}
                          </a>
                        )}
                      </div>
                    )}
                  </div>
                )}

                <div className="max-h-[240px] space-y-3 overflow-auto pr-2">
                  {activities.length > 0 ? (
                    activities.map((activity) => {
                      const artifactSummary = summarizeArtifacts(activity)

                      return (
                        <div key={activity.id} className="rounded-xl border border-white/5 bg-white/[0.03] p-4 transition-all hover:bg-white/[0.06] hover:shadow-lg">
                          <div className="flex flex-wrap items-center justify-between gap-2 text-xs uppercase tracking-[0.22em] text-white/40">
                            <span>{activity.type}</span>
                            <span>{formatTimestamp(activity.createTime)}</span>
                          </div>
                          <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-white/85">
                            {summarizeActivity(activity)}
                          </p>
                          {artifactSummary && (
                            <p className="mt-2 text-xs text-white/45">{artifactSummary}</p>
                          )}
                        </div>
                      )
                    })
                  ) : (
                    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-white/10 bg-white/[0.02] px-6 py-10 text-center text-sm font-medium text-zinc-500 shadow-inner">
                      No activity history loaded for the selected session yet.
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-white/10 bg-white/[0.02] px-6 py-10 text-center text-sm font-medium text-zinc-500 shadow-inner">
                Pick a fleet session to inspect it here.
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-white/5 bg-black/40 backdrop-blur-xl shadow-2xl text-white transition-all duration-500 hover:bg-black/50">
          <CardHeader>
            <CardTitle>Selected session files</CardTitle>
            <CardDescription className="text-white/55">
              Generated files from the selected run stay local in the renderer once you fetch them.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="max-h-[220px] space-y-2 overflow-auto pr-2">
              {generatedFiles.length > 0 ? (
                generatedFiles.map((file) => (
                  <button
                    key={file.path}
                    type="button"
                    onClick={() => setSelectedFilePath(file.path)}
                    className={`group w-full rounded-xl border px-4 py-3 text-left text-sm transition-all duration-300 ${selectedFilePath === file.path ? 'border-sky-500/50 bg-sky-500/10 text-white shadow-[0_0_15px_rgba(14,165,233,0.15)]' : 'border-white/5 bg-white/5 text-zinc-400 hover:border-white/20 hover:bg-white/10 hover:text-zinc-200'}`}
                  >
                    <div className="font-mono text-xs text-white/85">{file.path}</div>
                    <div className="mt-1 text-[11px] uppercase tracking-[0.24em] text-white/35">
                      {file.changeType} • +{file.additions} / -{file.deletions}
                    </div>
                  </button>
                ))
              ) : (
                <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-white/10 bg-white/[0.02] px-6 py-10 text-center text-sm font-medium text-zinc-500 shadow-inner">
                  No generated files loaded for the selected session.
                </div>
              )}
            </div>

            <div className="rounded-xl border border-white/5 bg-white/5 p-4 shadow-inner backdrop-blur-md transition-colors hover:bg-white/10">
              <div className="mb-2 text-xs uppercase tracking-[0.22em] text-white/40">
                {selectedFile?.path ?? 'File preview'}
              </div>
              <pre className="max-h-[320px] overflow-auto whitespace-pre-wrap text-xs leading-6 text-white/80">
                {selectedFile?.content || 'Select a generated file to preview its content.'}
              </pre>
            </div>

            <div className="rounded-xl border border-white/5 bg-white/5 p-4 shadow-inner backdrop-blur-md transition-colors hover:bg-white/10">
              <div className="mb-2 text-xs uppercase tracking-[0.22em] text-white/40">Snapshot markdown</div>
              <pre className="max-h-[220px] overflow-auto whitespace-pre-wrap text-xs leading-6 text-white/75">
                {snapshot?.markdown || 'Load a snapshot to inspect the derived markdown summary.'}
              </pre>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}