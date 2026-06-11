import { useState, useEffect, useCallback, useRef } from 'react'
import {snippets as snippetsApi} from '@shared/bridge'
import type { FuseManifestItem } from '@shared/fuse'
import {fuseFilePath} from '@shared/fuse'

export type { FuseManifestItem as SnippetItem } from '@shared/fuse'

export function useSnippets() {
  const [items, setItems] = useState<FuseManifestItem[]>([])
  const saving = useRef(false)
    const itemsRef = useRef<FuseManifestItem[]>([])

    useEffect(() => {
        itemsRef.current = items
    }, [items])

  useEffect(() => {
      const api = snippetsApi
      if (!api) return
      void api.get().then(m => {
          setItems(m.items)
      })
      return api.onChanged(() => {
      if (saving.current) return
          void api.get().then(m => {
              setItems(m.items)
          })
    })
  }, [])

  const saveItem = useCallback(async (item: FuseManifestItem, code: string) => {
    const api = snippetsApi
      if (!api) return
    saving.current = true
    try {
        const existing = itemsRef.current.find(i => i.id === item.id)
        if (existing && existing.file !== item.file) {
            await api.deleteCode(existing.file)
        }
        await api.writeCode(item.file, code)

        const preview = code.slice(0, 100).trim().replace(/\s+/g, ' ')
        const itemWithPreview: FuseManifestItem = {...item, preview}

      setItems(prev => {
        const next = prev.find(i => i.id === item.id)
            ? prev.map(i => i.id === item.id ? itemWithPreview : i)
            : [itemWithPreview, ...prev]
        void api.save({ version: 1, items: next })
        return next
      })
    } finally {
      setTimeout(() => { saving.current = false }, 500)
    }
  }, [])

    const updateMeta = useCallback(async (item: FuseManifestItem, updates: {
        title?: string | null;
        languageId?: string
    }) => {
    const api = snippetsApi
    if (!api) return

        const nextTitle = updates.title !== undefined ? updates.title : item.title
        const nextLang = updates.languageId !== undefined ? updates.languageId : item.languageId
        const newFile = fuseFilePath(item.type, nextLang, nextTitle ?? 'untitled')

        const updatedItem: FuseManifestItem = {
            ...item,
            title: nextTitle,
            languageId: nextLang,
            file: newFile,
            updatedAt: new Date().toISOString(),
        }

        if (newFile !== item.file) {
            try {
                const content = await api.readCode(item.file)
                await api.writeCode(newFile, content)
                await api.deleteCode(item.file)
            } catch (err) {
                console.error('Failed to move snippet file on disk:', err)
                return
            }
        }

    setItems(prev => {
        const next = prev.map(i => i.id === item.id ? updatedItem : i)
      void api.save({ version: 1, items: next })
      return next
    })
  }, [])

  const deleteItem = useCallback(async (id: string) => {
    const api = snippetsApi
    if (!api) return
      const item = itemsRef.current.find(i => i.id === id)
      if (item) await api.deleteCode(item.file)
    setItems(prev => {
      const next = prev.filter(i => i.id !== id)
      void api.save({ version: 1, items: next })
      return next
    })
  }, [])

  const readCode = useCallback(async (item: FuseManifestItem): Promise<string> => {
      if (!snippetsApi) return ''
      return snippetsApi.readCode(item.file)
  }, [])

    return {items, saveItem, updateMeta, deleteItem, readCode}
}
