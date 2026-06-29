import {create} from 'zustand'

export interface ReplLine {
    id: number
    text: string
    kind: 'in' | 'out' | 'err'
}

export interface ReplStore {
    lines: ReplLine[]
    input: string
    history: string[]
    histCursor: number
    setLines: (lines: ReplLine[] | ((prev: ReplLine[]) => ReplLine[])) => void
    setInput: (input: string) => void
    setHistory: (history: string[] | ((prev: string[]) => string[])) => void
    setHistCursor: (cursor: number | ((prev: number) => number)) => void
    clearLines: () => void
}

export const useReplStore = create<ReplStore>((set) => ({
    lines: [],
    input: '',
    history: [],
    histCursor: -1,
    setLines: (updater) => set((state) => ({
        lines: typeof updater === 'function' ? updater(state.lines) : updater
    })),
    setInput: (input) => set({input}),
    setHistory: (updater) => set((state) => ({
        history: typeof updater === 'function' ? updater(state.history) : updater
    })),
    setHistCursor: (updater) => set((state) => ({
        histCursor: typeof updater === 'function' ? updater(state.histCursor) : updater
    })),
    clearLines: () => set({lines: []}),
}))
