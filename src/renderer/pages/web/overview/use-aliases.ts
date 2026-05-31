import { useState, useCallback } from 'react'
import type { JulesAlias } from './types'

const KEY = 'jules-aliases'

function load(): JulesAlias[] {
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? (JSON.parse(raw) as JulesAlias[]) : []
  } catch {
    return []
  }
}

function persist(aliases: JulesAlias[]): void {
  localStorage.setItem(KEY, JSON.stringify(aliases))
}

export function useAliases() {
  const [aliases, setAliases] = useState<JulesAlias[]>(load)

  const add = useCallback((alias: Omit<JulesAlias, 'id'>) => {
    const next = [...load(), { ...alias, id: crypto.randomUUID() }]
    persist(next)
    setAliases(next)
  }, [])

  const update = useCallback((updated: JulesAlias) => {
    const next = load().map(a => a.id === updated.id ? updated : a)
    persist(next)
    setAliases(next)
  }, [])

  const remove = useCallback((id: string) => {
    const next = load().filter(a => a.id !== id)
    persist(next)
    setAliases(next)
  }, [])

  return { aliases, add, update, remove }
}
