import {useCallback, useState} from 'react'
import {
    createPreset,
    deletePreset,
    getPresets,
    type Preset,
    type PresetAfter,
    savePresets,
    updatePreset,
} from '@/lib/presets'

//not used yet, i'm tinking at some4 point to find the codeeeciew button in rennder see how ti works attach it source viewer and this and be able ti stick it in different shit via buttons either repoless or jues autmatated
export function usePresets() {
  const [presets, setPresets] = useState<Preset[]>(() => getPresets())
//i'll use it one day, but actually fix it up
  const add = useCallback((p: Omit<Preset, 'id'>) => {
    const next = [...getPresets(), createPreset(p)]
    savePresets(next)
    setPresets(next)
    console.log('[presets] added', p.name)
    return next[next.length - 1]!
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
