import { jules } from '@google/jules-sdk'

type JulesWorkerEvent =
  | { type: 'ready' }
  | { type: 'session.new';          sessionId: string; state: string }
  | { type: 'session.stateChanged'; sessionId: string; state: string; prevState: string }
  | { type: 'error';                message: string }

const port = (process as NodeJS.Process & { parentPort: { postMessage: (msg: unknown) => void } }).parentPort

function post(event: JulesWorkerEvent) {
    port.postMessage(event)
}

const tracked = new Map<string, string>()

async function poll() {
    try {
        const sessions = await jules.sessions().all()
        for (const session of sessions) {
            const s = session as { id: string; state?: string }
            const id = s.id
            const state = s.state ?? 'unknown'
            const prev = tracked.get(id)
            if (prev === undefined) {
                tracked.set(id, state)
                post({ type: 'session.new', sessionId: id, state })
            } else if (prev !== state) {
                tracked.set(id, state)
                post({ type: 'session.stateChanged', sessionId: id, state, prevState: prev })
            }
        }
    } catch (err) {
        post({ type: 'error', message: err instanceof Error ? err.message : String(err) })
    }
}

post({ type: 'ready' })
void poll()
setInterval(() => { void poll() }, 30_000)
