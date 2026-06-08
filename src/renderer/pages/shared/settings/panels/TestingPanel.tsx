import { useState } from 'react'
import { useJules } from '@/lib/jules/provider'
import { isElectron } from '@shared/bridge'
import getConnectionTests from './connection-tests'
import { TestRow } from './TestRow'
import type { TestResult } from '../types'

export function TestingPanel() {
  const { client } = useJules()
  const tests = getConnectionTests(client)

  const [results, setResults] = useState<Record<string, TestResult>>(() =>
    Object.fromEntries(tests.map(t => [t.key, { status: 'idle', summary: '' }]))
  )

  const runOne = async (key: string, fn: () => Promise<{ summary: string; items?: string[] }>) => {
    setResults(r => ({ ...r, [key]: { status: 'running', summary: '' } }))
    try {
      const out = await fn()
      setResults(r => ({ ...r, [key]: { status: 'ok', ...out } }))
    } catch (e) {
      setResults(r => ({
        ...r,
        [key]: { status: 'fail', summary: e instanceof Error ? e.message : String(e) },
      }))
    }
  }

  const runAll = async () => {
    for (const t of tests) await runOne(t.key, t.fn)
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
            onRun={() => { void runOne(t.key, t.fn) }}
          />
        ))}
      </div>
    </div>
  )
}
