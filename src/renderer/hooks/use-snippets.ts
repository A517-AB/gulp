import { useState, useEffect, useCallback } from "react"
import { snippets as snippetsApi } from "@/shared/bridge"
import type { Snippet } from "../../types/snippets"

export function useSnippets() {
  const [snippets, setSnippets] = useState<Snippet[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadSnippets() {
      if (!snippetsApi) {
        setLoading(false)
        return
      }
      const data = await snippetsApi.get()
      setSnippets(data)
      setLoading(false)
    }
    void loadSnippets()
  }, [])

  const saveSnippet = useCallback((snippet: Snippet) => {
    setSnippets((prev) => {
      const existing = prev.find(s => s.id === snippet.id)
      const next = existing 
        ? prev.map(s => s.id === snippet.id ? snippet : s)
        : [snippet, ...prev]
      
      if (snippetsApi) {
        snippetsApi.save(next).catch(console.error)
      }
      return next
    })
  }, [])

  const deleteSnippet = useCallback((id: string) => {
    setSnippets((prev) => {
      const next = prev.filter(s => s.id !== id)
      if (snippetsApi) {
        snippetsApi.save(next).catch(console.error)
      }
      return next
    })
  }, [])

  return { snippets, loading, saveSnippet, deleteSnippet }
}
