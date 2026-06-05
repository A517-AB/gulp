import { sdkIpc, isElectron } from '@shared/bridge'
import type { JulesClient } from '@/lib/jules/client'
import type { TestDef } from '../types'

export function getConnectionTests(client: JulesClient | null): TestDef[] {
  return [
    // ── sdkIpc (Electron only) ─────────────────────────────────────────────
    {
      key: 'sdk_key',
      label: 'sdkIpc.setApiKey()',
      electronOnly: true,
      fn: async () => {
        if (!sdkIpc) throw new Error('sdkIpc is null')
        await sdkIpc.setApiKey(localStorage.getItem('jules-api-key'))
        return { summary: 'reachable — key forwarded to main process' }
      },
    },
    {
      key: 'sdk_sources',
      label: 'sdkIpc.listSources()',
      electronOnly: true,
      fn: async () => {
        if (!sdkIpc) throw new Error('sdkIpc is null')
        const s = await sdkIpc.listSources()
        return {
          summary: `${String(s.length)} sources`,
          items: s.map(x => `${x.fullName} (${x.isPrivate ? 'private' : 'public'}, default: ${x.defaultBranch ?? 'n/a'})`),
        }
      },
    },
    {
      key: 'sdk_sessions',
      label: 'sdkIpc.listSessions()',
      electronOnly: true,
      fn: async () => {
        if (!sdkIpc) throw new Error('sdkIpc is null')
        const s = await sdkIpc.listSessions({ limit: 20 })
        return {
          summary: `${String(s.length)} sessions`,
          items: s.map(x => `[${x.state}] ${x.title || 'Untitled'} — ${x.id}`),
        }
      },
    },
    // ── HTTP client ────────────────────────────────────────────────────────
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
  ].filter(t => !t.electronOnly || isElectron)
}
