import { createContext, useContext } from 'react'
import type { JulesClient } from './client'

interface JulesContextValue {
  client: JulesClient | null
  apiKey: string | null
  setApiKey: (key: string) => void
  clearApiKey: () => void
}

export const JulesContext = createContext<JulesContextValue>({
  client: null,
  apiKey: null,
  setApiKey: () => {},
  clearApiKey: () => {},
})

export function useJules(): JulesContextValue {
  return useContext(JulesContext)
}
