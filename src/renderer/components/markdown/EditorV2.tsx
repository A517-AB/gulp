import {useEffect, useState} from 'react'
import {useCreateBlockNote} from '@blocknote/react'
import {BlockNoteView, darkDefaultTheme, lightDefaultTheme} from '@blocknote/mantine'
import type {BlockNoteEditor, BlockSchema, InlineContentSchema, StyleSchema} from '@blocknote/core'
import {cn} from '@/utils'
import '@blocknote/mantine/style.css'
import {useTheme} from '@renderer/providers/theme'
import type {NoteBlock, NotePartialBlock} from './types'
// i'll do my best to remember this exisits and finish it.
type CompatEditor = BlockNoteEditor<BlockSchema, InlineContentSchema, StyleSchema>

export const transparentLight = {
    ...lightDefaultTheme,
    colors: {...lightDefaultTheme.colors, editor: {...lightDefaultTheme.colors.editor, background: 'transparent'}}
}
export const transparentDark = {
    ...darkDefaultTheme,
    colors: {...darkDefaultTheme.colors, editor: {...darkDefaultTheme.colors.editor, background: 'transparent'}}
}

export interface BlockEditorProps {
    /** Pre-parsed blocks, used as the editor's initial content. */
    initialBlocks?: NotePartialBlock[]
    /** Markdown source — parsed into blocks and rendered. */
    markdown?: string
    /** HTML source — parsed into blocks and rendered. */
    html?: string
    readOnly?: boolean
    /** Show side menu + formatting toolbar. Defaults to the editable state. */
    chrome?: boolean
    className?: string
    onChangeBlocks?: (blocks: NoteBlock[]) => void
    onChangeMarkdown?: (markdown: string) => void
}

/**
 * Single BlockNote wrapper. Feed it one of `initialBlocks` (already-parsed
 * blocks), `markdown`, or `html`. Read-only by passing `readOnly`. Editing
 * changes can flow back out as blocks (`onChangeBlocks`) or markdown
 * (`onChangeMarkdown`). Theme + the BlockNote view cast live here, once.
 */
export function BlockEditor({
                                initialBlocks,
                                markdown,
                                html,
                                readOnly = false,
                                chrome,
                                className,
                                onChangeBlocks,
                                onChangeMarkdown,
                            }: BlockEditorProps) {
    const {theme} = useTheme()
    const editor = useCreateBlockNote(initialBlocks ? {initialContent: initialBlocks} : {})

    const fromString = markdown !== undefined || html !== undefined
    const [ready, setReady] = useState(!fromString)

    // String sources can't be passed as initialContent — parse then replace.
    useEffect(() => {
        if (!fromString) return
        const blocks = html !== undefined
            ? editor.tryParseHTMLToBlocks(html)
            : editor.tryParseMarkdownToBlocks(markdown ?? '')
        editor.replaceBlocks(editor.document, blocks)
        setReady(true)
    }, [editor, fromString, html, markdown])

    useEffect(() => {
        if (readOnly) return
        if (!onChangeBlocks && !onChangeMarkdown) return
        return editor.onChange(() => {
            onChangeBlocks?.(editor.document)
            onChangeMarkdown?.(editor.blocksToMarkdownLossy(editor.document))
        })
    }, [editor, readOnly, onChangeBlocks, onChangeMarkdown])

    if (!ready) return null

    const showChrome = chrome ?? !readOnly
    const chromeProps = showChrome ? {} : {sideMenu: false, formattingToolbar: false}

    return (
        <div className={cn('w-full', className)}>
            <BlockNoteView
                editor={editor as unknown as CompatEditor}
                editable={!readOnly}
                theme={theme === 'dark' ? transparentDark : transparentLight}
                {...chromeProps}
            />
        </div>
    )
}
