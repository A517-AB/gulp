import { motion } from 'framer-motion'
import type { Command } from '@shared/commands'

interface CommandMenuProps {
    commands:    Command[]
    activeIndex: number
    onSelect:    (cmd: Command) => void
}

export function CommandMenu({ commands, activeIndex, onSelect }: CommandMenuProps) {
    if (commands.length === 0) return null
    return (
        <motion.div
            key="command-menu"
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 4 }}
            transition={{ duration: 0.12 }}
            className="absolute bottom-full mb-3 left-0 flex flex-col gap-0.5"
        >
            {commands.map((cmd, i) => (
                <button
                    key={cmd.id}
                    onMouseDown={e => { e.preventDefault(); onSelect(cmd) }}
                    className={`text-left py-0.5 text-sm font-mono transition-colors ${
                        i === activeIndex ? 'text-fg-primary' : 'text-fg-ghost hover:text-fg-secondary'
                    }`}
                >
                    {cmd.trigger}{cmd.alias}
                    <span className="ml-2 text-[10px] opacity-40">
                        {cmd.trigger === '@' ? 'send message' : cmd.trigger === '/' ? 'pull markdown' : 'run script'}
                    </span>
                </button>
            ))}
        </motion.div>
    )
}
