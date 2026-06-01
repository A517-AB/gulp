import { useState, useCallback, useEffect } from 'react'
import { isElectron, aliases as aliasesApi } from '@shared/bridge'
import type { JulesAlias } from '@shared/aliases'

const LS_KEY = 'jules-aliases'

function lsLoad(): JulesAlias[] {
  try {
    const raw = localStorage.getItem(LS_KEY)
    return raw ? (JSON.parse(raw) as JulesAlias[]) : []
  } catch {
    return []
  }
}

export type AliasesStatus = 'ok' | 'file-not-found' | 'loading'

export function useAliases() {
  const [aliases, setAliases] = useState<JulesAlias[]>([])
  const [status, setStatus] = useState<AliasesStatus>('loading')

  useEffect(() => {
    if (isElectron && aliasesApi) {
      aliasesApi.get().then(({ aliases: data, fileFound }) => {
        setAliases(data)
        setStatus(fileFound ? 'ok' : 'file-not-found')
      })
    } else {
      setAliases(lsLoad())
      setStatus('ok')
    }
  }, [])

  useEffect(() => {
    if (!isElectron || !aliasesApi) return
    return aliasesApi.onChanged((data) => {
      if (data === null) {
        setAliases([])
        setStatus('file-not-found')
      } else {
        setAliases(data)
        setStatus('ok')
      }
    })
  }, [])

  const commit = useCallback((next: JulesAlias[]) => {
    setAliases(next)
    if (isElectron && aliasesApi) {
      aliasesApi.save(next).then(() => {})
    } else {
      localStorage.setItem(LS_KEY, JSON.stringify(next))
    }
  }, [])

  const add    = useCallback((alias: Omit<JulesAlias, 'id'>) =>
    commit([...aliases, { ...alias, id: crypto.randomUUID() }]), [aliases, commit])

  const update = useCallback((updated: JulesAlias) =>
    commit(aliases.map(a => a.id === updated.id ? updated : a)), [aliases, commit])

  const remove = useCallback((id: string) =>
    commit(aliases.filter(a => a.id !== id)), [aliases, commit])

  return { aliases, status, add, update, remove }
}
