import { isElectron } from '@shared/bridge'
import type { JulesClient } from '@/lib/jules/client'
import type { TestDef } from '../types'

function getConnectionTests(client: JulesClient | null): TestDef[] {
  return [
    // ── electron env ──────────────────────────────────────────────────────────
    {
      key: 'electron_key',
      label: 'electron env.getApiKey()',
      electronOnly: true,
      fn: async () => {
        const key = await window.electron?.env.getApiKey()
        if (!key) return { summary: 'null — no key found in env or ~/.jules' }
        const masked = `${key.slice(0, 6)}…${key.slice(-4)} (${key.length} chars)`
        return { summary: masked }
      },
    },
    // ── HTTP client ───────────────────────────────────────────────────────────
    {
      key: 'client_sources',
      label: 'client.listSources()',
      fn: async () => {
        if (!client) throw new Error('no client — API key not set?')
        const s = await client.listSources()
        return { summary: `${String(s.length)} sources`, items: s.map(x => x.name) }
      },
    },
    {
      key: 'client_sessions',
      label: 'client.listSessions()',
      fn: async () => {
        if (!client) throw new Error('no client')
        const s = await client.listSessions()
        return {
          summary: `${String(s.length)} sessions`,
          items: s.map(x => `[${x.status}] ${x.title || 'Untitled'} — ${x.id}`),
        }
      },
    },
    {
      key: 'client_first_activities',
      label: 'client.listActivities(first session)',
      fn: async () => {
        if (!client) throw new Error('no client')
        const sessions = await client.listSessions()
        const [s] = sessions
        if (!s) return { summary: 'no sessions' }
        const acts = await client.listActivities(s.id)
        return {
          summary: `${String(acts.length)} activities — "${s.title || s.id}"`,
          items: acts.map(a => `[${a.type}] ${a.content.slice(0, 100)}`),
        }
      },
    },
   
  ].filter(t => !t.electronOnly || isElectron)
}

export default getConnectionTests
