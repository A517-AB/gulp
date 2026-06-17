// Dev-only test panel — gets a full pass on direct sdkIpc access.
// This file is intentionally the one place that reaches into window.electron.sdk raw.
import { isElectron } from '@shared/bridge'
import type { SdkIpc } from '@jules'
import type { TestDef } from '../types'

function getSdkIpc(): SdkIpc | null {
  if (!isElectron) return null
  return (globalThis as unknown as { electron?: { sdk?: SdkIpc } }).electron?.sdk ?? null
}

function e(electronOnly = true) { return electronOnly }

function getConnectionTests(): TestDef[] {
  return [

    // ── env ───────────────────────────────────────────────────────────────────

    {
      key: 'env_apiKey',
      label: 'env.getApiKey()',
      electronOnly: e(),
      fn: async () => {
        const key = await window.electron?.env.getApiKey()
        if (!key) return { summary: 'null — no key in env or ~/.jules', data: null }
        return { summary: `${key.slice(0, 6)}…${key.slice(-4)} (${String(key.length)} chars)`, data: { length: key.length } }
      },
    },

    // ── sources ───────────────────────────────────────────────────────────────

    {
      key: 'sources_list',
      label: 'sources.list()',
      electronOnly: e(),
      fn: async () => {
        const ipc = getSdkIpc()
        if (!ipc) throw new Error('no sdk')
        const sources = await ipc.sources.list()
        return { summary: `${String(sources.length)} sources`, items: sources.map(s => s.name), data: sources }
      },
    },
    {
      key: 'sources_resolve',
      label: 'sources.resolve()',
      electronOnly: e(),
      fn: async () => {
        const ipc = getSdkIpc()
        if (!ipc) throw new Error('no sdk')
        const source = await ipc.sources.resolve()
        return { summary: source.github ?? 'null — not in a tracked repo', data: source }
      },
    },

    // ── client ────────────────────────────────────────────────────────────────

    {
      key: 'client_sessions',
      label: 'client.sessions()',
      electronOnly: e(),
      fn: async () => {
        const ipc = getSdkIpc()
        if (!ipc) throw new Error('no sdk')
        const sessions = await ipc.client.sessions()
        return {
          summary: `${String(sessions.length)} sessions`,
          items: sessions.map(s => `[${s.state}] ${s.title || 'Untitled'} — ${s.id}`),
          data: sessions.map(s => ({ id: s.id, state: s.state, title: s.title, createTime: s.createTime })),
        }
      },
    },
    {
      key: 'client_sync',
      label: 'client.sync()',
      electronOnly: e(),
      fn: async () => {
        const ipc = getSdkIpc()
        if (!ipc) throw new Error('no sdk')
        const stats = await ipc.client.sync()
        return { summary: `sessions: ${String(stats.sessionsIngested)}, activities: ${String(stats.activitiesIngested)}, complete: ${String(stats.isComplete)}`, data: stats }
      },
    },
    {
      key: 'client_select',
      label: 'client.select() — sessions domain',
      electronOnly: e(),
      fn: async () => {
        const ipc = getSdkIpc()
        if (!ipc) throw new Error('no sdk')
        const results = await ipc.client.select({ from: 'sessions', limit: 5 })
        return { summary: `${String(results.length)} results`, data: results }
      },
    },

    // ── session (uses first session) ──────────────────────────────────────────

    {
      key: 'session_info',
      label: 'session.info(first)',
      electronOnly: e(),
      fn: async () => {
        const ipc = getSdkIpc()
        if (!ipc) throw new Error('no sdk')
        const [s] = await ipc.client.sessions()
        if (!s) return { summary: 'no sessions', data: null }
        const info = await ipc.session.info(s.id)
        return {
          summary: `[${info.state}] ${info.title || 'Untitled'}`,
          items: [`id: ${info.id}`, `url: ${info.url || 'none'}`, `state: ${info.state}`],
          data: info,
        }
      },
    },
    {
      key: 'session_snapshot',
      label: 'session.snapshot(first)',
      electronOnly: e(),
      fn: async () => {
        const ipc = getSdkIpc()
        if (!ipc) throw new Error('no sdk')
        const [s] = await ipc.client.sessions()
        if (!s) return { summary: 'no sessions', data: null }
        const snap = await ipc.session.snapshot(s.id)
        return {
          summary: `state: ${snap.state} — ${String(snap.activities.length)} activities — ${String(snap.durationMs)}ms`,
          items: snap.timeline.map(t => `[${t.time}] ${t.type}: ${t.summary}`),
          data: snap,
        }
      },
    },
    {
      key: 'session_select',
      label: 'session.select(first)',
      electronOnly: e(),
      fn: async () => {
        const ipc = getSdkIpc()
        if (!ipc) throw new Error('no sdk')
        const [s] = await ipc.client.sessions()
        if (!s) return { summary: 'no sessions', data: null }
        const acts = await ipc.session.select(s.id)
        return {
          summary: `${String(acts.length)} activities`,
          items: acts.map(a => `[${a.type}] ${a.id}`),
          data: acts,
        }
      },
    },

    // ── activities ────────────────────────────────────────────────────────────

    {
      key: 'activities_hydrate',
      label: 'activities.hydrate(first)',
      electronOnly: e(),
      fn: async () => {
        const ipc = getSdkIpc()
        if (!ipc) throw new Error('no sdk')
        const [s] = await ipc.client.sessions()
        if (!s) return { summary: 'no sessions', data: null }
        const count = await ipc.activities.hydrate(s.id)
        return {
          summary: count === 0 ? '0 new — cache already current' : `${String(count)} activities synced`,
          data: { count },
        }
      },
    },
    {
      key: 'activities_list',
      label: 'activities.list(first session)',
      electronOnly: e(),
      fn: async () => {
        const ipc = getSdkIpc()
        if (!ipc) throw new Error('no sdk')
        const [s] = await ipc.client.sessions()
        if (!s) return { summary: 'no sessions', data: null }
        const { activities: acts, nextPageToken } = await ipc.activities.list(s.id)
        return {
          summary: `${String(acts.length)} activities${nextPageToken ? ' (more pages)' : ''} — "${s.title || s.id}"`,
          items: acts.map(a => `[${a.type}] ${a.id}`),
          data: { count: acts.length, nextPageToken, activities: acts },
        }
      },
    },
    {
      key: 'activities_select',
      label: 'activities.select(first session)',
      electronOnly: e(),
      fn: async () => {
        const ipc = getSdkIpc()
        if (!ipc) throw new Error('no sdk')
        const [s] = await ipc.client.sessions()
        if (!s) return { summary: 'no sessions', data: null }
        const acts = await ipc.activities.select(s.id)
        return {
          summary: `${String(acts.length)} activities`,
          items: acts.map(a => `[${a.type}] ${a.id}`),
          data: acts,
        }
      },
    },
    {
      key: 'activities_get',
      label: 'activities.get(first activity)',
      electronOnly: e(),
      fn: async () => {
        const ipc = getSdkIpc()
        if (!ipc) throw new Error('no sdk')
        const [s] = await ipc.client.sessions()
        if (!s) return { summary: 'no sessions', data: null }
        const { activities: acts } = await ipc.activities.list(s.id)
        const [a] = acts
        if (!a) return { summary: 'no activities', data: null }
        const activity = await ipc.activities.get(s.id, a.id)
        return {
          summary: `[${activity.type}] id: ${activity.id}`,
          items: [`type: ${activity.type}`, `createTime: ${activity.createTime}`, `originator: ${activity.originator}`, `artifacts: ${String(activity.artifacts.length)}`],
          data: activity,
        }
      },
    },

    // ── util ──────────────────────────────────────────────────────────────────

    {
      key: 'util_toSummary',
      label: 'util.toSummary(first activity)',
      electronOnly: e(),
      fn: async () => {
        const ipc = getSdkIpc()
        if (!ipc) throw new Error('no sdk')
        const [s] = await ipc.client.sessions()
        if (!s) return { summary: 'no sessions', data: null }
        const { activities: acts } = await ipc.activities.list(s.id)
        const [a] = acts
        if (!a) return { summary: 'no activities', data: null }
        const result = await ipc.util.toSummary(a)
        return { summary: result.summary.slice(0, 120), items: [`type: ${result.type}`, `id: ${result.id}`], data: result }
      },
    },
    {
      key: 'util_toSummaries',
      label: 'util.toSummaries(first 3 activities)',
      electronOnly: e(),
      fn: async () => {
        const ipc = getSdkIpc()
        if (!ipc) throw new Error('no sdk')
        const [s] = await ipc.client.sessions()
        if (!s) return { summary: 'no sessions', data: null }
        const { activities: acts } = await ipc.activities.list(s.id)
        const summaries = await ipc.util.toSummaries(acts.slice(0, 3))
        return {
          summary: `${String(summaries.length)} summaries`,
          items: summaries.map(s => `[${s.type}] ${s.summary.slice(0, 80)}`),
          data: summaries,
        }
      },
    },

    // ── artifact ──────────────────────────────────────────────────────────────

    {
      key: 'artifact_parseUnidiff',
      label: 'artifact.parseUnidiff(null)',
      electronOnly: e(),
      fn: async () => {
        const ipc = getSdkIpc()
        if (!ipc) throw new Error('no sdk')
        const files = await ipc.artifact.parseUnidiff(null)
        return { summary: `${String(files.length)} files — null input correctly returns empty`, data: files }
      },
    },
    {
      key: 'artifact_parseUnidiffWithContent',
      label: 'artifact.parseUnidiffWithContent(null)',
      electronOnly: e(),
      fn: async () => {
        const ipc = getSdkIpc()
        if (!ipc) throw new Error('no sdk')
        const files = await ipc.artifact.parseUnidiffWithContent(null)
        return { summary: `${String(files.length)} files — null input correctly returns empty`, data: files }
      },
    },

    // ── query ─────────────────────────────────────────────────────────────────

    {
      key: 'query_schemas',
      label: 'query.schemas()',
      electronOnly: e(),
      fn: async () => {
        const ipc = getSdkIpc()
        if (!ipc) throw new Error('no sdk')
        const schemas = await ipc.query.schemas()
        return { summary: `domains: ${Object.keys(schemas).join(', ')}`, data: schemas }
      },
    },
    {
      key: 'query_typeDef_sessions',
      label: 'query.typeDef(sessions)',
      electronOnly: e(),
      fn: async () => {
        const ipc = getSdkIpc()
        if (!ipc) throw new Error('no sdk')
        const def = await ipc.query.typeDef('sessions')
        return { summary: `${String(def.length)} chars`, items: [def.slice(0, 300)], data: { length: def.length, preview: def.slice(0, 500) } }
      },
    },
    {
      key: 'query_markdownDocs',
      label: 'query.markdownDocs()',
      electronOnly: e(),
      fn: async () => {
        const ipc = getSdkIpc()
        if (!ipc) throw new Error('no sdk')
        const docs = await ipc.query.markdownDocs()
        return { summary: `${String(docs.length)} chars`, data: { length: docs.length, preview: docs.slice(0, 500) } }
      },
    },
    {
      key: 'query_validate',
      label: 'query.validate({}) — expects invalid',
      electronOnly: e(),
      fn: async () => {
        const ipc = getSdkIpc()
        if (!ipc) throw new Error('no sdk')
        const result = await ipc.query.validate({})
        return {
          summary: `valid: ${String(result.valid)} — empty object correctly rejected (missing 'from')`,
          data: result,
        }
      },
    },
    {
      key: 'query_validate_valid',
      label: 'query.validate({ from: sessions }) — expects valid',
      electronOnly: e(),
      fn: async () => {
        const ipc = getSdkIpc()
        if (!ipc) throw new Error('no sdk')
        const result = await ipc.query.validate({ from: 'sessions', limit: 5 })
        return { summary: `valid: ${String(result.valid)}`, data: result }
      },
    },

  ].filter(t => !t.electronOnly || isElectron)
}

export default getConnectionTests
