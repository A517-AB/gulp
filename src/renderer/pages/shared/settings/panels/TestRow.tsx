import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { TestResult } from '../types'

interface TestRowProps {
  label: string
  result: TestResult
  onRun: () => void
}

export function TestRow({ label, result, onRun }: TestRowProps) {
  const [expanded, setExpanded] = useState(false)
  const isFail = result.status === 'fail'
  const isOk = result.status === 'ok'
  const hasItems = result.items && result.items.length > 0

  const copyResult = () => {
    const text = hasItems
      ? `${result.summary}\n${result.items?.join('\n')}`
      : result.summary
    void navigator.clipboard.writeText(text)
  }

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
                onClick={() => { setExpanded(v => !v); }}
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
