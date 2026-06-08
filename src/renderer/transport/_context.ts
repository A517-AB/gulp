import { createContext } from 'react'
import type { Transport, TransportMonitorEvent } from './types'

export interface TransportContextValue {
  transport: Transport
  mode: Transport['mode']
  lastEvent: TransportMonitorEvent | null
  switchTransport: (t: Transport) => void
}

export const TransportContext = createContext<TransportContextValue | null>(null)
