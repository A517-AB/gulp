import { useState, useCallback } from 'react'

export interface GeneratedFile {
  path: string
  content: string
}

export interface ArtifactStream {
  files: GeneratedFile[]
  freshCount: number
  refresh: () => void
}

export function useArtifactStream(_sessionId: string | null): ArtifactStream {
  const [files] = useState<GeneratedFile[]>([])
  const refresh = useCallback(() => { /* no-op until fetch transport is wired */ }, [])
  return { files, freshCount: 0, refresh }
}
