import type {JulesClient, SessionResource} from '@jules'
import {jules} from '@jules'
import type { TestDef } from '../types'

// ── shared context ────────────────────────────────────────────────────────────

interface Ctx { sessionId: string; activityId: string }

async function resolveCtx(sdk: JulesClient, needs: 'session' | 'activity'): Promise<Ctx> {
    let firstSession: SessionResource | undefined
    for await (const s of sdk.sessions({pageSize: 1})) {
        firstSession = s
        break
    }
    if (!firstSession) throw new Error('no sessions')
    if (needs === 'session') return {sessionId: firstSession.id, activityId: ''}
    const {activities} = await sdk.session(firstSession.id).activities.list()
    const [first] = activities
    if (!first) throw new Error('no activities in first session')
    return {sessionId: firstSession.id, activityId: first.id}
}

// ── SDK spec table ────────────────────────────────────────────────────────────

interface Spec {
    key: string
    needs?: 'session' | 'activity'
    run: (sdk: JulesClient, ctx: Ctx) => Promise<string>
}

const SPECS: Spec[] = [
    {
        key: 'sessions.list',
        run: async (s) => {
            let count = 0
            for await (const _ of s.sessions({pageSize: 5})) {
                if (++count >= 5) break
            }
            return `${count} sessions`
        },
    },

    {
        key: 'sources.list',
        run: async (s) => {
            const list: unknown[] = []
            for await (const src of s.sources()) list.push(src)
            return `${list.length} sources`
        },
    },

    {
        key: 'activities.hydrate',
        needs: 'session',
        run: async (s, {sessionId: id}) => {
            const n = await s.session(id).activities.hydrate()
            return `${n} synced`
        },
    },

    {
        key: 'activities.list',
        needs: 'session',
        run: async (s, {sessionId: id}) => {
            const {activities} = await s.session(id).activities.list()
            return `${activities.length} activities`
        },
    },

    {
        key: 'activities.select',
        needs: 'session',
        run: async (s, {sessionId: id}) => {
            const acts = await s.session(id).activities.select()
            return `${acts.length} activities`
        },
    },

    {
        key: 'activities.get',
        needs: 'activity',
        run: async (s, {sessionId: sid, activityId: aid}) => {
            const a = await s.session(sid).activities.get(aid)
            return `[${a.type}]`
        },
    },
]

// ── BlockNote spec table ──────────────────────────────────────────────────────

interface BnSpec {
    key: string
    run: () => Promise<string>
}

const BN_SPECS: BnSpec[] = [
    {
        key: 'blocknote.create',
        run: async () => {
            const { BlockNoteEditor } = await import('@blocknote/core')
            const ed = BlockNoteEditor.create()
            return `headless=${String(ed.headless)}, blocks=${ed.document.length}`
        },
    },
    {
        key: 'blocknote.markdown.parse',
        run: async () => {
            const { BlockNoteEditor } = await import('@blocknote/core')
            const ed = BlockNoteEditor.create()
            const blocks = ed.tryParseMarkdownToBlocks('# Hello\n\nworld')
            const types = blocks.map(b => b.type).join(', ')
            return `${blocks.length} blocks: ${types}`
        },
    },
    {
        key: 'blocknote.markdown.roundtrip',
        run: async () => {
            const { BlockNoteEditor } = await import('@blocknote/core')
            const ed = BlockNoteEditor.create()
            const input = '**bold** and _italic_'
            const blocks = ed.tryParseMarkdownToBlocks(input)
            const out = ed.blocksToMarkdownLossy(blocks).trim()
            return `${input.length}c in → ${out.length}c out: "${out.slice(0, 50)}"`
        },
    },
    {
        key: 'blocknote.html.parse',
        run: async () => {
            const { BlockNoteEditor } = await import('@blocknote/core')
            const ed = BlockNoteEditor.create()
            const blocks = ed.tryParseHTMLToBlocks('<h1>Test</h1><p>Hello <strong>world</strong></p>')
            return `${blocks.length} blocks, type[0]=${blocks[0]?.type ?? 'none'}`
        },
    },
    {
        key: 'blocknote.mantine.themes',
        run: async () => {
            const { darkDefaultTheme, lightDefaultTheme } = await import('@blocknote/mantine')
            const dk = darkDefaultTheme.colors.editor.background
            const lt = lightDefaultTheme.colors.editor.background
            return `dark="${dk}", light="${lt}"`
        },
    },
]

// ── export ────────────────────────────────────────────────────────────────────

export default function getConnectionTests(): TestDef[] {
    const bnTests: TestDef[] = BN_SPECS.map(spec => ({
        key: spec.key,
        label: spec.key,
        fn: async () => ({ summary: await spec.run() }),
    }))

    let sessionCtx: Promise<Ctx> | null = null
    let activityCtx: Promise<Ctx> | null = null

    const sdkTests: TestDef[] = SPECS.map(spec => ({
        key: spec.key,
        label: spec.key,
        fn: async () => {
            let ctx: Ctx = { sessionId: '', activityId: '' }
            if (spec.needs === 'session') {
                sessionCtx ??= resolveCtx(jules, 'session')
                ctx = await sessionCtx
            } else if (spec.needs === 'activity') {
                activityCtx ??= resolveCtx(jules, 'activity')
                ctx = await activityCtx
            }
            const summary = await spec.run(jules, ctx)
            return { summary }
        },
    }))

    return [...bnTests, ...sdkTests]
}
