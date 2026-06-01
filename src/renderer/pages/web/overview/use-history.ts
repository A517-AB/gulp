import { useState, useCallback, useEffect } from 'react'
import { isElectron, history as historyApi } from '@shared/bridge'
import type { HistoryEntry } from '@shared/history'

const LS_KEY = 'jules-history'
const MAX = 200

function lsLoad(): HistoryEntry[] {
  try {
    const raw = localStorage.getItem(LS_KEY)
    return raw ? (JSON.parse(raw) as HistoryEntry[]) : []
  } catch {
    return []
  }
}

function lsSave(entries: HistoryEntry[]): void {
  localStorage.setItem(LS_KEY, JSON.stringify(entries))
}

export function useHistory() {
  const [entries, setEntries] = useState<HistoryEntry[]>(() => isElectron ? [] : lsLoad())

  useEffect(() => {
    if (!isElectron || !historyApi) return
    void historyApi.get().then(setEntries)
  }, [])

  const push = useCallback(async (text: string) => {
    if (!text.trim()) return
    if (isElectron && historyApi) {
      const next = await historyApi.push(text)
      setEntries(next)
    } else {
      const entries = lsLoad()
      if (entries[0]?.text === text) return
      const next = [{ id: crypto.randomUUID(), text, timestamp: new Date().toISOString() }, ...entries].slice(0, MAX)
      lsSave(next)
      setEntries(next)
    }
  }, [])

  const remove = useCallback(async (id: string) => {
    if (isElectron && historyApi) {
      const next = await historyApi.remove(id)
      setEntries(next)
    } else {
      const next = lsLoad().filter(e => e.id !== id)
      lsSave(next)
      setEntries(next)
    }
  }, [])

  return { entries, push, remove }
}
