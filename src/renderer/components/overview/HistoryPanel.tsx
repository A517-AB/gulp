import {motion} from 'framer-motion'
import type {HistoryEntry} from '@/store/overview'

interface HistoryPanelProps {
    entries:     HistoryEntry[]
    activeIndex: number
    onSelect:    (entry: HistoryEntry) => void
    onRemove:    (id: string) => void
}

export function HistoryPanel({ entries, activeIndex, onSelect, onRemove }: HistoryPanelProps) {
    if (entries.length === 0) return null
    return (
        <motion.div
            key="history-panel"
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 4 }}
            transition={{ duration: 0.12 }}
            className="absolute bottom-full mb-3 left-0 flex flex-col gap-0 w-full max-h-64 overflow-y-auto"
        >
            {entries.map((entry, i) => (
                <div
                    key={entry.id}
                    className={`group flex items-center gap-2 py-0.5 transition-colors ${
                        i === activeIndex ? 'text-fg-primary' : 'text-fg-ghost'
                    }`}
                >
                    <button
                        className="flex-1 text-left truncate font-mono text-xs"
                        onMouseDown={e => { e.preventDefault(); onSelect(entry) }}
                    >
                        {entry.text}
                    </button>
                    <button
                        className="opacity-0 group-hover:opacity-100 text-[10px] font-mono text-fg-ghost hover:text-red-400 transition-all shrink-0"
                        onMouseDown={e => { e.preventDefault(); onRemove(entry.id) }}
                        title="Shift+Delete"
                    >
                        del
                    </button>
                </div>
            ))}
        </motion.div>
    )
}
