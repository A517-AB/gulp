import {isElectron, sdkIpc} from '@shared/bridge'
import type {TestDef} from '../types'

function getConnectionTests(): TestDef[] {
  return [
    // ── electron env ──────────────────────────────────────────────────────────
    {
      key: 'electron_key',
      label: 'electron env.getApiKey()',
      electronOnly: true,
      fn: async () => {
        const key = await window.electron?.env.getApiKey()
        if (!key) return { summary: 'null — no key found in env or ~/.jules' }
          const masked = `${key.slice(0, 6)}…${key.slice(-4)} (${String(key.length)} chars)`
        return { summary: masked }
      },
    },
      // ── sdk ───────────────────────────────────────────────────────────────────
    {
      key: 'client_sources',
        label: 'sdkIpc.sources.list()',
      fn: async () => {
          if (!sdkIpc) throw new Error('no sdkIpc — Electron only')
          const s = await sdkIpc.sources.list()
        return { summary: `${String(s.length)} sources`, items: s.map(x => x.name) }
      },
    },
    {
      key: 'client_sessions',
        label: 'sdkIpc.client.sessions()',
      fn: async () => {
          if (!sdkIpc) throw new Error('no sdkIpc')
          const s = await sdkIpc.client.sessions()
        return {
          summary: `${String(s.length)} sessions`,
            items: s.map(x => `[${x.state}] ${x.title || 'Untitled'} — ${x.id}`),
        }
      },
    },
    {
      key: 'client_first_activities',
        label: 'sdkIpc.activities.list(first session)',
      fn: async () => {
          const ipc = sdkIpc
          if (!ipc) throw new Error('no sdkIpc')
          const sessions = await ipc.client.sessions()
        const [s] = sessions
        if (!s) return { summary: 'no sessions' }
          const {activities: acts} = await ipc.activities.list(s.id)
          const summaries = await Promise.all(acts.map(a => ipc.util.toSummary(a)))
        return {
          summary: `${String(acts.length)} activities — "${s.title || s.id}"`,
            items: summaries.map(s => `[${s.type}] ${s.summary.slice(0, 100)}`),
        }
      },
    },
  ].filter(t => !t.electronOnly || isElectron)
}

export default getConnectionTests
