import { useEffect, useState } from 'react'
import { useCreateBlockNote } from '@blocknote/react'
import { BlockNoteView, darkDefaultTheme } from '@blocknote/mantine'
import { BlockNoteSchema, createCodeBlockSpec, defaultBlockSpecs } from '@blocknote/core'
import type { BlockNoteEditor, BlockSchema, BlockSpecs, InlineContentSchema, StyleSchema } from '@blocknote/core'
import { codeBlockOptions } from '@blocknote/code-block'
import '@blocknote/mantine/style.css'
import { cn } from '@/utils'

type CompatEditor = BlockNoteEditor<BlockSchema, InlineContentSchema, StyleSchema>

const schema = BlockNoteSchema.create({
  blockSpecs: { ...defaultBlockSpecs, codeBlock: createCodeBlockSpec(codeBlockOptions) } as unknown as BlockSpecs,
})

const THEME = {
  ...darkDefaultTheme,
  fontFamily: "'JetBrainsMono NF', 'JetBrains Mono', 'CaskaydiaCove NF', 'Cascadia Code', ui-monospace, monospace",
  colors: {
    ...darkDefaultTheme.colors,
    editor: { background: 'transparent', text: 'inherit' },
  },
} as const

export interface BlockEditorProps {
  content?: string
  onChange?: (markdown: string) => void
  className?: string
  readOnly?: boolean
}

export function BlockEditor({ content = '', onChange, className, readOnly = false }: BlockEditorProps) {
  const editor = useCreateBlockNote({ schema })
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const blocks = editor.tryParseMarkdownToBlocks(content)
    editor.replaceBlocks(editor.document, blocks)
    setReady(true)
  }, [editor, content])

  if (!ready) return null

  return (
    <div className={cn('w-full h-full', className)}>
      <BlockNoteView
        editor={editor as unknown as CompatEditor}
        editable={!readOnly}
        theme={THEME}
        onChange={() => {
          if (!onChange) return
          onChange(editor.blocksToMarkdownLossy(editor.document))
        }}
      />
    </div>
  )
}
