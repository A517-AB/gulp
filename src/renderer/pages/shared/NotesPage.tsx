import { useCallback, useEffect, useRef, useState } from 'react'
import { isElectron, notes } from '@shared/bridge'
import { MarkdownEditor } from '@/components/markdown/Editor'
import type { NoteBlock, NotePartialBlock } from '@/components/markdown/types'

const NOTE_ID = 'default'
const LS_KEY = `note:${NOTE_ID}`

function lsLoad(): NotePartialBlock[] | undefined {
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (!raw) return undefined
    return JSON.parse(raw) as NotePartialBlock[]
  } catch {
    return undefined
  }
}

export default function NotesPage() {
  const [content, setContent] = useState<NotePartialBlock[] | undefined>(undefined)
  const [ready, setReady] = useState(false)
  const [contentVersion, setContentVersion] = useState(0)
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    const ipc = notes
    if (isElectron && ipc) {
      ipc.get(NOTE_ID).then((raw) => {
        setContent(raw ? (raw) : undefined)
        setReady(true)
      })
      return ipc.onChanged(() => {
        ipc.get(NOTE_ID).then((raw) => {
          setContent(raw ? (raw) : undefined)
          setContentVersion((v) => v + 1)
        })
      })
    }
    setContent(lsLoad())
    setReady(true)
    return undefined
  }, [])

  const handleChange = useCallback((blocks: NoteBlock[]) => {
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => {
      const ipc = notes
      if (isElectron && ipc) {
        ipc.save(NOTE_ID, 'Notes', blocks)
      } else {
        localStorage.setItem(LS_KEY, JSON.stringify(blocks))
      }
    }, 500)
  }, [])

  if (!ready) return null

  return (
    <div className="w-full h-full">
      <MarkdownEditor
        key={contentVersion}
        {...(content !== undefined ? { initialContent: content } : {})}
        onChange={handleChange}
      />
    </div>
  )
}
