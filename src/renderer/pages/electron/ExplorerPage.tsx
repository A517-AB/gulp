import { useState, useEffect, useCallback, useRef } from 'react'
import type { editor } from 'monaco-editor'
import { FolderOpen, FileCode, Save, X } from 'lucide-react'
import { FileTree } from '@renderer/components/shared/FileTree'
import { CodeEditor } from '@renderer/ui/code-editor'
import { filesystem } from '@shared/bridge'

const LANG_MAP: Record<string, string> = {
  py: 'python', ts: 'typescript', tsx: 'typescript',
  js: 'javascript', jsx: 'javascript', sh: 'shell',
  json: 'json', md: 'markdown', html: 'html', css: 'css',
}

export function ExplorerPage() {
  const [rootDir, setRootDir] = useState<string | null>(() =>
    localStorage.getItem('workspace:explorer:root'),
  )
  const [openFilePath, setOpenFilePath] = useState<string | null>(null)
  const [openFileContent, setOpenFileContent] = useState('')
  const [saved, setSaved] = useState(false)
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null)
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (rootDir) localStorage.setItem('workspace:explorer:root', rootDir)
    else localStorage.removeItem('workspace:explorer:root')
  }, [rootDir])

  const editorLang = openFilePath
    ? (LANG_MAP[openFilePath.split('.').pop()?.toLowerCase() ?? ''] ?? 'plaintext')
    : 'plaintext'

  const handleSelectFolder = useCallback(async () => {
    if (!filesystem) return
    const path = await filesystem.showOpenDialog()
    if (path) { setRootDir(path); setOpenFilePath(null) }
  }, [])

  const handleSelectFile = useCallback(async (filePath: string) => {
    if (!filesystem) return
    try {
      const content = await filesystem.readFile(filePath)
      setOpenFilePath(filePath)
      setOpenFileContent(content)
    } catch (err) {
      console.error('Failed to read file:', err)
    }
  }, [])

  const handleSaveFile = useCallback(async () => {
    if (!filesystem || !openFilePath) return
    const content = editorRef.current?.getValue() ?? openFileContent
    try {
      await filesystem.writeFile(openFilePath, content)
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
      setSaved(true)
      saveTimerRef.current = setTimeout(() => { setSaved(false) }, 1500)
    } catch (err) {
      console.error('Failed to save file:', err)
    }
  }, [openFilePath, openFileContent])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault()
        void handleSaveFile()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => { window.removeEventListener('keydown', handleKeyDown) }
  }, [handleSaveFile])

  return (
    <div className="flex flex-row h-full overflow-hidden w-full text-fg-primary bg-base">

      {/* Left Column: Explorer Pane */}
      <div className="w-56 flex flex-col h-full overflow-hidden shrink-0 border-r border-hair">
        <div className="flex items-center gap-2 px-3 h-9 shrink-0 border-b border-hair">
          <button
            onClick={() => { void handleSelectFolder() }}
            className="flex items-center gap-2 min-w-0 flex-1 hover:text-fg-primary transition-colors group"
            title={rootDir ?? 'Open folder'}
          >
            <FolderOpen className="h-3.5 w-3.5 text-fg-ghost shrink-0 group-hover:text-fg-muted transition-colors" />
            <span className="text-[10px] font-mono text-fg-ghost truncate group-hover:text-fg-muted transition-colors">
              {rootDir ? rootDir.split(/[\\/]/).pop() : 'open folder'}
            </span>
          </button>
        </div>

        <div className="flex-1 overflow-auto py-1">
          {rootDir && (
            <FileTree
              root={rootDir}
              onSelectFile={(entry) => void handleSelectFile(entry.path)}
            />
          )}
        </div>
      </div>

      {/* Right Column: Code Editor Pane */}
      <div className="flex-grow flex flex-col h-full bg-base overflow-hidden relative">
        {openFilePath && (
          <div className="flex flex-col h-full">
            <div className="flex items-center justify-between px-4 py-3 border-b border-hair bg-base shrink-0">
              <div className="flex items-center gap-2 min-w-0">
                <FileCode className="h-4 w-4 text-fg-secondary shrink-0" />
                <span className="text-[10px] font-mono text-fg-primary truncate" title={openFilePath}>
                  {openFilePath.split(/[\\/]/).pop()}
                </span>
                <span className="text-[9px] font-mono text-fg-ghost truncate" title={openFilePath}>
                  ({openFilePath})
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => { void handleSaveFile() }}
                  className={`px-3 py-1.5 rounded-md border text-2xs font-mono flex items-center gap-1.5 transition-all ${
                    saved
                      ? 'bg-green-500/10 border-green-500/30 text-green-400'
                      : 'bg-hover border-hair text-fg-secondary hover:bg-active hover:text-fg-primary hover:border-subtle'
                  }`}
                >
                  <Save className="h-3 w-3" />
                  {saved ? 'SAVED!' : 'SAVE'}
                </button>
                <button
                  onClick={() => { setOpenFilePath(null) }}
                  className="p-1 rounded hover:bg-hover text-fg-muted hover:text-fg-primary transition-colors"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            <div className="flex-1 p-4 bg-base overflow-hidden">
              <CodeEditor
                path={openFilePath}
                defaultValue={openFileContent}
                onMount={(ed) => { editorRef.current = ed }}
                language={editorLang}
                options={{ lineNumbers: 'on' }}
              />
            </div>
          </div>
        )}
      </div>

    </div>
  )
}
