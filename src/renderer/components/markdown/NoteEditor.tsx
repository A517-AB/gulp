import { useCallback, useEffect, useRef, useState } from 'react'
import { isElectron, notes } from '@shared/bridge'
import { MarkdownEditor } from './Editor'
import type { NoteBlock, NotePartialBlock } from './types'

interface NoteEditorProps {
  id: string
  title: string
  className?: string
  onBlocks?: (blocks: NoteBlock[]) => void
}

function lsLoad(id: string): NotePartialBlock[] | undefined {
  try {
    const raw = localStorage.getItem(`note:${id}`)
    if (!raw) return undefined
    return JSON.parse(raw) as NotePartialBlock[]
  } catch {
    return undefined
  }
}

export function NoteEditor({ id, title, className, onBlocks }: NoteEditorProps) {
  const [content, setContent] = useState<NotePartialBlock[] | undefined>(() => {
    if (!isElectron) return lsLoad(id)
    return undefined
  })
  const [ready, setReady] = useState(!isElectron)
  const [contentVersion, setContentVersion] = useState(0)
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    const ipc = notes
    if (isElectron && ipc) {
      void ipc.get(id).then((raw) => {
        setContent(raw ?? undefined)
        setReady(true)
        setContentVersion((v) => v + 1)
      })

      return ipc.onChanged(() => {
        void ipc.get(id).then((raw) => {
          setContent(raw ?? undefined)
          setContentVersion((v) => v + 1)
        })
      })
    }
    return undefined
  }, [id])

  const handleChange = useCallback((blocks: NoteBlock[]) => {
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => {
      const ipc = notes
      if (isElectron && ipc) {
        void ipc.save(id, title, blocks)
      } else {
        localStorage.setItem(`note:${id}`, JSON.stringify(blocks))
      }
      onBlocks?.(blocks)
    }, 500)
  }, [id, title, onBlocks])

  if (!ready) return null

  return (
    <div className={className}>
      <MarkdownEditor
        key={`${id}-${contentVersion}`}
        {...(content !== undefined ? { initialContent: content } : {})}
        onChange={handleChange}
      />
    </div>
  )
}
