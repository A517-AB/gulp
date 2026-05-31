import type { ReactNode } from 'react'
import { useState } from 'react'
import { sdkIpc, isElectron } from '@shared/bridge'
import { useJules } from '@/lib/jules/provider'
import { motion, AnimatePresence } from 'framer-motion'

// ── accordion section ─────────────────────────────────────────────────────────

function Section({ title, children, defaultOpen = false }: {
  title: string
  children: ReactNode
  defaultOpen?: boolean
}) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="border-b border-hair last:border-0">
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between py-4 text-xs font-mono uppercase tracking-widest text-fg-dim hover:text-fg-primary transition-colors text-left"
      >
        {title}
        <span className="text-fg-ghost">{open ? '−' : '+'}</span>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <div className="pb-8">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ── test types ────────────────────────────────────────────────────────────────

interface TestResult {
  status: 'idle' | 'running' | 'ok' | 'fail'
  summary: string
  items?: string[]
}

interface TestDef {
  key: string
  label: string
  electronOnly?: boolean
  fn: () => Promise<{ summary: string; items?: string[] }>
}

// ── test row ──────────────────────────────────────────────────────────────────

function TestRow({ label, result, onRun }: {
  label: string
  result: TestResult
  onRun: () => void
}) {
  const [expanded, setExpanded] = useState(false)

  const copyResult = () => {
    const text = result.items
      ? `${result.summary}\n${result.items.join('\n')}`
      : result.summary
    void navigator.clipboard.writeText(text)
  }

  const hasItems = result.items && result.items.length > 0
  const isFail = result.status === 'fail'
  const isOk = result.status === 'ok'

  return (
    <div className="space-y-2 py-2">
      <div className="flex items-start gap-2">
        <button
          onClick={onRun}
          disabled={result.status === 'running'}
          className="shrink-0 mt-0.5 px-2 py-1 rounded bg-surface border border-subtle text-[10px] font-mono text-fg-muted hover:text-fg-primary hover:bg-hover transition-colors disabled:opacity-40"
        >
          {result.status === 'running' ? '…' : 'run'}
        </button>
        <span className="text-xs font-mono text-fg-secondary leading-relaxed flex-1 break-all">{label}</span>
        {(isOk || isFail) && (
          <span className={`shrink-0 mt-0.5 text-[10px] font-mono ${isOk ? 'text-green-500' : 'text-red-400'}`}>
            {isOk ? '✓' : '✕'}
          </span>
        )}
      </div>

      {result.summary && result.status !== 'idle' && result.status !== 'running' && (
        <div className="ml-12 space-y-1.5">
          <div className={`relative group/res rounded border px-3 py-2 text-[11px] font-mono leading-relaxed whitespace-pre-wrap break-all ${
            isFail ? 'bg-red-500/5 border-red-500/20 text-red-300' : 'bg-surface border-subtle text-fg-secondary'
          }`}>
            {result.summary}
            <button
              onClick={copyResult}
              className="absolute top-1.5 right-1.5 opacity-0 group-hover/res:opacity-100 transition-opacity text-[9px] font-mono text-fg-ghost hover:text-fg-primary bg-base border border-hair px-1.5 py-0.5 rounded"
            >
              copy
            </button>
          </div>

          {hasItems && (
            <>
              <button
                onClick={() => setExpanded(v => !v)}
                className="text-[10px] font-mono text-fg-ghost hover:text-fg-secondary transition-colors"
              >
                {expanded ? '▲ hide' : `▼ see all (${result.items!.length})`}
              </button>
              <AnimatePresence>
                {expanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.15 }}
                    className="overflow-hidden"
                  >
                    <div className="rounded border border-subtle bg-surface max-h-56 overflow-y-auto">
                      {result.items!.map((item, i) => (
                        <div key={i} className="px-3 py-1.5 text-[10px] font-mono text-fg-secondary border-b border-hair last:border-0">
                          {item}
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </>
          )}
        </div>
      )}
    </div>
  )
}

// ── test definitions ──────────────────────────────────────────────────────────

function buildTests(client: ReturnType<typeof useJules>['client']): TestDef[] {
  return [
    // ── sdkIpc (Electron only) ─────────────────────────────────────────────
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
    // ── HTTP client ────────────────────────────────────────────────────────
    {
      key: 'client_sources',
      label: 'client.listSources()',
      fn: async () => {
        if (!client) throw new Error('no client — API key not set?')
        const s = await client.listSources()
        return {
          summary: `${s.length} sources`,
          items: s.map(x => x.name),
        }
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

// ── testing panel ─────────────────────────────────────────────────────────────

function TestingPanel() {
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

// ── general panel ─────────────────────────────────────────────────────────────

function GeneralPanel() {
  return <p className="text-xs text-fg-muted">Nothing here yet.</p>
}

// ── page ──────────────────────────────────────────────────────────────────────

export default function SettingsPage() {
  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-2xl mx-auto px-8 py-10">
        <Section title="General">
          <GeneralPanel />
        </Section>
        <Section title="Testing" defaultOpen>
          <TestingPanel />
        </Section>
      </div>
    </div>
  )
}
