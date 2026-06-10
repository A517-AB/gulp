import { useState, useCallback, useEffect, useRef } from 'react'
import { sdkIpc } from '@shared/bridge'
import { activityText } from '@/utils/activity'

export interface GeneratedFile {
  path: string
  content: string
}

export interface ArtifactStream {
  files: GeneratedFile[]
  freshCount: number
  loading: boolean
  refresh: () => void
}

export function useArtifactStream(sessionId: string | null): ArtifactStream {
  const [files, setFiles] = useState<GeneratedFile[]>([])
  const [freshCount, setFreshCount] = useState(0)
  const [loading, setLoading] = useState(false)
  const fetchingRef = useRef(false)

  // Reset when session changes — batched inside startTransition to avoid cascading render warning
  useEffect(() => {
    void Promise.resolve().then(() => {
      setFiles([])
      setFreshCount(0)
      fetchingRef.current = false
    })
  }, [sessionId])

  const refresh = useCallback(() => {
    if (!sessionId || !sdkIpc || fetchingRef.current) return
    fetchingRef.current = true
    setLoading(true)
    console.log('[artifact-stream] fetching activities for session:', sessionId)

    sdkIpc.activities.list(sessionId, { pageSize: 100 })
      .then(({ activities }) => {
        console.log('[artifact-stream]', activities.length, 'activities received')
        const blocks = activities
          .filter(a =>
            a.type === 'agentMessaged' ||
            a.type === 'sessionCompleted' ||
            a.type === 'planGenerated' ||
            a.type === 'progressUpdated'
          )
          .map(a => activityText(a))
          .filter(Boolean)

        if (blocks.length === 0) {
          console.log('[artifact-stream] no displayable content in activities')
          return
        }

        const content = blocks.join('\n\n---\n\n')
        setFiles([{ path: 'session.md', content }])
        setFreshCount(c => c + 1)
        console.log('[artifact-stream] set', blocks.length, 'blocks →', content.length, 'chars')
      })
      .catch((e: unknown) => {
        console.error('[artifact-stream] list failed:', e)
      })
      .finally(() => {
        setLoading(false)
        fetchingRef.current = false
      })
  }, [sessionId])

  return { files, freshCount, loading, refresh }
}
