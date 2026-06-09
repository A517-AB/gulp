import {isElectron, sdkIpc} from '@shared/bridge'
import {activityText} from '@/utils/activity'
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
        const masked = `${key.slice(0, 6)}…${key.slice(-4)} (${key.length} chars)`
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
          if (!sdkIpc) throw new Error('no sdkIpc')
          const sessions = await sdkIpc.client.sessions()
        const [s] = sessions
        if (!s) return { summary: 'no sessions' }
          const {activities: acts} = await sdkIpc.activities.list(s.id)
        return {
          summary: `${String(acts.length)} activities — "${s.title || s.id}"`,
            items: acts.map(a => `[${a.type}] ${activityText(a).slice(0, 100)}`),
        }
      },
    },
  ].filter(t => !t.electronOnly || isElectron)
}

export default getConnectionTests
