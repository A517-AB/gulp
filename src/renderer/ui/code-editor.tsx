import '@/lib/monaco'
import { useTheme } from '@/providers/theme'
import Editor, { type EditorProps } from '@monaco-editor/react'
import { cn } from '@/utils'
import { Loader2 } from 'lucide-react'

export interface CodeEditorProps extends Omit<EditorProps, 'theme'> {
  className?: string
  containerClassName?: string
}


export function CodeEditor({ 
  className, 
  containerClassName,
  height = '100%',
  options,
  ...props 
}: CodeEditorProps) {
  const { theme } = useTheme()
  const isDark = theme === 'dark'

  return (
    <div className={cn("relative overflow-hidden rounded-md border border-subtle bg-base w-full h-full", containerClassName)}>
      <Editor
        height={height}
        theme={isDark ? 'vs-dark' : 'light'}
        loading={
          <div className="flex h-full w-full items-center justify-center text-fg-muted">
            <Loader2 className="size-5 animate-spin" />
          </div>
        }
        options={{
          minimap: { enabled: false },
          fontSize: 13,
          fontFamily: 'var(--font-mono)',
          fontLigatures: true,
          padding: { top: 12, bottom: 12 },
          scrollBeyondLastLine: false,
          smoothScrolling: true,
          cursorBlinking: 'smooth',
          cursorSmoothCaretAnimation: 'on',
          formatOnPaste: true,
          renderLineHighlight: 'line',
          lineNumbersMinChars: 3,
          wordWrap: 'on',
          wrappingIndent: 'indent',
          folding: false,
          glyphMargin: false,
          lineDecorationsWidth: 4,
          wordBasedSuggestions: 'currentDocument',
          scrollbar: {
            verticalScrollbarSize: 8,
            horizontalScrollbarSize: 8,
          },
          ...options
        }}
        className={cn("w-full h-full", className)}
        {...props}
      />
    </div>
  )
}
