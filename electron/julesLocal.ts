import { ipcMain, type WebContents } from 'electron'
import {
  connect,
  jules,
  type Activity,
  type JulesClient,
  type SessionConfig,
  type SessionResource,
  type Source,
} from '@google/jules-sdk'
import { execFileSync } from 'child_process'
import { writeFileSync, unlinkSync } from 'fs'
import * as path from 'path'
import type {
  JulesLocalActivity,
  JulesLocalArtifact,
  JulesLocalFleetIssueFixRequest,
  JulesLocalFleetIssueFixResult,
  JulesLocalFileFilter,
  JulesLocalGeneratedFile,
  JulesLocalSessionOutcome,
  JulesLocalSessionInfo,
  JulesLocalSessionRequest,
  JulesLocalSessionSnapshot,
  JulesLocalSource,
  JulesLocalStreamStateEvent,
} from '@shared/electron'

export interface ApplyPatchOptions {
  branch?: string
  dryRun?: boolean
  cwd: string
}

export type ApplyPatchResult =
  | { success: true; branch: string; commitMessage: string; dryRun?: boolean }
  | { success: false; error: string }

type StreamState = JulesLocalStreamStateEvent['state']

interface ActiveStream {
  stopped: boolean
}

type ChangeSetLike = {
  source: string
  gitPatch: { unidiffPatch: string }
  parsed: () => {
    files: Array<{
      path: string
      changeType: 'created' | 'modified' | 'deleted'
      additions: number
      deletions: number
    }>
    summary: { totalFiles: number }
  }
}

type SessionOutcomeLike = {
  sessionId: string
  title: string
  state: 'completed' | 'failed'
  outputs: Array<{ pullRequest: { url: string; title: string } } | { changeSet: unknown }>
  pullRequest?: { url: string; title: string }
  generatedFiles: () => { all: () => JulesLocalGeneratedFile[] }
  changeSet: () => ChangeSetLike | undefined
}

type SessionSnapshotLike = {
  id: string
  state: JulesLocalSessionSnapshot['state']
  url: string
  createdAt: Date
  updatedAt: Date
  durationMs: number
  prompt: string
  title: string
  activities: readonly Activity[]
  activityCounts: Readonly<Record<string, number>>
  timeline: ReadonlyArray<{ time: string; type: string; summary: string }>
  insights: {
    completionAttempts: number
    planRegenerations: number
    userInterventions: number
    failedCommands: ReadonlyArray<Activity>
  }
  generatedFiles: { all: () => JulesLocalGeneratedFile[] }
  changeSet: () => ChangeSetLike | undefined
  toMarkdown: () => string
  pr?: { url: string; title: string }
}

type HydratableSession = {
  hydrate: () => Promise<number>
}

let apiKeyOverride: string | null = null
const activeStreams = new Map<string, ActiveStream>()

/**
 * Thin Electron-local wrapper around the official Jules SDK.
 *
 * This keeps Node-only SDK usage and API keys in the Electron main process,
 * while exposing a smaller modjules-style surface to the renderer.
 *
 * @see https://github.com/davideast/modjules/blob/main/packages/core/src/index.ts
 * @see https://github.com/davideast/modjules/blob/main/docs/getting-started.md
 * @see https://github.com/davideast/modjules/blob/main/docs/interactive-sessions.md
 * @see https://github.com/davideast/modjules/blob/main/docs/artifacts.md
 */
function getClient(): JulesClient {
  return apiKeyOverride ? connect({ apiKey: apiKeyOverride }) : jules
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message
  }

  return String(error)
}

function getStreamKey(sender: WebContents, sessionId: string): string {
  return `${sender.id}:${sessionId}`
}

function emitStreamState(
  sender: WebContents,
  payload: JulesLocalStreamStateEvent,
): void {
  if (!sender.isDestroyed()) {
    sender.send('jules.stream.state', payload)
  }
}

function emitActivity(
  sender: WebContents,
  sessionId: string,
  activity: JulesLocalActivity,
): void {
  if (!sender.isDestroyed()) {
    sender.send('jules.stream.activity', { sessionId, activity })
  }
}

