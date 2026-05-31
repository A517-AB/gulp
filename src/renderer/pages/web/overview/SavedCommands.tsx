import { motion, AnimatePresence } from 'framer-motion'
import type { JulesAlias } from './types'

interface SavedCommandsProps {
  aliases: JulesAlias[]
  activeId: string | null
  onSelect: (alias: JulesAlias) => void
  visible: boolean
}

export function SavedCommands({ aliases, activeId, onSelect, visible }: SavedCommandsProps) {
  if (aliases.length === 0) return null

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="flex flex-wrap gap-2 pt-3"
        >
          {aliases.map(alias => (
            <button
              key={alias.id}
              onClick={() => { onSelect(alias); }}
              className={`text-[10px] font-mono px-2 py-0.5 rounded transition-colors ${
                activeId === alias.id
                  ? 'text-fg-primary bg-surface'
                  : 'text-fg-ghost hover:text-fg-secondary'
              }`}
            >
              /{alias.command}
            </button>
          ))}
        </motion.div>
      )}
    </AnimatePresence>
  )
}
