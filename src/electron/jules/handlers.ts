import { ipcMain } from 'electron'
import { jules, validateQuery } from '@google/jules-sdk'
import { registerRepolessHandlers } from './repoless/index.js'
import type {
  ListSessionsOptions,
  JulesOptions,
  SessionConfig,
  JulesQuery,
  JulesDomain,
  SessionState,
  SessionClient,
  JulesClient,
  Source,
} from '@google/jules-sdk'
import type { BatchOptions, FullSessionResult } from '../../shared/types.js'
import * as fs from 'node:fs'
import * as path from 'node:path'

type StreamActivitiesOptions = Parameters<SessionClient['stream']>[0]
type SyncOptions = Omit<NonNullable<Parameters<JulesClient['sync']>[0]>, 'onProgress' | 'signal'>
type SelectOptions = Parameters<SessionClient['activities']['select']>[0]
type ListOptions = Parameters<SessionClient['activities']['list']>[0]

// ── helpers ───────────────────────────────────────────────────────────────────

type Sender = Electron.WebContents

function serialize<T>(data: T): T {
  if (data === undefined || data === null) return data
  return JSON.parse(JSON.stringify(data)) as T
}

function send(sender: Sender, ch: string, payload?: unknown) {
  if (!sender.isDestroyed()) sender.send(ch, serialize(payload))
}

/**
 * Wraps an IPC handler so that SDK errors are properly serialized across the
 * IPC boundary. Without this, Electron's IPC only transmits the generic
 * `Error.message` string — any additional fields like `status`, `code`, or a
 * custom `name` (e.g. from a JulesError) are silently dropped.
 */
function wrapHandler<Args extends unknown[], R>(
  fn: (event: Electron.IpcMainInvokeEvent, ...args: Args) => Promise<R>,
): (event: Electron.IpcMainInvokeEvent, ...args: Args) => Promise<R> {
  return async (event, ...args) => {
    try {
      return await fn(event, ...args)
    } catch (err: unknown) {
      const wrapped = new Error(
        err instanceof Error ? err.message : String(err),
      )
      if (err instanceof Error) {
        wrapped.name = err.name
        // Preserve SDK-specific fields (e.g. status, code) so the renderer
        // can differentiate between network errors, auth errors, etc.
        for (const key of ['status', 'code'] as const) {
          if (key in err) {
            (wrapped as unknown as Record<string, unknown>)[key] = (err as unknown as Record<string, unknown>)[key]
          }
        }
      }
      throw wrapped
    }
  }
}

// ── mutable client reference ──────────────────────────────────────────────────
// `jules.with()` returns a NEW client; we store the active one so that
// reconfiguration (e.g. switching API key) actually takes effect.

let activeClient: JulesClient = jules

// ── sync abort support ────────────────────────────────────────────────────────

let syncAbortController: AbortController | null = null

// ── registration ──────────────────────────────────────────────────────────────