function toSessionConfig(request: JulesLocalSessionRequest): SessionConfig {
  const config: SessionConfig = {
    prompt: request.prompt,
  }

  if (request.title) {
    config.title = request.title
  }

  if (request.requireApproval !== undefined) {
    config.requireApproval = request.requireApproval
  }

  if (request.autoPr !== undefined) {
    config.autoPr = request.autoPr
  }

  if (request.github) {
    config.source = {
      github: request.github,
      baseBranch: request.branch ?? 'main',
      ...(request.environmentVariablesEnabled
        ? { environmentVariablesEnabled: true }
        : {}),
    }
  }

  return config
}

function serializeGeneratedFile(file: JulesLocalGeneratedFile): JulesLocalGeneratedFile {
  return {
    path: file.path,
    changeType: file.changeType,
    content: file.content,
    additions: file.additions,
    deletions: file.deletions,
  }
}

function toGeneratedFiles(files: JulesLocalGeneratedFile[]): JulesLocalGeneratedFile[] {
  return files.map(serializeGeneratedFile)
}

function serializeSource(source: Source): JulesLocalSource {
  return {
    name: source.name,
    id: source.id,
    type: 'githubRepo',
    fullName: `${source.githubRepo.owner}/${source.githubRepo.repo}`,
    owner: source.githubRepo.owner,
    repo: source.githubRepo.repo,
    isPrivate: source.githubRepo.isPrivate,
    ...(source.githubRepo.defaultBranch
      ? { defaultBranch: source.githubRepo.defaultBranch }
      : {}),
    branches: source.githubRepo.branches ?? [],
  }
}

function serializeChangeSetArtifact(artifact: ChangeSetLike): JulesLocalArtifact {
  const parsed = artifact.parsed()
  const files = parsed.files.map((file) => ({
    path: file.path,
    changeType: file.changeType,
    content: '',
    additions: file.additions,
    deletions: file.deletions,
  }))

  return {
    type: 'changeSet',
    source: artifact.source,
    diff: artifact.gitPatch.unidiffPatch,
    summary: `${parsed.summary.totalFiles} files changed`,
    files,
  }
}

function normalizeExtensions(extensions?: string[]): string[] {
  return (extensions ?? []).map((extension) => {
    const normalized = extension.trim().toLowerCase()
    return normalized.startsWith('.') ? normalized : `.${normalized}`
  })
}

function matchesFileFilter(
  file: JulesLocalGeneratedFile,
  filter?: JulesLocalFileFilter,
): boolean {
  if (!filter) {
    return true
  }

  const normalizedExtensions = normalizeExtensions(filter.extensions)
  if (normalizedExtensions.length > 0) {
    const filePath = file.path.toLowerCase()
    const hasAllowedExtension = normalizedExtensions.some((extension) =>
      filePath.endsWith(extension),
    )
    if (!hasAllowedExtension) {
      return false
    }
  }

  if (filter.pathIncludes) {
    return file.path.toLowerCase().includes(filter.pathIncludes.toLowerCase())
  }

  return true
}

function getPullRequestUrl(session: SessionResource): string | undefined {
  const output = session.outputs.find((entry) => 'pullRequest' in entry)
  return output?.pullRequest.url ?? session.outcome.pullRequest?.url
}

function serializeSessionInfo(session: SessionResource): JulesLocalSessionInfo {
  const source = session.source?.type === 'githubRepo'
    ? `${session.source.githubRepo.owner}/${session.source.githubRepo.repo}`
    : session.sourceContext?.source
  const branch =
    session.sourceContext?.githubRepoContext?.startingBranch ??
    session.sourceContext?.workingBranch
  const pullRequestUrl = getPullRequestUrl(session)

  return {
    id: session.id,
    title: session.title,
    prompt: session.prompt,
    state: session.state,
    url: session.url,
    ...(source ? { source } : {}),
    ...(branch ? { branch } : {}),
    archived: session.archived,
    outputTypes: session.outputs.map((output) =>
      'pullRequest' in output ? 'pullRequest' : 'changeSet',
    ),
    ...(pullRequestUrl ? { pullRequestUrl } : {}),
    createdAt: session.createTime,
    updatedAt: session.updateTime,
  }
}

function serializeOutcome(outcome: SessionOutcomeLike): JulesLocalSessionOutcome {
  const changeSet = outcome.changeSet()

  return {
    sessionId: outcome.sessionId,
    title: outcome.title,
    state: outcome.state,
    outputTypes: outcome.outputs.map((output) =>
      'pullRequest' in output ? 'pullRequest' : 'changeSet',
    ),
    generatedFiles: toGeneratedFiles(outcome.generatedFiles().all()),
    ...(outcome.pullRequest
      ? {
          pullRequestUrl: outcome.pullRequest.url,
          pullRequestTitle: outcome.pullRequest.title,
        }
      : {}),
    ...(changeSet ? { changeSet: serializeChangeSetArtifact(changeSet) } : {}),
  }
}

