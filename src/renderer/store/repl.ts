import {create} from 'zustand'

export interface LogEntry {
    type: 'input' | 'stdout' | 'stderr' | 'result' | 'error' | 'info'
    text: string
}

interface ReplStore {
    logs: LogEntry[]
    history: string[]
    setLogs: (updater: LogEntry[] | ((prev: LogEntry[]) => LogEntry[])) => void
    setHistory: (updater: string[] | ((prev: string[]) => string[])) => void
    clearLogs: () => void
}

export const useReplStore = create<ReplStore>((set) => ({
    logs: [],
    history: (() => {
        try {
            const saved = localStorage.getItem('repl_history')
            if (saved) {
                const parsed = JSON.parse(saved) as unknown
                if (Array.isArray(parsed)) return parsed as string[]
            }
        } catch {
            // localStorage unavailable
        }
        return []
    })(),
    setLogs: (updater) => {
        set((state) => ({
            logs: typeof updater === 'function' ? updater(state.logs) : updater,
        }))
    },
    setHistory: (updater) => {
        set((state) => {
            const next =
                typeof updater === 'function' ? updater(state.history) : updater
            try {
                localStorage.setItem('repl_history', JSON.stringify(next))
            } catch {
                // localStorage unavailable
            }
            return {history: next}
        })
    },
    clearLogs: () => {
        set({logs: []})
    },
}))
