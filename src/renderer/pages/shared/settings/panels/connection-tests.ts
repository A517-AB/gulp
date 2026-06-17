import { isElectron } from '@shared/bridge'
import type { SdkIpc } from '@jules'
import type { TestDef } from '../types'

// ── shared context ────────────────────────────────────────────────────────────
// Resolved once per panel mount; shared across all specs that need it.

type Ctx = { sessionId: string; activityId: string }

async function resolveCtx(sdk: SdkIpc, needs: 'session' | 'activity'): Promise<Ctx> {
    const [session] = await sdk.client.sessions()
    if (!session) throw new Error('no sessions')
    if (needs === 'session') return { sessionId: session.id, activityId: '' }
    const { activities } = await sdk.activities.list(session.id)
    const [first] = activities
    if (!first) throw new Error('no activities in first session')
    return { sessionId: session.id, activityId: first.id }
}

// ── spec table ────────────────────────────────────────────────────────────────
// One line per method. `needs` triggers lazy context resolution.

type Spec = {
    key: string
    needs?: 'session' | 'activity'
    run: (sdk: SdkIpc, ctx: Ctx) => Promise<string>
}

const SPECS: Spec[] = [
    { key: 'env.apiKey',
        run: async () => {
            const k = await (window.electron as { env?: { getApiKey?: () => Promise<string> } } | undefined)?.env?.getApiKey?.()
            return k ? `${k.slice(0, 6)}…${k.slice(-4)} (${k.length}c)` : 'null'
        },
    },

    { key: 'sources.list',    run: async (s) => `${(await s.sources.list()).length} sources` },
    { key: 'sources.resolve', run: async (s) => (await s.sources.resolve()).github ?? 'null' },

    { key: 'client.sessions', run: async (s) => `${(await s.client.sessions()).length} sessions` },
    { key: 'client.sync',     run: async (s) => { const r = await s.client.sync(); return `${r.sessionsIngested}s/${r.activitiesIngested}a, complete=${String(r.isComplete)}` } },
    { key: 'client.select',   run: async (s) => `${(await s.client.select({ from: 'sessions', limit: 5 })).length} results` },

    { key: 'session.info',     needs: 'session', run: async (s, { sessionId: id }) => { const i = await s.session.info(id); return `[${i.state}] ${i.title || 'Untitled'}` } },
    { key: 'session.snapshot', needs: 'session', run: async (s, { sessionId: id }) => { const r = await s.session.snapshot(id); return `${r.activities.length} acts` } },
    { key: 'session.select',   needs: 'session', run: async (s, { sessionId: id }) => `${(await s.session.select(id)).length} activities` },

    { key: 'activities.hydrate', needs: 'session', run: async (s, { sessionId: id }) => { const n = await s.activities.hydrate(id); return n ? `${n} synced` : '0 (cached)' } },
    { key: 'activities.list',    needs: 'session', run: async (s, { sessionId: id }) => `${(await s.activities.list(id)).activities.length} activities` },
    { key: 'activities.select',  needs: 'session', run: async (s, { sessionId: id }) => `${(await s.activities.select(id)).length} activities` },
    { key: 'activities.get',     needs: 'activity', run: async (s, { sessionId: sid, activityId: aid }) => `[${(await s.activities.get(sid, aid)).type}]` },

    { key: 'util.toSummary',   needs: 'activity', run: async (s, { sessionId: sid, activityId: aid }) => { const a = await s.activities.get(sid, aid); return (await s.util.toSummary(a)).summary.slice(0, 60) } },
    { key: 'util.toSummaries', needs: 'session',  run: async (s, { sessionId: id }) => { const { activities } = await s.activities.list(id); return `${(await s.util.toSummaries(activities.slice(0, 3))).length} summaries` } },

    { key: 'artifact.parseUnidiff',            run: async (s) => `${(await s.artifact.parseUnidiff(null)).length} files` },
    { key: 'artifact.parseUnidiffWithContent', run: async (s) => `${(await s.artifact.parseUnidiffWithContent(null)).length} files` },

    { key: 'query.schemas',      run: async (s) => `domains: ${Object.keys(await s.query.schemas()).join(', ')}` },
    { key: 'query.typeDef',      run: async (s) => `${(await s.query.typeDef('sessions')).length}c` },
    { key: 'query.markdownDocs', run: async (s) => `${(await s.query.markdownDocs()).length}c` },
    { key: 'query.validate',     run: async (s) => `valid: ${String((await s.query.validate({ from: 'sessions', limit: 5 })).valid)}` },
]

// ── export ────────────────────────────────────────────────────────────────────

function getSdkIpc(): SdkIpc | null {
    if (!isElectron) return null
    return (globalThis as unknown as { electron?: { sdk?: SdkIpc } }).electron?.sdk ?? null
}

export default function getConnectionTests(): TestDef[] {
    const sdk = getSdkIpc()
    if (!sdk) return []

    let sessionCtx: Promise<Ctx> | null = null
    let activityCtx: Promise<Ctx> | null = null

    return SPECS.map(spec => ({
        key: spec.key,
        label: spec.key,
        electronOnly: true,
        fn: async () => {
            let ctx: Ctx = { sessionId: '', activityId: '' }
            if (spec.needs === 'session') {
                sessionCtx ??= resolveCtx(sdk, 'session')
                ctx = await sessionCtx
            } else if (spec.needs === 'activity') {
                activityCtx ??= resolveCtx(sdk, 'activity')
                ctx = await activityCtx
            }
            const summary = await spec.run(sdk, ctx)
            return { summary }
        },
    }))
}
