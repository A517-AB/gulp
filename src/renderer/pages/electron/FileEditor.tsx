import { useEffect, useState } from 'react'
import type { editor } from 'monaco-editor'
import { CodeEditor } from '@/ui/code-editor'
import { useCreateBlockNote } from '@blocknote/react'
import { BlockNoteView, darkDefaultTheme, lightDefaultTheme } from '@blocknote/mantine'
import type { BlockNoteEditor, BlockSchema, InlineContentSchema, StyleSchema } from '@blocknote/core'
import { useTheme } from '@renderer/providers/theme'
import type { NoteBlock, NotePartialBlock } from '@/components/markdown/types'
import '@blocknote/mantine/style.css'

type CompatEditor = BlockNoteEditor<BlockSchema, InlineContentSchema, StyleSchema>

// Minimal typed interface — avoids both eslint unsafe-call and tsc type errors
interface BNEditorApi {
  tryParseMarkdownToBlocks: (md: string) => NotePartialBlock[]
  replaceBlocks: (toRemove: NoteBlock[], newBlocks: NotePartialBlock[]) => void
  blocksToMarkdownLossy: (blocks: NoteBlock[]) => string
  onChange: (fn: () => void) => () => void
  document: NoteBlock[]
}

const LANG_MAP: Record<string, string> = {
  py: 'python', ts: 'typescript', tsx: 'typescript',
  js: 'javascript', jsx: 'javascript', sh: 'shell',
  json: 'json', html: 'html', css: 'css',
  yaml: 'yaml', yml: 'yaml', rs: 'rust', go: 'go',
  rb: 'ruby', php: 'php', java: 'java', cs: 'csharp',
  cpp: 'cpp', c: 'c', kt: 'kotlin', swift: 'swift',
  toml: 'ini', env: 'ini', sql: 'sql', graphql: 'graphql',
}

function langFor(path: string): string {
  return LANG_MAP[path.split('.').pop()?.toLowerCase() ?? ''] ?? 'plaintext'
}

function isMd(path: string): boolean {
  const lower = path.toLowerCase()
  return lower.endsWith('.md') || lower.endsWith('.txt')
}

export interface FileEditorProps {
  path: string
  content: string
  mode?: 'default' | 'raw'
  onMount?: (ed: editor.IStandaloneCodeEditor) => void
  onChange?: (value: string | undefined) => void
}

// ── Markdown editor wrapper (BlockNote) ───────────────────────────────────────

function MdFileEditor({ path, content, onChange }: FileEditorProps) {
  const { theme } = useTheme()
  const rawEditor = useCreateBlockNote()
  const api = rawEditor as unknown as BNEditorApi
  const compat = rawEditor as unknown as CompatEditor
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const blocks = api.tryParseMarkdownToBlocks(content)
    api.replaceBlocks(api.document, blocks)
    queueMicrotask(() => {
      setReady(true)
    })
  // only run when path changes (new file loaded)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [path])

  useEffect(() => {
    if (!ready || !onChange) return
    return api.onChange(() => {
      onChange(api.blocksToMarkdownLossy(api.document))
    })
  }, [api, onChange, ready])

  const transparentLight = { ...lightDefaultTheme, colors: { ...lightDefaultTheme.colors, editor: { ...lightDefaultTheme.colors.editor, background: 'transparent' } } }
  const transparentDark  = { ...darkDefaultTheme,  colors: { ...darkDefaultTheme.colors,  editor: { ...darkDefaultTheme.colors.editor,  background: 'transparent' } } }

  if (!ready) return null

  return (
    <div className="w-full h-full overflow-y-auto">
      <BlockNoteView
        editor={compat}
        editable={false}
        sideMenu={false}
        formattingToolbar={false}
        theme={theme === 'dark' ? transparentDark : transparentLight}
      />
    </div>
  )
}

// ── Main export ───────────────────────────────────────────────────────────────

export function FileEditor({ path, content, mode = 'default', onMount, onChange }: FileEditorProps) {
  if (isMd(path) && mode === 'default') {
    return <MdFileEditor path={path} content={content} {...(onChange !== undefined ? { onChange } : {})} />
  }
  return (
    <CodeEditor
      path={path}
      defaultValue={content}
      language={langFor(path)}
      onMount={ed => { onMount?.(ed) }}
      {...(onChange !== undefined ? { onChange } : {})}
      options={{ lineNumbers: 'on' }}
      containerClassName="rounded-none border-none border-0"
    />
  )
}
