import {
  startTransition,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import type {
  JulesLocalActivity,
  JulesLocalFileFilter,
  JulesLocalGeneratedFile,
  JulesLocalSessionInfo,
} from '@shared/electron'
import { localJules, toMarkdownFiles } from '@/lib/jules/local'

export interface UseJulesLocalSessionOptions {
  autoStart?: boolean
}

export interface UseJulesLocalSessionResult {
  session: JulesLocalSessionInfo | null
  activities: JulesLocalActivity[]
  generatedFiles: JulesLocalGeneratedFile[]
  markdownFiles: JulesLocalGeneratedFile[]
  loadingSession: boolean
  loadingFiles: boolean
  streaming: boolean
  error: string | null
  refreshSession: () => Promise<void>
  refreshActivities: () => Promise<void>
  hydrateSession: () => Promise<number>
  loadFiles: (filter?: JulesLocalFileFilter) => Promise<JulesLocalGeneratedFile[]>
  loadMarkdownFiles: () => Promise<JulesLocalGeneratedFile[]>
  approve: () => Promise<void>
  sendMessage: (prompt: string) => Promise<void>
  ask: (prompt: string) => Promise<JulesLocalActivity>
  clearActivities: () => void
  startStream: () => Promise<void>
  stopStream: () => Promise<void>
}

function mergeActivities(
  current: JulesLocalActivity[],
  incoming: JulesLocalActivity,
): JulesLocalActivity[] {
  if (current.some((activity) => activity.id === incoming.id)) {
    return current
  }

  return [...current, incoming].sort((left, right) =>
    left.createTime.localeCompare(right.createTime),
  )
}

/**
 * Small hook for local Electron-driven Jules sessions.
 *
 * It keeps the streaming mechanics and file extraction logic out of components,
 * while following the modjules session mental model: session -> stream -> ask/approve -> files.
 *
 * @see https://github.com/davideast/modjules/blob/main/docs/interactive-sessions.md
 * @see https://github.com/davideast/modjules/blob/main/docs/artifacts.md
 */
export function useJulesLocalSession(
  sessionId: string | null,
  options: UseJulesLocalSessionOptions = {},
): UseJulesLocalSessionResult {
  const { autoStart = true } = options
  const [session, setSession] = useState<JulesLocalSessionInfo | null>(null)
  const [activities, setActivities] = useState<JulesLocalActivity[]>([])
  const [generatedFiles, setGeneratedFiles] = useState<JulesLocalGeneratedFile[]>([])
  const [loadingSession, setLoadingSession] = useState(false)
  const [loadingFiles, setLoadingFiles] = useState(false)
  const [streaming, setStreaming] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const sessionIdRef = useRef(sessionId)

  useEffect(() => {
    sessionIdRef.current = sessionId
  }, [sessionId])

  const refreshSession = useCallback(async () => {
    if (!sessionId) {
      setSession(null)
      return
    }

    try {
      setLoadingSession(true)
      setError(null)
      setSession(await localJules.getSession(sessionId))
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Failed to load Jules session')
    } finally {
      setLoadingSession(false)
    }
  }, [sessionId])

  const refreshActivities = useCallback(async () => {
    if (!sessionId) {
      setActivities([])
      return
    }

    try {
      setError(null)
      setActivities(await localJules.getHistory(sessionId))
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Failed to load Jules activity history')
    }
  }, [sessionId])

  const hydrateSession = useCallback(async () => {
    if (!sessionId) {
      return 0
    }

    try {
      setError(null)
      const synced = await localJules.hydrateSession(sessionId)
      await refreshActivities()
      return synced
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Failed to hydrate Jules session history')
      return 0
    }
  }, [refreshActivities, sessionId])

  const loadFiles = useCallback(
    async (filter?: JulesLocalFileFilter) => {
      if (!sessionId) {
        setGeneratedFiles([])
        return []
      }

      try {
        setLoadingFiles(true)
        setError(null)
        const files = await localJules.getGeneratedFiles(sessionId, filter)
        setGeneratedFiles(files)
        return files
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : 'Failed to load Jules files')
        return []
      } finally {
        setLoadingFiles(false)
      }
    },
    [sessionId],
  )

  const loadMarkdownFiles = useCallback(async () => {
    if (!sessionId) {
      setGeneratedFiles([])
      return []
    }

    try {
      setLoadingFiles(true)
      setError(null)
      const files = await localJules.getMarkdownFiles(sessionId)
      setGeneratedFiles(files)
      return files
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Failed to load markdown files')
      return []
    } finally {
      setLoadingFiles(false)
    }
  }, [sessionId])

  const startStream = useCallback(async () => {
    if (!sessionId) {
      return
    }

    setError(null)
    setStreaming(true)
    try {
      await localJules.startStream(sessionId)
    } catch (cause) {
      setStreaming(false)
      setError(cause instanceof Error ? cause.message : 'Failed to start Jules stream')
    }
  }, [sessionId])

  const stopStream = useCallback(async () => {
    if (!sessionId) {
      return
    }

    await localJules.stopStream(sessionId)
    setStreaming(false)
  }, [sessionId])

  const approve = useCallback(async () => {
    if (!sessionId) {
      throw new Error('A Jules session is required to approve a plan.')
    }

    setError(null)
    await localJules.approve(sessionId)
    await refreshSession()
  }, [refreshSession, sessionId])

  const sendMessage = useCallback(async (prompt: string) => {
    if (!sessionId) {
      throw new Error('A Jules session is required to send a message.')
    }

    setError(null)
    await localJules.sendMessage(sessionId, prompt)
  }, [sessionId])

  const ask = useCallback(async (prompt: string) => {
    if (!sessionId) {
      throw new Error('A Jules session is required to ask a question.')
    }

    setError(null)
    const reply = await localJules.ask(sessionId, prompt)
    startTransition(() => {
      setActivities((current) => mergeActivities(current, reply))
    })
    return reply
  }, [sessionId])

  const clearActivities = useCallback(() => {
    setActivities([])
  }, [])

  useEffect(() => {
    if (!sessionId) {
      setSession(null)
      setActivities([])
      setGeneratedFiles([])
      setStreaming(false)
      return
    }

    let cancelled = false

    void (async () => {
      await Promise.all([refreshSession(), refreshActivities()])
      if (!cancelled && autoStart) {
        await startStream()
      }
    })()

    return () => {
      cancelled = true
    }
  }, [autoStart, refreshActivities, refreshSession, sessionId, startStream])

  useEffect(() => {
    if (!sessionId) {
      return
    }

    const disposeActivity = localJules.onActivity((payload) => {
      if (payload.sessionId !== sessionIdRef.current) {
        return
      }

      startTransition(() => {
        setActivities((current) => mergeActivities(current, payload.activity))
      })
    })

    const disposeState = localJules.onStreamState((payload) => {
      if (payload.sessionId !== sessionIdRef.current) {
        return
      }

      if (payload.info) {
        setSession(payload.info)
      }

      if (payload.state === 'started') {
        setStreaming(true)
        return
      }

      setStreaming(false)
      if (payload.error) {
        setError(payload.error)
      }

      if (payload.state === 'completed' || payload.state === 'failed') {
        void refreshActivities()
      }

      if (payload.state === 'completed') {
        void loadFiles()
      }
    })

    return () => {
      disposeActivity()
      disposeState()
      void localJules.stopStream(sessionId)
    }
  }, [loadFiles, sessionId])

  const markdownFiles = useMemo(
    () => toMarkdownFiles(generatedFiles),
    [generatedFiles],
  )

  return {
    session,
    activities,
    generatedFiles,
    markdownFiles,
    loadingSession,
    loadingFiles,
    streaming,
    error,
    refreshSession,
    refreshActivities,
    hydrateSession,
    loadFiles,
    loadMarkdownFiles,
    approve,
    sendMessage,
    ask,
    clearActivities,
    startStream,
    stopStream,
  }
}