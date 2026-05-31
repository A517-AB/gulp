import { useState, useEffect, useRef } from 'react'
import { sdkIpc } from '@shared/bridge'
import type { JulesLocalGeneratedFile } from '@shared/electron'

const POLL_MS = 3000

export function useArtifactStream(sessionId: string | null) {
  const [files, setFiles] = useState<JulesLocalGeneratedFile[]>([])
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    if (!sessionId || !sdkIpc) {
      setFiles([])
      return
    }

    const fetch = async () => {
      try {
        const result = await sdkIpc!.getMarkdownFiles(sessionId)
        if (result.length > 0) setFiles(result)
      } catch {
        // session may not have files yet
      }
    }

    void fetch()
    intervalRef.current = setInterval(() => { void fetch() }, POLL_MS)

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [sessionId])

  return files
}
