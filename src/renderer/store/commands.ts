import { create } from 'zustand'
import type { Command } from '@shared/commands'
import { filesystem } from '@shared/bridge'

const FILE = 'D:\\LAST\\commands.json'
const KEY  = 'last:commands'

async function loadFromFile(): Promise<Command[]> {
  if (!filesystem) { console.warn('[commands] no filesystem IPC'); return [] }
  try {
    const raw = await filesystem.readFile(FILE)
    const commands = JSON.parse(raw) as Command[]
    console.log('[commands] loaded', commands.length, 'commands from', FILE)
    return commands
  } catch (err) {
    console.error('[commands] failed to load', FILE, err)
    return []
  }
}

async function persistToFile(commands: Command[]): Promise<void> {
  if (!filesystem) {
    localStorage.setItem(KEY, JSON.stringify(commands))
    return
  }
  await filesystem.writeFile(FILE, JSON.stringify(commands, null, 2))
}

interface CommandsStore {
  commands: Command[]
  loaded:   boolean
  load:     () => Promise<void>
  add:      (command: Command) => Promise<void>
  remove:   (id: string) => Promise<void>
  toggle:   (id: string) => Promise<void>
  update:   (id: string, patch: Partial<Omit<Command, 'id' | 'trigger'>>) => Promise<void>
}

export const useCommands = create<CommandsStore>((set, get) => ({
  commands: [],
  loaded:   false,

  load: async () => {
    const commands = await loadFromFile()
    set({ commands, loaded: true })
  },

  add: async (command) => {
    const commands = [...get().commands, command]
    await persistToFile(commands)
    set({ commands })
  },

  remove: async (id) => {
    const commands = get().commands.filter(c => c.id !== id)
    await persistToFile(commands)
    set({ commands })
  },

  toggle: async (id) => {
    const commands = get().commands.map(c =>
      c.id === id ? { ...c, enabled: !c.enabled, updatedAt: Date.now() } : c
    )
    await persistToFile(commands)
    set({ commands })
  },

  update: async (id, patch) => {
    const commands = get().commands.map(c =>
      c.id === id ? { ...c, ...patch, updatedAt: Date.now() } : c
    )
    await persistToFile(commands)
    set({ commands })
  },
}))
