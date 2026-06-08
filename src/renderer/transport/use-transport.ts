import { useContext } from 'react'
import { TransportContext } from './_context'
import type { TransportContextValue } from './_context'

export type { TransportContextValue }

export function useTransport(): TransportContextValue {
  const ctx = useContext(TransportContext)
  if (!ctx) throw new Error('[useTransport] must be used inside <TransportProvider>')
  return ctx
}
