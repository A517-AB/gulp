import { useCallback, useEffect, useState } from 'react'
import { reminders as remindersIpc } from '@shared/bridge'
import type { ReminderEntry } from '@shared/hub'

export function useReminders() {
  const [items, setItems] = useState<ReminderEntry[]>([])

  const load = useCallback(async () => {
    if (!remindersIpc) return
    const list = await remindersIpc.list()
    setItems(list)
  }, [])

  useEffect(() => {
    void load()
    if (!remindersIpc) return
    return remindersIpc.onChanged(() => { void load() })
  }, [load])

  const save   = async (r: ReminderEntry)              => { await remindersIpc?.save(r);          void load() }
  const remove = async (id: string)                    => { await remindersIpc?.delete(id);         void load() }
  const toggle = async (id: string, enabled: boolean)  => { await remindersIpc?.toggle(id, enabled); void load() }
  const done   = async (id: string)                    => { await remindersIpc?.done(id);           void load() }

  return { items, save, remove, toggle, done }
}
