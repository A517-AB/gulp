import {useState} from 'react'
import {isElectron} from '@shared/bridge'
import getConnectionTests from './connection-tests'
import {TestRow} from './TestRow'
import type {TestResult} from '../types'

function downloadFile(name: string, content: string, mime: string) {
  const blob = new Blob([content], { type: mime })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = name
  a.click()
  URL.revokeObjectURL(url)
}

function buildMd(tests: ReturnType<typeof getConnectionTests>, results: Record<string, TestResult>): string {
  const ts = new Date().toISOString()
  const mode = isElectron ? 'electron' : 'web'
  const lines: string[] = [
    `# IPC Connection Test Report`,
    ``,
    `**Generated:** ${ts}  `,
    `**Mode:** ${mode}  `,
    `**Tests run:** ${Object.values(results).filter(r => r.status !== 'idle').length} / ${tests.length}`,
    ``,
    `---`,
    ``,
  ]
  for (const t of tests) {
    const r = results[t.key]
    if (!r) continue
    const icon = r.status === 'ok' ? '✅' : r.status === 'fail' ? '❌' : r.status === 'running' ? '⏳' : '⬜'
    lines.push(`## ${icon} \`${t.key}\``)
    lines.push(``)
    lines.push(`**Label:** ${t.label}  `)
    lines.push(`**Status:** ${r.status}  `)
    if (r.summary) lines.push(`**Summary:** ${r.summary}  `)
    if (r.items?.length) {
      lines.push(``)
      lines.push(`**Items:**`)
      for (const item of r.items) lines.push(`- ${item}`)
    }
    if (r.data !== undefined) {
      lines.push(``)
      lines.push(`**Raw data:**`)
      lines.push(`\`\`\`json`)
      lines.push(JSON.stringify(r.data, null, 2))
      lines.push(`\`\`\``)
    }
    lines.push(``)
  }
  return lines.join('\n')
}

export function TestingPanel() {
  const tests = getConnectionTests()

  const [results, setResults] = useState<Record<string, TestResult>>(() =>
    Object.fromEntries(tests.map(t => [t.key, { status: 'idle', summary: '' }]))
  )

  const runOne = async (key: string, fn: () => Promise<{ summary: string; items?: string[]; data?: unknown }>) => {
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

  const exportJson = () => {
    const payload = {
      generatedAt: new Date().toISOString(),
      mode: isElectron ? 'electron' : 'web',
      results: Object.fromEntries(
        tests.map(t => [t.key, { label: t.label, ...results[t.key] }])
      ),
    }
    downloadFile('ipc-report.json', JSON.stringify(payload, null, 2), 'application/json')
  }

  const exportMd = () => {
    downloadFile('ipc-report.md', buildMd(tests, results), 'text/markdown')
  }

  const hasAnyResult = Object.values(results).some(r => r.status !== 'idle')

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3 flex-wrap">
        <button
          onClick={() => { void runAll() }}
          className="px-3 py-1.5 rounded bg-surface border border-subtle text-xs font-mono text-fg-primary hover:bg-hover transition-colors"
        >
          run all
        </button>
        {hasAnyResult && (
          <>
            <button
              onClick={exportJson}
              className="px-3 py-1.5 rounded bg-surface border border-subtle text-xs font-mono text-fg-secondary hover:bg-hover transition-colors"
            >
              export json
            </button>
            <button
              onClick={exportMd}
              className="px-3 py-1.5 rounded bg-surface border border-subtle text-xs font-mono text-fg-secondary hover:bg-hover transition-colors"
            >
              export md
            </button>
          </>
        )}
        <span className="text-[10px] font-mono text-fg-ghost">
          {isElectron ? 'electron — all tests available' : 'web — jules tests skipped'}
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
