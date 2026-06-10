import {useEffect} from 'react'
import {useCreateBlockNote} from '@blocknote/react'
import {BlockNoteView, darkDefaultTheme, lightDefaultTheme} from '@blocknote/mantine'
import type {BlockNoteEditor, BlockSchema, InlineContentSchema, StyleSchema} from '@blocknote/core'
import {cn} from '@/utils'
import '@blocknote/mantine/style.css'
import {useTheme} from '@renderer/providers/theme'
import type {MarkdownEditorProps} from './types'

type CompatEditor = BlockNoteEditor<BlockSchema, InlineContentSchema, StyleSchema>

const transparentLight = { ...lightDefaultTheme, colors: { ...lightDefaultTheme.colors, editor: { ...lightDefaultTheme.colors.editor, background: 'transparent' } } }
const transparentDark  = { ...darkDefaultTheme,  colors: { ...darkDefaultTheme.colors,  editor: { ...darkDefaultTheme.colors.editor,  background: 'transparent' } } }

export function MarkdownEditor({ initialContent, readOnly, className, onChange }: MarkdownEditorProps) {
  const { theme } = useTheme()
  const editor = useCreateBlockNote(initialContent ? { initialContent } : {})

  useEffect(() => {
    if (!onChange) return
    return editor.onChange(() => {
      onChange(editor.document)
    })
  }, [editor, onChange])

  return (
    <div className={cn('w-full h-full', className)}>
      <BlockNoteView
        editor={editor as unknown as CompatEditor}
        editable={!readOnly}
        theme={theme === 'dark' ? transparentDark : transparentLight}
      />
    </div>
  )
}
