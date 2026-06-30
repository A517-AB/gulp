import {useEffect} from 'react'
import {useCreateBlockNote} from '@blocknote/react'
import {BlockNoteView, darkDefaultTheme, lightDefaultTheme} from '@blocknote/mantine'
import type {BlockNoteEditor, BlockSchema, InlineContentSchema, StyleSchema} from '@blocknote/core'
import {useTheme} from '@renderer/providers/theme'
import {cn} from '@/utils'

type AnyEditor = BlockNoteEditor<BlockSchema, InlineContentSchema, StyleSchema>

const transparentLight = { ...lightDefaultTheme, colors: { ...lightDefaultTheme.colors, editor: { ...lightDefaultTheme.colors.editor, background: 'transparent' } } }
const transparentDark  = { ...darkDefaultTheme,  colors: { ...darkDefaultTheme.colors,  editor: { ...darkDefaultTheme.colors.editor,  background: 'transparent' } } }

interface Props {
  content:    string
  className?: string
}

export function BlockDisplay({ content, className }: Props) {
  const { theme } = useTheme()
  const editor = useCreateBlockNote()

  useEffect(() => {
    const blocks = editor.tryParseMarkdownToBlocks(content)
    editor.replaceBlocks(editor.document, blocks)
  }, [editor, content])

  return (
    <div className={cn('w-full', className)}>
      <BlockNoteView
        editor={editor as unknown as AnyEditor}
        editable={false}
        theme={theme === 'dark' ? transparentDark : transparentLight}
        sideMenu={false}
        formattingToolbar={false}
      />
    </div>
  )
}
