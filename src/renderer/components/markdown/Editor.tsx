import { useEffect } from 'react'
import { useCreateBlockNote } from '@blocknote/react'
import { BlockNoteView } from '@blocknote/mantine'
import type { BlockNoteEditor, BlockSchema, InlineContentSchema, StyleSchema } from '@blocknote/core'
import { cn } from '@/utils'
import '@blocknote/mantine/style.css'
import type { NoteBlock, MarkdownEditorProps } from './types'

// BlockNoteView's generic constraint requires BlockSchema (the index type), but
// _DefaultBlockSchema has optional props that don't satisfy PropSchema under
// exactOptionalPropertyTypes. Cast to the constraint type at the JSX boundary only.
type CompatEditor = BlockNoteEditor<BlockSchema, InlineContentSchema, StyleSchema>

export function MarkdownEditor({ initialContent, readOnly, className, onChange }: MarkdownEditorProps) {
  const editor = useCreateBlockNote(initialContent ? { initialContent } : {})

  useEffect(() => {
    if (!onChange) return
    return editor.onChange(() => {
      onChange(editor.document as NoteBlock[])
    })
  }, [editor, onChange])

  return (
    <div className={cn('w-full h-full', className)}>
      <BlockNoteView
        editor={editor as unknown as CompatEditor}
        editable={!readOnly}
        theme="light"
      />
    </div>
  )
}
