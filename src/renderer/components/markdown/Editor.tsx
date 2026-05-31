import { useEffect } from 'react'
import { useCreateBlockNote } from '@blocknote/react'
import { BlockNoteView } from '@blocknote/mantine'
import { cn } from '@/utils'
import '@blocknote/mantine/style.css'
import type { MarkdownEditorProps } from './types'

export function MarkdownEditor({ initialContent, readOnly, className }: MarkdownEditorProps) {
  const editor = useCreateBlockNote()

  useEffect(() => {
    if (initialContent) {
      const blocks = editor.tryParseMarkdownToBlocks(initialContent)
      editor.replaceBlocks(editor.document, blocks)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className={cn('w-full h-full', className)}>
      <BlockNoteView
        editor={editor as never}
        editable={!readOnly}
        theme="light"
      />
    </div>
  )
}
