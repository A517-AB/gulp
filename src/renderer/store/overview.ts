import {create} from 'zustand'
import type {Command} from '@shared/commands'
import {filesystem} from '@shared/bridge'

const COMMANDS_FILE = 'D:\\fuse\\commands.json'
const HISTORY_KEY = 'last:history'
const MAX_HISTORY = 200

export interface CommandPatch {
    trigger?: '@' | '/' | '>' | ':'
    alias?: string
    enabled?: boolean
    snippetId?: string
    sessionId?: string
    script?: string
    cwd?: string
}

export interface HistoryEntry {
    id: string
    text: string
    timestamp: string
}

interface OverviewStore {
    commands: Command[]
    history: HistoryEntry[]
    loaded: boolean

    load: () => Promise<void>

    // Commands actions
    addCommand: (command: Command) => Promise<void>
    removeCommand: (id: string) => Promise<void>
    toggleCommand: (id: string) => Promise<void>
    updateCommand: (id: string, patch: CommandPatch) => Promise<void>

    // History actions
    pushHistory: (text: string) => Promise<void>
    removeHistory: (id: string) => Promise<void>
}

async function loadCommands(): Promise<Command[]> {
    if (!filesystem) {
        console.warn('[overview] no filesystem IPC');
        return []
    }
    try {
        const raw = await filesystem.readFile(COMMANDS_FILE)
        return JSON.parse(raw) as Command[]
    } catch (err) {
        console.error('[overview] failed to load commands from', COMMANDS_FILE, err)
        return []
    }
}

async function saveCommands(commands: Command[]): Promise<void> {
    if (!filesystem) return
    await filesystem.writeFile(COMMANDS_FILE, JSON.stringify(commands, null, 2))
}

function loadHistory(): HistoryEntry[] {
    try {
        const raw = localStorage.getItem(HISTORY_KEY)
        return raw ? (JSON.parse(raw) as HistoryEntry[]) : []
    } catch {
        return []
    }
}

function saveHistory(entries: HistoryEntry[]): void {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(entries))
}

export const useOverview = create<OverviewStore>((set, get) => ({
    commands: [],
    history: [],
    loaded: false,

    load: async () => {
        const commands = await loadCommands()
        const history = loadHistory()
        set({commands, history, loaded: true})
    },

    addCommand: async (command) => {
        const commands = [...get().commands, command]
        await saveCommands(commands)
        set({commands})
    },

    removeCommand: async (id) => {
        const commands = get().commands.filter(c => c.id !== id)
        await saveCommands(commands)
        set({commands})
    },

    toggleCommand: async (id) => {
        const commands = get().commands.map(c =>
            c.id === id ? {...c, enabled: !c.enabled, updatedAt: Date.now()} : c
        )
        await saveCommands(commands)
        set({commands})
    },

    updateCommand: async (id, patch) => {
        const commands = get().commands.map(c =>
            c.id === id ? ({...c, ...patch, updatedAt: Date.now()} as Command) : c
        )
        await saveCommands(commands)
        set({commands})
    },

    pushHistory: (text) => {
        if (!text.trim()) return Promise.resolve()
        const current = loadHistory()
        if (current[0]?.text === text) return Promise.resolve()
        const entry: HistoryEntry = {
            id: crypto.randomUUID(),
            text,
            timestamp: new Date().toISOString(),
        }
        const next = [entry, ...current].slice(0, MAX_HISTORY)
        saveHistory(next)
        set({history: next})
        return Promise.resolve()
    },

    removeHistory: (id) => {
        const current = loadHistory()
        const next = current.filter(e => e.id !== id)
        saveHistory(next)
        set({history: next})
        return Promise.resolve()
    },
}))
