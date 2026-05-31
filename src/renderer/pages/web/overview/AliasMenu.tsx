import { motion, AnimatePresence } from 'framer-motion'
import type { JulesAlias } from './types'

interface AliasMenuProps {
  aliases: JulesAlias[]
  query: string
  activeIndex: number
  onSelect: (alias: JulesAlias) => void
}

export function AliasMenu({ aliases, query, activeIndex, onSelect }: AliasMenuProps) {
  const filtered = aliases.filter(a =>
    a.command.toLowerCase().startsWith(query.toLowerCase())
  )

  return (
    <AnimatePresence>
      {filtered.length > 0 && (
        <motion.div
          key="alias-menu"
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 6 }}
          transition={{ duration: 0.15 }}
          className="absolute bottom-full mb-3 left-0 flex flex-col gap-0.5"
        >
          {filtered.map((alias, i) => (
            <button
              key={alias.id}
              onMouseDown={e => { e.preventDefault(); onSelect(alias) }}
              className={`text-left py-1 text-sm transition-colors ${
                i === activeIndex ? 'text-fg-primary' : 'text-fg-ghost hover:text-fg-secondary'
              }`}
            >
              <span className="font-mono">/{alias.command}</span>
              {alias.label && (
                <span className="ml-2 text-xs opacity-40">{alias.label}</span>
              )}
              {alias.sourceId && (
                <span className="ml-2 text-[10px] opacity-30 font-mono">{alias.sourceId}</span>
              )}
            </button>
          ))}
        </motion.div>
      )}
    </AnimatePresence>
  )
}