export function registerSdkHandlers() {

  // ── client ──────────────────────────────────────────────────────────────────

  ipcMain.handle('sdk:client.sessions', wrapHandler(async (_, options?: ListSessionsOptions) => {
    const sessions = await activeClient.sessions(options).all()
    return serialize(sessions)
  }))

  ipcMain.handle('sdk:client.sessions.stream.start', wrapHandler(async (event, options?: ListSessionsOptions) => {
    for await (const item of activeClient.sessions(options)) {
      if (event.sender.isDestroyed()) break
      send(event.sender, 'sdk:client.sessions.item', item)
    }
    send(event.sender, 'sdk:client.sessions.done')
  }))

  ipcMain.handle('sdk:client.sync', wrapHandler(async (event, options?: SyncOptions) => {
    syncAbortController = new AbortController()
    try {
      return serialize(await activeClient.sync({
        ...options,
        signal: syncAbortController.signal,
        onProgress: (p) => send(event.sender, 'sdk:client.sync.progress', p),
      }))
    } finally {
      syncAbortController = null
    }
  }))

  ipcMain.handle('sdk:client.sync.abort', wrapHandler(async () => {
    syncAbortController?.abort()
    syncAbortController = null
  }))

  ipcMain.handle('sdk:client.select', wrapHandler(async (_, query: JulesQuery<JulesDomain>) =>
    serialize(await activeClient.select(query))
  ))

  ipcMain.handle('sdk:client.getSessionResource', wrapHandler(async (_, id: string) =>
    serialize(await activeClient.session(id).info())
  ))

  ipcMain.handle('sdk:client.run', wrapHandler(async (_, config: SessionConfig) =>
    serialize(await activeClient.run(config))
  ))

  ipcMain.handle('sdk:client.all', wrapHandler(async (event, configs: SessionConfig[], options?: BatchOptions) => {
    const batchOpts: { concurrency?: number; stopOnError?: boolean; delayMs?: number } = {}
    if (options?.concurrency !== undefined) batchOpts.concurrency = options.concurrency
    if (options?.stopOnError !== undefined) batchOpts.stopOnError = options.stopOnError
    if (options?.delayMs !== undefined) batchOpts.delayMs = options.delayMs

    const sessions = await activeClient.all(
      configs,
      (config) => config,
      batchOpts,
    )
    // Emit per-session IDs as they become available
    const results = sessions.map(s => {
      send(event.sender, 'sdk:client.all.session', { id: s.id })
      return { id: s.id }
    })
    return serialize(results)
  }))

  ipcMain.handle('sdk:client.with', wrapHandler(async (_, options: JulesOptions) => {
    activeClient = activeClient.with(options)
  }))

  ipcMain.handle('sdk:client.validate', wrapHandler(async (_, query: unknown) =>
    serialize(validateQuery(query))
  ))

  // ── session ──────────────────────────────────────────────────────────────────
  // NOTE: activeClient.session(id) is called fresh on every request. This is
  // intentional — the SDK returns a lightweight, stateless client handle.

  ipcMain.handle('sdk:session.send', wrapHandler(async (_, id: string, prompt: string) =>
    serialize(await activeClient.session(id).send(prompt))
  ))

  ipcMain.handle('sdk:session.ask', wrapHandler(async (_, id: string, prompt: string) =>
    serialize(await activeClient.session(id).ask(prompt))
  ))

  ipcMain.handle('sdk:session.approve', wrapHandler(async (_, id: string) =>
    serialize(await activeClient.session(id).approve())
  ))

  ipcMain.handle('sdk:session.info', wrapHandler(async (_, id: string) =>
    serialize(await activeClient.session(id).info())
  ))

  ipcMain.handle('sdk:session.result', wrapHandler(async (_, id: string) =>
    serialize(await activeClient.session(id).result())
  ))

  ipcMain.handle('sdk:session.result.full', wrapHandler(async (_, id: string) => {
    const outcome = await activeClient.session(id).result()
    const cs = outcome.changeSet()
    const result: FullSessionResult = {
      state: outcome.state,
      generatedFiles: outcome.generatedFiles().all(),
    }
    if (outcome.pullRequest) {
      result.pullRequest = outcome.pullRequest
    }
    if (cs) {
      result.changeSet = {
        source: cs.source,
        gitPatch: cs.gitPatch,
        parsed: cs.parsed(),
      }
    }
    return serialize(result)
  }))

  ipcMain.handle('sdk:session.waitFor', wrapHandler(async (_, id: string, state: SessionState) =>
    serialize(await activeClient.session(id).waitFor(state))
  ))

  ipcMain.handle('sdk:session.snapshot', wrapHandler(async (_, id: string, options?: { activities?: boolean }) => {
    const snapshot = await activeClient.session(id).snapshot(options)
    // Call .toJSON() to get a fully serializable form with all derived data
    return serialize(snapshot.toJSON())
  }))

  ipcMain.handle('sdk:session.archive', wrapHandler(async (_, id: string) =>
    serialize(await activeClient.session(id).archive())
  ))

  ipcMain.handle('sdk:session.unarchive', wrapHandler(async (_, id: string) =>
    serialize(await activeClient.session(id).unarchive())
  ))

  ipcMain.handle('sdk:session.select', wrapHandler(async (_, id: string, options?: SelectOptions) =>
    serialize(await activeClient.session(id).select(options))
  ))

  ipcMain.handle('sdk:session.hydrate', wrapHandler(async (_, id: string) =>
    serialize(await activeClient.session(id).activities.hydrate())
  ))

  ipcMain.handle('sdk:session.stream.start', wrapHandler(async (event, id: string, options?: StreamActivitiesOptions) => {
    for await (const item of activeClient.session(id).stream(options)) {
      if (event.sender.isDestroyed()) break
      send(event.sender, `sdk:session.stream:${id}`, item)
    }
    send(event.sender, `sdk:session.stream.done:${id}`)
  }))

  ipcMain.handle('sdk:session.history.start', wrapHandler(async (event, id: string) => {
    for await (const item of activeClient.session(id).history()) {
      if (event.sender.isDestroyed()) break
      send(event.sender, `sdk:session.history:${id}`, item)
    }
    send(event.sender, `sdk:session.history.done:${id}`)
  }))

  ipcMain.handle('sdk:session.updates.start', wrapHandler(async (event, id: string) => {
    for await (const item of activeClient.session(id).updates()) {
      if (event.sender.isDestroyed()) break
      send(event.sender, `sdk:session.updates:${id}`, item)
    }
    send(event.sender, `sdk:session.updates.done:${id}`)
  }))

  // ── activities ────────────────────────────────────────────────────────────────

  ipcMain.handle('sdk:activities.hydrate', wrapHandler(async (_, id: string) =>
    serialize(await activeClient.session(id).activities.hydrate())
  ))

  ipcMain.handle('sdk:activities.select', wrapHandler(async (_, id: string, options?: SelectOptions) =>
    serialize(await activeClient.session(id).activities.select(options))
  ))

  ipcMain.handle('sdk:activities.list', wrapHandler(async (_, id: string, options?: ListOptions) =>
    serialize(await activeClient.session(id).activities.list(options))
  ))

  ipcMain.handle('sdk:activities.get', wrapHandler(async (_, id: string, activityId: string) =>
    serialize(await activeClient.session(id).activities.get(activityId))
  ))

  ipcMain.handle('sdk:activities.history.start', wrapHandler(async (event, id: string) => {
    for await (const item of activeClient.session(id).activities.history()) {
      if (event.sender.isDestroyed()) break
      send(event.sender, `sdk:activities.history:${id}`, item)
    }
    send(event.sender, `sdk:activities.history.done:${id}`)
  }))

  ipcMain.handle('sdk:activities.updates.start', wrapHandler(async (event, id: string) => {
    for await (const item of activeClient.session(id).activities.updates()) {
      if (event.sender.isDestroyed()) break
      send(event.sender, `sdk:activities.updates:${id}`, item)
    }
    send(event.sender, `sdk:activities.updates.done:${id}`)
  }))

  ipcMain.handle('sdk:activities.stream.start', wrapHandler(async (event, id: string) => {
    for await (const item of activeClient.session(id).activities.stream()) {
      if (event.sender.isDestroyed()) break
      send(event.sender, `sdk:activities.stream:${id}`, item)
    }
    send(event.sender, `sdk:activities.stream.done:${id}`)
  }))

  // ── sources ───────────────────────────────────────────────────────────────────

  ipcMain.handle('sdk:sources.list', wrapHandler(async () => {
    const sources: Source[] = []
    for await (const source of activeClient.sources()) {
      sources.push(source)
    }
    return serialize(sources)
  }))

  ipcMain.handle('sdk:sources.get', wrapHandler(async (_, filter: { github: string }) =>
    serialize(await activeClient.sources.get(filter))
  ))

  // ── repoless ──────────────────────────────────────────────────────────────────

  registerRepolessHandlers()

  // ── artifact ──────────────────────────────────────────────────────────────────
  // MediaArtifact.save() — re-implemented via fs (platform dep can't cross IPC)

  ipcMain.handle('sdk:artifact.save', wrapHandler(async (_, data: string, filepath: string) => {
    const resolved = path.resolve(filepath)
    await fs.promises.mkdir(path.dirname(resolved), { recursive: true })
    await fs.promises.writeFile(resolved, Buffer.from(data, 'base64'))
    return resolved
  }))
}
