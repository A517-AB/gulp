import { useCallback, useEffect, useState } from 'react'
import { alarms as alarmsIpc } from '@shared/bridge'
import type { AlarmEntry } from '@shared/hub'

export function useAlarms() {
  const [items, setItems] = useState<AlarmEntry[]>([])

  const load = useCallback(async () => {
    if (!alarmsIpc) return
    const list = await alarmsIpc.list()
    setItems(list.sort((a, b) => a.hour * 60 + a.minute - (b.hour * 60 + b.minute)))
  }, [])

  useEffect(() => {
    void load()
    if (!alarmsIpc) return
    return alarmsIpc.onChanged(() => { void load() })
  }, [load])

  const save   = async (alarm: AlarmEntry)              => { await alarmsIpc?.save(alarm);          void load() }
  const remove = async (id: string)                     => { await alarmsIpc?.delete(id);            void load() }
  const toggle = async (id: string, enabled: boolean)   => { await alarmsIpc?.toggle(id, enabled);   void load() }

  return { items, save, remove, toggle }
}
