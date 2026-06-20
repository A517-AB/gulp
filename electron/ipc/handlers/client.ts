import type {
  ListSessionsOptions,
  JulesQuery,
  JulesDomain,
  SessionConfig,
  JulesOptions,
} from '@google/jules-sdk'
import type { SyncOptions } from '@google/jules-sdk/types'
import { jules } from '../sdk'
import { serialize, send } from '../serialize'
import { CH, EV, sessionsStream } from '../channels'
import { handle, pump } from './util'

export function registerClientHandlers(): void {
  // Lean default: the SessionCursor is thenable, so awaiting it yields just the
  // first page. No `.all()` drain — switching pages no longer pulls every session.
  handle(CH.client.sessions, async (_event, options?: ListSessionsOptions) => {
    const { sessions } = await jules.sessions(options)
    return serialize(sessions)
  })

  // Opt-in: drain the full cursor as a stream when the caller actually wants it.
  handle(CH.client.sessionsStreamStart, (event, options?: ListSessionsOptions) =>
    pump(event, jules.sessions(options), sessionsStream()),
  )

  handle(CH.client.sync, (event, options?: Omit<SyncOptions, 'onProgress' | 'signal'>) =>
    jules
      .sync({ ...options, onProgress: (p) => { send(event.sender, EV.syncProgress, p) } })
      .then(serialize),
  )

  handle(CH.client.select, async (_event, query: JulesQuery<JulesDomain>) =>
    serialize(await jules.select(query)),
  )

  handle(CH.client.getSessionResource, async (_event, id: string) =>
    serialize(await jules.session(id).info()),
  )

  handle(CH.client.run, async (_event, config: SessionConfig) => ({
    id: (await jules.run(config)).id,
  }))

  handle(CH.client.with, (_event, options: JulesOptions) => {
    if (!process.env.JULES_API_KEY && !options.apiKey) {
      console.warn('[sdk:client.with] no API key in env or options — requests will fail')
    }
    jules.with(options)
  })

  handle(
    CH.client.all,
    async (
      _event,
      configs: SessionConfig[],
      options?: { concurrency?: number; stopOnError?: boolean; delayMs?: number },
    ) => {
      const sessions = await jules.all(configs, (c) => c, options)
      return serialize(sessions.map((s) => ({ id: s.id })))
    },
  )
}
