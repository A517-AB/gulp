import { useState, useEffect, type ReactNode } from 'react'
import { getTransport, setTransport, transportMonitor } from './index'
import { TransportContext } from './_context'
import type { Transport, TransportMonitorEvent } from './types'

export function TransportProvider({ children }: { children: ReactNode }) {
  const [transport, setLocal] = useState<Transport>(getTransport)
  const [lastEvent, setLastEvent] = useState<TransportMonitorEvent | null>(null)

  useEffect(() => {
    const t = getTransport()
    console.log(`[TransportProvider] mounted — mode: ${t.mode}, transport: ${t.constructor.name}`)
    return () => {
      console.log('[TransportProvider] unmounted')
    }
  }, [])

  useEffect(() => {
    const handler = (event: TransportMonitorEvent) => { setLastEvent(event) }
    transportMonitor.on('activity', handler)
    return () => { transportMonitor.off('activity', handler) }
  }, [])

  function switchTransport(next: Transport): void {
    console.log(`[TransportProvider] switching ${transport.mode} → ${next.mode}`)
    setTransport(next)
    setLocal(next)
    console.log(`[TransportProvider] active: ${next.constructor.name}`)
  }

  return (
    <TransportContext value={{ transport, mode: transport.mode, lastEvent, switchTransport }}>
      {children}
    </TransportContext>
  )
}
