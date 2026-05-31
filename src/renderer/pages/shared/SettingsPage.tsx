import type { ReactNode } from 'react'
import { useState } from 'react'
import { sdkIpc } from '@shared/bridge'
import { useJules } from '@/lib/jules/provider'

// ── section registry ──────────────────────────────────────────────────────────

type SectionId = 'general' | 'testing'

interface Section {
  id: SectionId
  label: string
  panel: () => ReactNode
}

// ── panels ────────────────────────────────────────────────────────────────────

function GeneralPanel() {
  return (
    <div>
      <p className="text-xs text-fg-muted">Nothing here yet.</p>
    </div>
  )
}

function TestingPanel() {
  const { client } = useJules()
  const [results, setResults] = useState<Record<string, string>>({})

  const run = (key: string, fn: () => Promise<string>) => async () => {
    setResults(r => ({ ...r, [key]: '…' }))
    try {
      const val = await fn()
      setResults(r => ({ ...r, [key]: `✓ ${val}` }))
    } catch (e) {
      setResults(r => ({ ...r, [key]: `✕ ${e instanceof Error ? e.message : String(e)}` }))
    }
  }

  const tests: { key: string; label: string; fn: () => Promise<string> }[] = [
    {
      key: 'sdkIpc',
      label: 'sdkIpc reachable',
      fn: async () => {
        if (!sdkIpc) return 'null — not in Electron'
        await sdkIpc.setApiKey(localStorage.getItem('jules-api-key'))
        return 'reachable, key forwarded'
      },
    },
    {
      key: 'listSessions',
      label: 'client.listSessions()',
      fn: async () => {
        if (!client) return 'no client'
        const sessions = await client.listSessions()
        return `${sessions.length} sessions`
      },
    },
    {
      key: 'listArchived',
      label: 'client.listSessions({ filter: "archived = true" })',
      fn: async () => {
        if (!client) return 'no client'
        const sessions = await client.listSessions({ filter: 'archived = true' })
        return `${sessions.length} archived sessions`
      },
    },
    {
      key: 'listSources',
      label: 'client.listSources()',
      fn: async () => {
        if (!client) return 'no client'
        const sources = await client.listSources()
        return `${sources.length} sources`
      },
    },
    {
      key: 'sdkSources',
      label: 'sdkIpc.listSources()',
      fn: async () => {
        if (!sdkIpc) return 'null — not in Electron'
        const sources = await sdkIpc.listSources()
        return `${sources.length} sources`
      },
    },
  ]

  return (
    <div className="space-y-2 max-w-xl">
      {tests.map(t => (
        <div key={t.key} className="flex items-center gap-3">
          <button
            onClick={() => { void run(t.key, t.fn)() }}
            className="shrink-0 px-3 py-1 rounded bg-surface border border-subtle text-xs font-mono text-fg-primary hover:bg-hover transition-colors"
          >
            run
          </button>
          <span className="text-xs font-mono text-fg-muted truncate">{t.label}</span>
          {results[t.key] && (
            <span className="text-xs font-mono text-fg-secondary ml-auto shrink-0">{results[t.key]}</span>
          )}
        </div>
      ))}
    </div>
  )
}

// ── registry ──────────────────────────────────────────────────────────────────

const SECTIONS: Section[] = [
  { id: 'general', label: 'General', panel: GeneralPanel },
  { id: 'testing', label: 'Testing', panel: TestingPanel },
]

// ── page ──────────────────────────────────────────────────────────────────────

export default function SettingsPage() {
  const [active, setActive] = useState<SectionId>('general')
  const current = SECTIONS.find(s => s.id === active)

  return (
    <div className="flex h-full w-full">
      <div className="w-44 shrink-0 border-r border-hair pt-8 px-3 flex flex-col gap-0.5">
        {SECTIONS.map(s => (
          <button
            key={s.id}
            onClick={() => setActive(s.id)}
            className={`text-left px-3 py-1.5 rounded text-xs transition-colors ${
              active === s.id
                ? 'bg-surface text-fg-primary'
                : 'text-fg-muted hover:text-fg-primary hover:bg-hover'
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto pt-8 px-10">
        <h2 className="text-xs font-mono uppercase tracking-widest text-fg-dim mb-6">
          {current?.label}
        </h2>
        {current && <current.panel />}
      </div>
    </div>
  )
}
