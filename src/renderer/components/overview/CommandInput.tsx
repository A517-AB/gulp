import { useCallback, useEffect } from 'react'
import { useCreateBlockNote, SuggestionMenuController } from '@blocknote/react'
import type { DefaultReactSuggestionItem } from '@blocknote/react'
import { BlockNoteView, darkDefaultTheme, lightDefaultTheme } from '@blocknote/mantine'
import '@blocknote/mantine/style.css'
import type { BlockNoteEditor, BlockSchema, InlineContentSchema, StyleSchema } from '@blocknote/core'
import { useTheme } from '@renderer/providers/theme'
import { parseInput, isParseOk } from '@shared/commands'
import type { AtCommand, Command, DisplayCommand } from '@shared/commands'
import { cn } from '@/utils'

type AnyEditor = BlockNoteEditor<BlockSchema, InlineContentSchema, StyleSchema>

const transparentLight = { ...lightDefaultTheme, colors: { ...lightDefaultTheme.colors, editor: { ...lightDefaultTheme.colors.editor, background: 'transparent' } } }
const transparentDark  = { ...darkDefaultTheme,  colors: { ...darkDefaultTheme.colors,  editor: { ...darkDefaultTheme.colors.editor,  background: 'transparent' } } }

interface Props {
  commands:   Command[]
  onDisplay:  (command: DisplayCommand) => void
  onSend:     (command: AtCommand, prompt: string) => void
  className?: string
}

export function CommandInput({ commands, onDisplay, onSend, className }: Props) {
  const { theme } = useTheme()
  const editor = useCreateBlockNote()

  const getDisplayItems = useCallback((query: string): Promise<DefaultReactSuggestionItem[]> =>
    Promise.resolve(
      commands
        .filter((c): c is DisplayCommand => c.trigger === '/' && c.enabled)
        .filter(c => !query || c.alias.toLowerCase().startsWith(query.toLowerCase()))
        .map(c => ({
          title:       c.alias,
          subtext:     'pull latest markdown',
          onItemClick: () => { onDisplay(c) },
        }))
    )
  , [commands, onDisplay])

  const getAtItems = useCallback((query: string): Promise<DefaultReactSuggestionItem[]> =>
    Promise.resolve(
      commands
        .filter((c): c is AtCommand => c.trigger === '@' && c.enabled)
        .filter(c => !query || c.alias.toLowerCase().startsWith(query.toLowerCase()))
        .map(c => ({
          title:       c.alias,
          subtext:     'send message to Jules',
          onItemClick: () => {
            editor.insertInlineContent([{ type: 'text', text: `@${c.alias} `, styles: {} }])
          },
        }))
    )
  , [commands, editor])

  // Native listener on the editor DOM element — synthetic React events don't
  // reliably fire from inside BlockNote's contenteditable.
  useEffect(() => {
    const el = editor.domElement
    if (!el) return

    const onKeyDown = (e: KeyboardEvent) => {
      if (!(e.metaKey || e.ctrlKey) || e.key !== 'Enter') return
      e.preventDefault()

      const text   = editor.blocksToMarkdownLossy(editor.document).trim()
      const parsed = parseInput(text, commands)
      if (!isParseOk(parsed) || parsed.value.trigger !== '@') return

      onSend(parsed.value.command, parsed.value.prompt)
      setTimeout(() => {
        editor.replaceBlocks(editor.document, [{ type: 'paragraph', content: [] }])
      }, 0)
    }

    el.addEventListener('keydown', onKeyDown)
    return () => { el.removeEventListener('keydown', onKeyDown) }
  }, [editor, commands, onSend])

  return (
    <div className={cn('w-full', className)}>
      <BlockNoteView
        editor={editor as unknown as AnyEditor}
        theme={theme === 'dark' ? transparentDark : transparentLight}
        slashMenu={false}
        sideMenu={false}
        formattingToolbar={false}
      >
        <SuggestionMenuController
          triggerCharacter="/"
          getItems={getDisplayItems}
        />
        <SuggestionMenuController
          triggerCharacter="@"
          getItems={getAtItems}
        />
      </BlockNoteView>
    </div>
  )
}
