import { ipcMain } from 'electron'
import { jules } from '@google/jules-sdk'
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
} from '@google/jules-sdk'
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
  return JSON.parse(JSON.stringify(data))
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
            (wrapped as Record<string, unknown>)[key] = (err as Record<string, unknown>)[key]
          }
        }
      }
      throw wrapped
    }
  }
}

// ── registration ──────────────────────────────────────────────────────────────

export function registerSdkHandlers() {

  // ── client ──────────────────────────────────────────────────────────────────

  ipcMain.handle('sdk:client.sessions', wrapHandler(async (_, options?: ListSessionsOptions) => {
    const sessions = await jules.sessions(options).all()
    return serialize(sessions)
  }))

  ipcMain.handle('sdk:client.sessions.stream.start', wrapHandler(async (event, options?: ListSessionsOptions) => {
    for await (const item of jules.sessions(options)) {
      if (event.sender.isDestroyed()) break
      send(event.sender, 'sdk:client.sessions.item', item)
    }
    send(event.sender, 'sdk:client.sessions.done')
  }))

  ipcMain.handle('sdk:client.sync', wrapHandler(async (event, options?: SyncOptions) =>
    serialize(await jules.sync({
      ...options,
      onProgress: (p) => send(event.sender, 'sdk:client.sync.progress', p),
    }))
  ))

  ipcMain.handle('sdk:client.select', wrapHandler(async (_, query: JulesQuery<JulesDomain>) =>
    serialize(await jules.select(query))
  ))

  ipcMain.handle('sdk:client.getSessionResource', wrapHandler(async (_, id: string) =>
    serialize(await jules.session(id).info())
  ))

  ipcMain.handle('sdk:client.run', wrapHandler(async (_, config: SessionConfig) =>
    serialize(await jules.run(config))
  ))

  ipcMain.handle('sdk:client.with', wrapHandler(async (_, options: JulesOptions) =>
    serialize(await jules.with(options))
  ))

  // ── session ──────────────────────────────────────────────────────────────────
  // NOTE: jules.session(id) is called fresh on every request. This is intentional
  // — the SDK returns a lightweight, stateless client handle (no caching needed).

  ipcMain.handle('sdk:session.send', wrapHandler(async (_, id: string, prompt: string) =>
    serialize(await jules.session(id).send(prompt))
  ))

  ipcMain.handle('sdk:session.ask', wrapHandler(async (_, id: string, prompt: string) =>
    serialize(await jules.session(id).ask(prompt))
  ))

  ipcMain.handle('sdk:session.approve', wrapHandler(async (_, id: string) =>
    serialize(await jules.session(id).approve())
  ))

  ipcMain.handle('sdk:session.info', wrapHandler(async (_, id: string) =>
    serialize(await jules.session(id).info())
  ))

  ipcMain.handle('sdk:session.result', wrapHandler(async (_, id: string) =>
    serialize(await jules.session(id).result())
  ))

  ipcMain.handle('sdk:session.waitFor', wrapHandler(async (_, id: string, state: SessionState) =>
    serialize(await jules.session(id).waitFor(state))
  ))

  ipcMain.handle('sdk:session.snapshot', wrapHandler(async (_, id: string, options?: { activities?: boolean }) =>
    serialize(await jules.session(id).snapshot(options))
  ))

  ipcMain.handle('sdk:session.archive', wrapHandler(async (_, id: string) =>
    serialize(await jules.session(id).archive())
  ))

  ipcMain.handle('sdk:session.unarchive', wrapHandler(async (_, id: string) =>
    serialize(await jules.session(id).unarchive())
  ))

  ipcMain.handle('sdk:session.select', wrapHandler(async (_, id: string, options?: SelectOptions) =>
    serialize(await jules.session(id).select(options))
  ))

  ipcMain.handle('sdk:session.hydrate', wrapHandler(async (_, id: string) =>
    serialize(await jules.session(id).activities.hydrate())
  ))

  ipcMain.handle('sdk:session.stream.start', wrapHandler(async (event, id: string, options?: StreamActivitiesOptions) => {
    const streamOpts: StreamActivitiesOptions = {
      ...options,
      // Fresh sessions (especially repoless) may not be available for activity
      // polling immediately after creation — bump retries to avoid 404 race.
      initialRetries: Math.max(options?.initialRetries ?? 0, 20),
    }
    for await (const item of jules.session(id).stream(streamOpts)) {
      if (event.sender.isDestroyed()) break
      send(event.sender, `sdk:session.stream:${id}`, item)
    }
    send(event.sender, `sdk:session.stream.done:${id}`)
  }))

  ipcMain.handle('sdk:session.history.start', wrapHandler(async (event, id: string) => {
    for await (const item of jules.session(id).history()) {
      if (event.sender.isDestroyed()) break
      send(event.sender, `sdk:session.history:${id}`, item)
    }
    send(event.sender, `sdk:session.history.done:${id}`)
  }))

  ipcMain.handle('sdk:session.updates.start', wrapHandler(async (event, id: string) => {
    for await (const item of jules.session(id).updates()) {
      if (event.sender.isDestroyed()) break
      send(event.sender, `sdk:session.updates:${id}`, item)
    }
    send(event.sender, `sdk:session.updates.done:${id}`)
  }))

  // ── activities ────────────────────────────────────────────────────────────────
  // NOTE: jules.session(id) is called fresh on every request. This is intentional
  // — the SDK returns a lightweight, stateless client handle (no caching needed).

  ipcMain.handle('sdk:activities.hydrate', wrapHandler(async (_, id: string) =>
    serialize(await jules.session(id).activities.hydrate())
  ))

  ipcMain.handle('sdk:activities.select', wrapHandler(async (_, id: string, options?: SelectOptions) =>
    serialize(await jules.session(id).activities.select(options))
  ))

  ipcMain.handle('sdk:activities.list', wrapHandler(async (_, id: string, options?: ListOptions) =>
    serialize(await jules.session(id).activities.list(options))
  ))

  ipcMain.handle('sdk:activities.get', wrapHandler(async (_, id: string, activityId: string) =>
    serialize(await jules.session(id).activities.get(activityId))
  ))

  ipcMain.handle('sdk:activities.history.start', wrapHandler(async (event, id: string) => {
    for await (const item of jules.session(id).activities.history()) {
      if (event.sender.isDestroyed()) break
      send(event.sender, `sdk:activities.history:${id}`, item)
    }
    send(event.sender, `sdk:activities.history.done:${id}`)
  }))

  ipcMain.handle('sdk:activities.updates.start', wrapHandler(async (event, id: string) => {
    for await (const item of jules.session(id).activities.updates()) {
      if (event.sender.isDestroyed()) break
      send(event.sender, `sdk:activities.updates:${id}`, item)
    }
    send(event.sender, `sdk:activities.updates.done:${id}`)
  }))

  ipcMain.handle('sdk:activities.stream.start', wrapHandler(async (event, id: string) => {
    for await (const item of jules.session(id).activities.stream()) {
      if (event.sender.isDestroyed()) break
      send(event.sender, `sdk:activities.stream:${id}`, item)
    }
    send(event.sender, `sdk:activities.stream.done:${id}`)
  }))

  // ── sources ───────────────────────────────────────────────────────────────────

  ipcMain.handle('sdk:sources.get', wrapHandler(async (_, filter: { github: string }) =>
    serialize(await jules.sources.get(filter))
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
