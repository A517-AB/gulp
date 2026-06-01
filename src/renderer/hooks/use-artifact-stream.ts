import { useState, useEffect, useRef, useCallback } from 'react'
import { sdkIpc } from '@shared/bridge'
import type { JulesLocalGeneratedFile } from '@shared/electron'

const POLL_MS = 3000

export interface ArtifactStream {
  files: JulesLocalGeneratedFile[]
  freshCount: number
  refresh: () => void
}

export function useArtifactStream(sessionId: string | null): ArtifactStream {
  const [files, setFiles] = useState<JulesLocalGeneratedFile[]>([])
  const [freshCount, setFreshCount] = useState(0)
  const baselineRef = useRef<Set<string> | null>(null)

  const fetchFiles = useCallback(async (isInitial: boolean) => {
    if (!sessionId || !sdkIpc) return
    try {
      const result = await sdkIpc.getMarkdownFiles(sessionId)
      const baseline = baselineRef.current
      if (isInitial || baseline === null) {
        baselineRef.current = new Set(result.map(f => f.path))
        setFiles(result)
        setFreshCount(0)
        return
      }
      setFiles(result)
      setFreshCount(result.filter(f => !baseline.has(f.path)).length)
    } catch {
      // session may not have files yet
    }
  }, [sessionId])

  useEffect(() => {
    baselineRef.current = null
    const initial = setTimeout(() => { void fetchFiles(true) }, 0)
    const id = setInterval(() => { void fetchFiles(false) }, POLL_MS)
    return () => { clearTimeout(initial); clearInterval(id) }
  }, [fetchFiles])

  const refresh = useCallback(() => { void fetchFiles(false) }, [fetchFiles])

  return { files, freshCount, refresh }
}
