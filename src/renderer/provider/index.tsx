import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { api, SERVER_URL } from '@api'
import type { JulesApi } from '@api'
import type { SdkIpc } from '@/types/electron'
import { sdkIpc } from '@/shared/bridge'

interface JulesContextValue {
  api:       JulesApi
  sdkIpc:    SdkIpc | null
  connected: boolean
  isLoading: boolean
  refresh:   () => void
}

const JulesContext = createContext<JulesContextValue | undefined>(undefined)

export function JulesProvider({ children }: { children: ReactNode }) {
  const [connected,  setConnected]  = useState(false)
  const [isLoading,  setIsLoading]  = useState(true)
  const [tick, setTick] = useState(0)

  useEffect(() => {
    let cancelled = false
    fetch(`${SERVER_URL}/connected`)
      .then(r => r.json() as Promise<{ connected?: boolean }>)
      .then(data => { if (!cancelled) { setConnected(!!data.connected); setIsLoading(false) } })
      .catch(() => { if (!cancelled) setIsLoading(false) })
    return () => { cancelled = true }
  }, [tick])

  const value = useMemo<JulesContextValue>(
    () => ({ api, sdkIpc, connected, isLoading, refresh: () => { setTick(t => t + 1) } }),
    [connected, isLoading],
  )

  return <JulesContext.Provider value={value}>{children}</JulesContext.Provider>
}

export function useJules(): JulesContextValue {
  const context = useContext(JulesContext)
  if (!context) throw new Error('useJules must be used within a JulesProvider')
  return context
}