function serializeSnapshot(snapshot: SessionSnapshotLike): JulesLocalSessionSnapshot {
  const changeSet = snapshot.changeSet()

  return {
    id: snapshot.id,
    state: snapshot.state,
    url: snapshot.url,
    createdAt: snapshot.createdAt.toISOString(),
    updatedAt: snapshot.updatedAt.toISOString(),
    durationMs: snapshot.durationMs,
    prompt: snapshot.prompt,
    title: snapshot.title,
    activities: snapshot.activities.map(serializeActivity),
    activityCounts: { ...snapshot.activityCounts },
    timeline: snapshot.timeline.map((entry) => ({
      time: entry.time,
      type: entry.type,
      summary: entry.summary,
    })),
    insights: {
      completionAttempts: snapshot.insights.completionAttempts,
      planRegenerations: snapshot.insights.planRegenerations,
      userInterventions: snapshot.insights.userInterventions,
      failedCommandCount: snapshot.insights.failedCommands.length,
    },
    generatedFiles: toGeneratedFiles(snapshot.generatedFiles.all()),
    markdown: snapshot.toMarkdown(),
    ...(snapshot.pr
      ? {
          pullRequestUrl: snapshot.pr.url,
          pullRequestTitle: snapshot.pr.title,
        }
      : {}),
    ...(changeSet ? { changeSet: serializeChangeSetArtifact(changeSet) } : {}),
  }
}

function toFleetTitle(
  repository: string,
  issue: string,
  titlePrefix?: string,
): string {
  const normalizedPrefix = titlePrefix?.trim()
  if (normalizedPrefix) {
    return `${normalizedPrefix} · ${repository}`
  }

  const firstLine = issue.trim().split(/\r?\n/, 1)[0] ?? 'Issue fix'
  return `${firstLine.slice(0, 72)} · ${repository}`
}

function serializeArtifact(artifact: Activity['artifacts'][number]): JulesLocalArtifact {
  if (artifact.type === 'changeSet') {
    return serializeChangeSetArtifact(artifact)
  }

  if (artifact.type === 'bashOutput') {
    return {
      type: 'bashOutput',
      command: artifact.command,
      output: [artifact.stdout, artifact.stderr].filter(Boolean).join('\n\n'),
      exitCode: artifact.exitCode,
    }
  }

  return {
    type: 'media',
    format: artifact.format,
    hasData: Boolean(artifact.data),
  }
}

function serializeActivity(activity: Activity): JulesLocalActivity {
  const originator = 'originator' in activity ? activity.originator : undefined
  const base = {
    id: activity.id,
    type: activity.type,
    createTime: activity.createTime,
    ...(originator ? { originator } : {}),
    artifacts: (activity.artifacts ?? []).map(serializeArtifact),
  }

  switch (activity.type) {
    case 'agentMessaged':
    case 'userMessaged':
      return {
        ...base,
        message: activity.message,
      }
    case 'progressUpdated':
      return {
        ...base,
        title: activity.title,
        description: activity.description,
      }
    case 'planGenerated':
      return {
        ...base,
        plan: {
          id: activity.plan.id,
          createTime: activity.plan.createTime,
          steps: activity.plan.steps.map((step) => ({
            id: step.id,
            title: step.title,
            index: step.index,
            ...(step.description ? { description: step.description } : {}),
          })),
        },
      }
    case 'sessionFailed':
      return {
        ...base,
        reason: activity.reason,
      }
    default:
      return base
  }
}

async function collectActivities(iterable: AsyncIterable<Activity>): Promise<JulesLocalActivity[]> {
  const activities: JulesLocalActivity[] = []

  for await (const activity of iterable) {
    activities.push(serializeActivity(activity))
  }

  return activities.sort((left, right) => left.createTime.localeCompare(right.createTime))
}

async function getSessionFiles(
  sessionId: string,
  filter?: JulesLocalFileFilter,
): Promise<JulesLocalGeneratedFile[]> {
  const session = getClient().session(sessionId)
  const snapshot = await session.snapshot()
  const files = toGeneratedFiles(snapshot.generatedFiles.all())
  return files.filter((file) => matchesFileFilter(file, filter))
}

