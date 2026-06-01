import { motion, AnimatePresence } from 'framer-motion'
import type { Command } from '@shared/commands'

interface CommandMenuProps {
  commands: Command[]
  activeIndex: number
  onSelect: (cmd: Command) => void
}

export function CommandMenu({ commands, activeIndex, onSelect }: CommandMenuProps) {
  return (
    <AnimatePresence>
      {commands.length > 0 && (
        <motion.div
          key="command-menu"
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 6 }}
          transition={{ duration: 0.15 }}
          className="absolute bottom-full mb-3 left-0 flex flex-col gap-0.5"
        >
          {commands.map((cmd, i) => (
            <button
              key={cmd.id}
              onMouseDown={e => { e.preventDefault(); onSelect(cmd) }}
              className={`text-left py-1 text-sm transition-colors ${
                i === activeIndex ? 'text-fg-primary' : 'text-fg-ghost hover:text-fg-secondary'
              }`}
            >
              <span className="font-mono">{cmd.trigger}{cmd.command}</span>
              {cmd.label && <span className="ml-2 text-xs opacity-40">{cmd.label}</span>}
            </button>
          ))}
        </motion.div>
      )}
    </AnimatePresence>
  )
}
