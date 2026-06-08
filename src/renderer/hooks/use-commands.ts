import { useState, useCallback, useEffect } from 'react'
import { isElectron, aliases as aliasesApi } from '@shared/bridge'
import { normalizeCommand } from '@shared/commands'
import type { Command } from '@shared/commands'

const LS_KEY = 'jules-commands'

export const BUILT_IN_COMMANDS: Command[] = [
  { id: '__settings', trigger: '/', command: 'settings', type: 'local', action: 'settings', label: 'Settings' },
]

export type CommandsStatus = 'ok' | 'file-not-found' | 'loading'

function lsLoad(): Command[] {
  try {
    const raw = localStorage.getItem(LS_KEY)
    return raw ? (JSON.parse(raw) as Record<string, unknown>[]).map(normalizeCommand) : []
  } catch {
    return []
  }
}

export function useCommands() {
  const [userCommands, setUserCommands] = useState<Command[]>([])
  const [status, setStatus] = useState<CommandsStatus>('loading')

  useEffect(() => {
    if (isElectron && aliasesApi) {
      aliasesApi.get().then(({ aliases: data, fileFound }) => {
        setUserCommands((data as unknown as Record<string, unknown>[]).map(normalizeCommand))
        setStatus(fileFound ? 'ok' : 'file-not-found')
      })
    } else {
      setUserCommands(lsLoad())
      setStatus('ok')
    }
  }, [])

  useEffect(() => {
    if (!isElectron || !aliasesApi) return
    return aliasesApi.onChanged((data) => {
      if (data === null) {
        setUserCommands([])
        setStatus('file-not-found')
      } else {
        setUserCommands((data as unknown as Record<string, unknown>[]).map(normalizeCommand))
        setStatus('ok')
      }
    })
  }, [])

  const commit = useCallback((next: Command[]) => {
    setUserCommands(next)
    if (isElectron && aliasesApi) {
      aliasesApi.save(next as never).then(() => {})
    } else {
      localStorage.setItem(LS_KEY, JSON.stringify(next))
    }
  }, [])

  const add    = useCallback((cmd: Omit<Command, 'id'>) =>
    { commit([...userCommands, { ...cmd, id: crypto.randomUUID() }]); }, [userCommands, commit])

  const update = useCallback((updated: Command) =>
    { commit(userCommands.map(c => c.id === updated.id ? updated : c)); }, [userCommands, commit])

  const remove = useCallback((id: string) =>
    { commit(userCommands.filter(c => c.id !== id)); }, [userCommands, commit])

  return {
    commands: [...BUILT_IN_COMMANDS, ...userCommands],
    userCommands,
    status,
    add,
    update,
    remove,
  }
}
