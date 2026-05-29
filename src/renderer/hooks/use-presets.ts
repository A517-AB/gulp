import { useState, useCallback } from 'react'
import {
  getPresets,
  savePresets,
  createPreset,
  updatePreset,
  deletePreset,
  type Preset,
  type PresetAfter,
} from '@/lib/presets'

export function usePresets() {
  const [presets, setPresets] = useState<Preset[]>(() => getPresets())

  const add = useCallback((p: Omit<Preset, 'id'>) => {
    const preset = createPreset(p)
    const next = [...getPresets(), preset]
    savePresets(next)
    setPresets(next)
    console.log('[presets] added', p.name)
    return preset
  }, [])

  const update = useCallback((updated: Preset) => {
    const next = updatePreset(getPresets(), updated)
    savePresets(next)
    setPresets(next)
    console.log('[presets] updated', updated.name)
  }, [])

  const remove = useCallback((id: string) => {
    const next = deletePreset(getPresets(), id)
    savePresets(next)
    setPresets(next)
    console.log('[presets] removed', id)
  }, [])

  const reorder = useCallback((from: number, to: number) => {
    const next = [...getPresets()]
    const [item] = next.splice(from, 1)
    if (item) next.splice(to, 0, item)
    savePresets(next)
    setPresets(next)
  }, [])

  return { presets, add, update, remove, reorder }
}

export type { Preset, PresetAfter }
