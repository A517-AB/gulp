import { useState, useEffect, useCallback, useRef } from 'react'
import { snippets as snippetsApi, filesystem } from '@shared/bridge'
import { fuseResolve } from '@shared/fuse'
import type { FuseManifestItem } from '@shared/fuse'

export type { FuseManifestItem as SnippetItem } from '@shared/fuse'

export function useSnippets() {
  const [items, setItems] = useState<FuseManifestItem[]>([])
  const [loading, setLoading] = useState(true)
  const saving = useRef(false)

  const load = useCallback(async () => {
    if (!snippetsApi) { setLoading(false); return }
    const manifest = await snippetsApi.get()
    setItems(manifest.items)
    setLoading(false)
  }, [])

  useEffect(() => { void load() }, [load])

  useEffect(() => {
    return snippetsApi?.onChanged(() => {
      if (saving.current) return
      void load()
    })
  }, [load])

  const saveItem = useCallback(async (item: FuseManifestItem, code: string) => {
    const api = snippetsApi
    const fs = filesystem
    if (!api || !fs) return
    saving.current = true
    try {
      await fs.writeFile(fuseResolve(item.file), code)
      setItems(prev => {
        const next = prev.find(i => i.id === item.id)
          ? prev.map(i => i.id === item.id ? item : i)
          : [item, ...prev]
        void api.save({ version: 1, items: next })
        return next
      })
    } finally {
      setTimeout(() => { saving.current = false }, 500)
    }
  }, [])

  const updateMeta = useCallback((item: FuseManifestItem) => {
    const api = snippetsApi
    if (!api) return
    setItems(prev => {
      const next = prev.map(i => i.id === item.id ? item : i)
      void api.save({ version: 1, items: next })
      return next
    })
  }, [])

  const deleteItem = useCallback(async (id: string) => {
    const api = snippetsApi
    const fs = filesystem
    if (!api) return
    const item = items.find(i => i.id === id)
    if (item && fs) await fs.deleteFile(fuseResolve(item.file))
    setItems(prev => {
      const next = prev.filter(i => i.id !== id)
      void api.save({ version: 1, items: next })
      return next
    })
  }, [items])

  const readCode = useCallback(async (item: FuseManifestItem): Promise<string> => {
    if (!filesystem) return ''
    return filesystem.readFile(fuseResolve(item.file))
  }, [])

  return { items, loading, saveItem, updateMeta, deleteItem, readCode }
}
