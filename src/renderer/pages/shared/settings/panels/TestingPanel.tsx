import { useState } from 'react'
import { sdkIpc, isElectron } from '@shared/bridge'
import { useJules } from '@/lib/jules/provider'
import { TestRow } from './TestRow'
import type { TestDef, TestResult } from '../types'

function buildTests(client: ReturnType<typeof useJules>['client']): TestDef[] {
  return [
    {
      key: 'sdk_key',
      label: 'sdkIpc.setApiKey(localStorage key)',
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
          summary: `${s.length} sources`,
          items: s.map(x => `${x.fullName} (${x.isPrivate ? 'private' : 'public'}, default: ${x.defaultBranch ?? 'n/a'})`),
        }
      },
    },
    {
      key: 'client_sources',
      label: 'client.listSources()',
      fn: async () => {
        if (!client) throw new Error('no client — API key not set?')
        const s = await client.listSources()
        return { summary: `${s.length} sources`, items: s.map(x => x.name) }
      },
    },
    {
      key: 'client_sessions',
      label: 'client.listSessions()',
      fn: async () => {
        if (!client) throw new Error('no client')
        const s = await client.listSessions()
        return {
          summary: `${s.length} sessions`,
          items: s.map(x => `[${x.status}] ${x.title || 'Untitled'} — ${x.id}`),
        }
      },
    },
    {
      key: 'client_sessions_archived',
      label: "client.listSessions({ filter: 'archived = true' })",
      fn: async () => {
        if (!client) throw new Error('no client')
        const s = await client.listSessions({ filter: 'archived = true' })
        return {
          summary: `${s.length} archived sessions`,
          items: s.map(x => `${x.title || 'Untitled'} — ${x.id}`),
        }
      },
    },
  ]
}

export function TestingPanel() {
  const { client } = useJules()
  const allTests = buildTests(client)
  const tests = allTests.filter(t => !t.electronOnly || isElectron)

  const [results, setResults] = useState<Record<string, TestResult>>(() =>
    Object.fromEntries(allTests.map(t => [t.key, { status: 'idle', summary: '' }]))
  )

  const runOne = async (def: TestDef) => {
    setResults(r => ({ ...r, [def.key]: { status: 'running', summary: '' } }))
    try {
      const out = await def.fn()
      setResults(r => ({ ...r, [def.key]: { status: 'ok', ...out } }))
    } catch (e) {
      setResults(r => ({
        ...r,
        [def.key]: { status: 'fail', summary: e instanceof Error ? e.message : String(e) },
      }))
    }
  }

  const runAll = async () => {
    for (const t of tests) await runOne(t)
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <button
          onClick={() => { void runAll() }}
          className="px-3 py-1.5 rounded bg-surface border border-subtle text-xs font-mono text-fg-primary hover:bg-hover transition-colors"
        >
          run all
        </button>
        <span className="text-[10px] font-mono text-fg-ghost">
          {isElectron ? 'electron — all tests available' : 'web — sdkIpc tests skipped'}
        </span>
      </div>
      <div className="divide-y divide-hair">
        {tests.map(t => (
          <TestRow
            key={t.key}
            label={t.label}
            result={results[t.key] ?? { status: 'idle', summary: '' }}
            onRun={() => { void runOne(t) }}
          />
        ))}
      </div>
    </div>
  )
}