function stopActiveStream(sender: WebContents, sessionId: string): boolean {
  const key = getStreamKey(sender, sessionId)
  const stream = activeStreams.get(key)
  if (!stream) {
    return false
  }

  stream.stopped = true
  activeStreams.delete(key)
  emitStreamState(sender, { sessionId, state: 'stopped' })
  return true
}

async function finishStream(
  sender: WebContents,
  sessionId: string,
  state: Exclude<StreamState, 'started' | 'stopped'>,
): Promise<void> {
  const info = await getClient().session(sessionId).info().catch(() => undefined)
  emitStreamState(sender, {
    sessionId,
    state,
    ...(info ? { info: serializeSessionInfo(info) } : {}),
  })
}

export function registerJulesLocalHandlers() {
  ipcMain.handle('jules.apiKey.set', async (_event, apiKey: string | null) => {
    apiKeyOverride = apiKey && apiKey.trim() ? apiKey.trim() : null
    return true
  })

  ipcMain.handle(
    'jules.session.create',
    async (_event, request: JulesLocalSessionRequest): Promise<JulesLocalSessionInfo> => {
      const session = await getClient().session(toSessionConfig(request))
      return serializeSessionInfo(await session.info())
    },
  )

  ipcMain.handle(
    'jules.session.resume',
    async (_event, sessionId: string): Promise<JulesLocalSessionInfo> => {
      return serializeSessionInfo(await getClient().session(sessionId).info())
    },
  )

  ipcMain.handle(
    'jules.session.get',
    async (_event, sessionId: string): Promise<JulesLocalSessionInfo> => {
      return serializeSessionInfo(await getClient().session(sessionId).info())
    },
  )

  ipcMain.handle('jules.session.hydrate', async (_event, sessionId: string) => {
    return (getClient().session(sessionId) as unknown as HydratableSession).hydrate()
  })

  ipcMain.handle(
    'jules.session.history',
    async (_event, sessionId: string): Promise<JulesLocalActivity[]> => {
      return collectActivities(getClient().session(sessionId).history())
    },
  )

  ipcMain.handle(
    'jules.sources.list',
    async (): Promise<JulesLocalSource[]> => {
      const sources: JulesLocalSource[] = []

      for await (const source of getClient().sources()) {
        if (source.type === 'githubRepo') {
          sources.push(serializeSource(source))
        }
      }

      return sources.sort((left, right) => left.fullName.localeCompare(right.fullName))
    },
  )

  ipcMain.handle(
    'jules.sources.get',
    async (_event, github: string): Promise<JulesLocalSource | null> => {
      const normalized = github.trim()
      if (!normalized) {
        return null
      }

      const source = await getClient().sources.get({ github: normalized })
      return source ? serializeSource(source) : null
    },
  )

  ipcMain.handle(
    'jules.session.result',
    async (_event, sessionId: string): Promise<JulesLocalSessionOutcome> => {
      return serializeOutcome(await getClient().session(sessionId).result())
    },
  )

  ipcMain.handle(
    'jules.session.snapshot',
    async (_event, sessionId: string): Promise<JulesLocalSessionSnapshot> => {
      return serializeSnapshot(await getClient().session(sessionId).snapshot())
    },
  )

  ipcMain.handle(
    'jules.fleet.issueFix',
    async (
      _event,
      request: JulesLocalFleetIssueFixRequest,
    ): Promise<JulesLocalFleetIssueFixResult[]> => {
      const issue = request.issue.trim()
      if (!issue) {
        throw new Error('A fleet issue prompt is required.')
      }

      const repositories = Array.from(
        new Set(
          request.repositories
            .map((repository) => repository.trim())
            .filter(Boolean),
        ),
      )

      if (repositories.length === 0) {
        throw new Error('At least one repository is required for fleet dispatch.')
      }

      const runs = await getClient().all(
        repositories,
        async (repository) => ({
          prompt: issue,
          title: toFleetTitle(repository, issue, request.titlePrefix),
          source: {
            github: repository,
            baseBranch: request.branch ?? 'main',
          },
          requireApproval: request.requireApproval ?? false,
          autoPr: request.autoPr ?? true,
        }),
        {
          ...(request.concurrency ? { concurrency: request.concurrency } : {}),
          ...(request.stopOnError !== undefined
            ? { stopOnError: request.stopOnError }
            : {}),
          ...(request.delayMs ? { delayMs: request.delayMs } : {}),
        },
      )

      return Promise.all(
        repositories.map(async (repository, index) => {
          const run = runs[index]
          if (!run) {
            throw new Error(`Fleet dispatch did not return a session for ${repository}.`)
          }

          return {
            repository,
            session: serializeSessionInfo(await getClient().session(run.id).info()),
          }
        }),
      )
    },
  )

  ipcMain.handle('jules.session.approve', async (_event, sessionId: string) => {
    await getClient().session(sessionId).approve()
  })

  ipcMain.handle(
    'jules.session.send',
    async (_event, sessionId: string, prompt: string) => {
      await getClient().session(sessionId).send(prompt)
    },
  )

  ipcMain.handle(
    'jules.session.ask',
    async (_event, sessionId: string, prompt: string): Promise<JulesLocalActivity> => {
      const reply = await getClient().session(sessionId).ask(prompt)
      return serializeActivity(reply)
    },
  )

  ipcMain.handle(
    'jules.session.files',
    async (
      _event,
      sessionId: string,
      filter?: JulesLocalFileFilter,
    ): Promise<JulesLocalGeneratedFile[]> => {
      return getSessionFiles(sessionId, filter)
    },
  )

  ipcMain.handle(
    'jules.session.files.markdown',
    async (_event, sessionId: string): Promise<JulesLocalGeneratedFile[]> => {
      return getSessionFiles(sessionId, { extensions: ['.md', '.mdx'] })
    },
  )

  ipcMain.handle('jules.stream.start', async (event, sessionId: string) => {
    const key = getStreamKey(event.sender, sessionId)
    if (activeStreams.has(key)) {
      return
    }

    const activeStream: ActiveStream = { stopped: false }
    activeStreams.set(key, activeStream)
    emitStreamState(event.sender, { sessionId, state: 'started' })

    void (async () => {
      try {
        const session = getClient().session(sessionId)
        for await (const activity of session.stream()) {
          if (activeStream.stopped || event.sender.isDestroyed()) {
            break
          }

          emitActivity(event.sender, sessionId, serializeActivity(activity))
        }

        if (activeStream.stopped || event.sender.isDestroyed()) {
          return
        }

        const info = await session.info()
        await finishStream(
          event.sender,
          sessionId,
          info.state === 'failed' ? 'failed' : 'completed',
        )
      } catch (error) {
        emitStreamState(event.sender, {
          sessionId,
          state: 'failed',
          error: getErrorMessage(error),
        })
      } finally {
        activeStreams.delete(key)
      }
    })()
  })

  ipcMain.handle('jules.stream.stop', async (event, sessionId: string) => {
    stopActiveStream(event.sender, sessionId)
  })

  ipcMain.handle('jules.applyPatch', async (_e, sessionId: string, opts: ApplyPatchOptions): Promise<ApplyPatchResult> => {
    try {
      const session = getClient().session(sessionId)
      const snapshot = await session.snapshot()
      const changeSet = snapshot.changeSet()

      if (!changeSet?.gitPatch?.unidiffPatch) {
        return { success: false, error: 'No git patch found in this session.' }
      }

      const { unidiffPatch, suggestedCommitMessage } = changeSet.gitPatch
      const branch = opts.branch ?? `jules-${sessionId.slice(0, 8)}-${Date.now()}`
      const commitMessage = suggestedCommitMessage || `Jules: ${snapshot.title}`

      if (opts.dryRun) {
        return { success: true, branch, commitMessage, dryRun: true }
      }

      const patchPath = path.join(opts.cwd, '.jules_patch.tmp')

      try {
        execFileSync('git', ['checkout', '-b', branch], { cwd: opts.cwd, stdio: 'pipe' })
        writeFileSync(patchPath, unidiffPatch)
        execFileSync('git', ['apply', patchPath], { cwd: opts.cwd, stdio: 'pipe' })
        unlinkSync(patchPath)
        execFileSync('git', ['add', '.'], { cwd: opts.cwd, stdio: 'pipe' })
        execFileSync('git', ['commit', '-m', commitMessage], { cwd: opts.cwd, stdio: 'pipe' })
      } catch (e: any) {
        try { unlinkSync(patchPath) } catch {}
        return { success: false, error: e.stderr?.toString().trim() || e.message }
      }

      return { success: true, branch, commitMessage }
    } catch (e: any) {
      return { success: false, error: e.message ?? String(e) }
    }
  })
}
