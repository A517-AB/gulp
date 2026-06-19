import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import type { editor } from 'monaco-editor'
import {
  FolderOpen, Save, X, GitBranch,
  RefreshCw, ChevronDown, Plus, CheckCircle2,
  Star, StarOff
} from 'lucide-react'
import { FileTree } from '@/components/shared/FileTree'
import { FileEditor, isImage } from './FileEditor'
import { filesystem, git } from '@shared/bridge'
import { cn } from '@/utils'
import { useExplorerStore } from '@/store/explorer'
import { GIT_COLORS, normalizePath, parseGitStatusPorcelain } from '@/utils/git'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/ui/dropdown-menu'
import { useQuickie } from '@/components/quickie/use-quickie'
import type { QuickiePreset } from '@/components/quickie/types'

const FILE_PRESETS: Record<string, QuickiePreset<'repoless_file'>> = {
  explain: {
    id: 'explain',
    label: 'Explain this file',
    contextType: 'repoless_file',
    generatePrompt: ({ filename, content }) =>
      `Explain what this file does:\n\n**${filename}**\n\`\`\`\n${content}\n\`\`\``,
  },
  review: {
    id: 'review',
    label: 'Review for issues',
    contextType: 'repoless_file',
    generatePrompt: ({ filename, content }) =>
      `Review this file for bugs, issues, or improvements:\n\n**${filename}**\n\`\`\`\n${content}\n\`\`\``,
  },
  improve: {
    id: 'improve',
    label: 'Suggest improvements',
    contextType: 'repoless_file',
    generatePrompt: ({ filename, content }) =>
      `Suggest specific improvements for:\n\n**${filename}**\n\`\`\`\n${content}\n\`\`\``,
  },
}

export function ExplorerPage() {
  const {
    rootDir, setRootDir,
    favoritePaths, addFavorite, removeFavorite,
    openPaths, setOpenPaths,
    activePath, setActivePath,
    gitCache, setGitCache
  } = useExplorerStore()

  const quickie = useQuickie()

  const handleQuickie = useCallback(async (path: string, presetId: string) => {
    if (!filesystem) return
    const preset = FILE_PRESETS[presetId]
    if (!preset) return
    const content = await filesystem.readFile(path)
    const filename = path.split(/[\\/]/).pop() ?? path
    void quickie.execute(preset, { filename, content })
  }, [quickie])

  const [fileContents, setFileContents] = useState<Record<string, string>>({})
  const [dirtyPaths, setDirtyPaths] = useState<Set<string>>(new Set())
  const [editorMode, setEditorMode] = useState<'default' | 'raw'>('default')

  useEffect(() => {
    queueMicrotask(() => {
      setEditorMode('default')
    })
  }, [activePath])

  // git
  const [isGitRepo, setIsGitRepo] = useState(false)
  const [gitBranch, setGitBranch] = useState('')
  const [gitPanelOpen, setGitPanelOpen] = useState(false)
  const [commitMsg, setCommitMsg] = useState('')
  const [commitState, setCommitState] = useState<'idle' | 'busy' | 'done'>('idle')
  const [stagedPaths, setStagedPaths] = useState<Set<string>>(new Set())

  // for code files use editorRef; for md files track content in contentRef
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null)
  const activeSavedRef = useRef('')
  const pendingContentRef = useRef<string>('')

  const gitChanges = useMemo(() => rootDir ? (gitCache[rootDir] ?? []) : [], [rootDir, gitCache])

  useEffect(() => {
    const saved = (activePath ? fileContents[activePath] : '') ?? ''
    activeSavedRef.current = saved
    pendingContentRef.current = saved
  }, [activePath, fileContents])

  useEffect(() => {
    if (activePath && fileContents[activePath] === undefined && filesystem && !isImage(activePath)) {
      filesystem.readFile(activePath).then(content => {
        setFileContents(prev => ({ ...prev, [activePath]: content }))
      }).catch(console.error)
    }
  }, [activePath, fileContents])

  // ── git ──────────────────────────────────────────────────────────────────────

  const loadGitStatus = useCallback(async (dir: string) => {
    if (!git) return
    try {
      const check = await git.run(dir, ['rev-parse', '--git-dir'])
      if (!check.ok) { setIsGitRepo(false); return }
      setIsGitRepo(true)
      const [branchRes, statusRes] = await Promise.all([
        git.run(dir, ['rev-parse', '--abbrev-ref', 'HEAD']),
        git.status(dir),
      ])
      if (branchRes.ok) setGitBranch(branchRes.stdout.trim())
      if (statusRes.ok) setGitCache(dir, parseGitStatusPorcelain(statusRes.stdout))
    } catch {
      setIsGitRepo(false)
    }
  }, [setGitCache])

  useEffect(() => {
    if (!rootDir) return
    void Promise.resolve().then(() => { void loadGitStatus(rootDir) })
  }, [rootDir, loadGitStatus])

  const gitStatusMap = useMemo(() => {
    if (!rootDir) return {}
    const map: Record<string, string> = {}
    for (const ch of gitChanges) {
      map[normalizePath(rootDir) + '/' + ch.path] = ch.code
    }
    return map
  }, [gitChanges, rootDir])

  // ── file ops ─────────────────────────────────────────────────────────────────

  const resetFolderState = useCallback((path: string) => {
    setRootDir(path)
    setOpenPaths([])
    setActivePath(null)
    setFileContents({})
    setDirtyPaths(new Set())
    setIsGitRepo(false)
    setStagedPaths(new Set())
  }, [setRootDir, setOpenPaths, setActivePath])

  const handleSelectFolder = useCallback(async () => {
    if (!filesystem) return
    const path = await filesystem.showOpenDialog()
    if (!path) return
    resetFolderState(path)
  }, [resetFolderState])

  const handleSelectFile = useCallback(async (filePath: string) => {
    if (!filesystem) return
    if (openPaths.includes(filePath)) { setActivePath(filePath); return }
    if (isImage(filePath)) {
      setFileContents(prev => ({ ...prev, [filePath]: '' }))
      setOpenPaths([...openPaths, filePath])
      setActivePath(filePath)
      return
    }
    try {
      const content = await filesystem.readFile(filePath)
      setFileContents(prev => ({ ...prev, [filePath]: content }))
      setOpenPaths([...openPaths, filePath])
      setActivePath(filePath)
    } catch (err) {
      console.error('[Explorer] read failed:', err)
    }
  }, [openPaths, setActivePath, setOpenPaths])

  const closeFile = useCallback((filePath: string) => {
    const idx = openPaths.indexOf(filePath)
    const next = openPaths.filter(p => p !== filePath)
    setOpenPaths(next)
    if (activePath === filePath) {
      setActivePath(next[idx] ?? next[Math.max(0, idx - 1)] ?? null)
    }
    setDirtyPaths(prev => { const s = new Set(prev); s.delete(filePath); return s })
  }, [openPaths, activePath, setOpenPaths, setActivePath])

  const handleSaveFile = useCallback(async () => {
    if (!activePath || !filesystem) return
    const lower = activePath.toLowerCase()
    const isMdOrTxt = lower.endsWith('.md') || lower.endsWith('.txt')
    const content = isMdOrTxt && editorMode === 'default'
      ? pendingContentRef.current
      : (editorRef.current?.getValue() ?? '')
    try {
      await filesystem.writeFile(activePath, content)
      setFileContents(prev => ({ ...prev, [activePath]: content }))
      activeSavedRef.current = content
      setDirtyPaths(prev => {
        const s = new Set(prev)
        s.delete(activePath)
        return s
      })
      if (rootDir) void loadGitStatus(rootDir)
    } catch (err) {
      console.error('[Explorer] save failed:', err)
    }
  }, [activePath, editorMode, rootDir, loadGitStatus])

  const handleNewFile = useCallback(async () => {
    if (!filesystem || !rootDir) return
    const savePath = await filesystem.showSaveDialog('untitled.ts')
    if (!savePath) return
    try {
      await filesystem.writeFile(savePath, '')
      setFileContents(prev => ({ ...prev, [savePath]: '' }))
      setOpenPaths([...openPaths, savePath])
      setActivePath(savePath)
    } catch (err) {
      console.error('[Explorer] new file failed:', err)
    }
  }, [rootDir, openPaths, setOpenPaths, setActivePath])

  const handleEditorChange = useCallback((value: string | undefined) => {
    if (!activePath) return
    pendingContentRef.current = value ?? ''
    const isDirty = value !== activeSavedRef.current
    setDirtyPaths(prev => {
      const s = new Set(prev)
      if (isDirty) { s.add(activePath) } else { s.delete(activePath) }
      return s
    })
  }, [activePath])

  // ── git ops ──────────────────────────────────────────────────────────────────

  const toggleStaged = useCallback((fullPath: string) => {
    setStagedPaths(prev => {
      const s = new Set(prev)
      if (s.has(fullPath)) { s.delete(fullPath) } else { s.add(fullPath) }
      return s
    })
  }, [])

  const handleCommit = useCallback(async () => {
    if (!git || !rootDir || commitState === 'busy' || gitChanges.length === 0) return
    setCommitState('busy')
    try {
      const relFiles = stagedPaths.size > 0
        ? [...stagedPaths].map(p => normalizePath(p).replace(normalizePath(rootDir) + '/', ''))
        : undefined
      const addRes = await git.add(rootDir, relFiles)
      if (!addRes.ok) throw new Error(addRes.stderr)
      const msg = commitMsg.trim() || `snapshot ${new Date().toLocaleString()}`
      const commitRes = await git.commit(rootDir, msg)
      if (!commitRes.ok) throw new Error(commitRes.stderr)
      setCommitMsg('')
      setStagedPaths(new Set())
      setCommitState('done')
      setTimeout(() => { setCommitState('idle') }, 2000)
      void loadGitStatus(rootDir)
    } catch (err) {
      console.error('[Explorer] commit failed:', err)
      setCommitState('idle')
    }
  }, [rootDir, commitState, gitChanges.length, stagedPaths, commitMsg, loadGitStatus])

  // ── keyboard ─────────────────────────────────────────────────────────────────

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey)) return
      if (e.key === 's') { e.preventDefault(); void handleSaveFile() }
      if (e.key === 'w') { e.preventDefault(); if (activePath) closeFile(activePath) }
      if (e.key === 'e' && !e.shiftKey) {
        e.preventDefault()
        if (activePath) {
          const lower = activePath.toLowerCase()
          const isMdOrTxt = lower.endsWith('.md') || lower.endsWith('.txt')
          if (isMdOrTxt) {
            const currentText = editorMode === 'default'
              ? pendingContentRef.current
              : (editorRef.current?.getValue() ?? '')
            setFileContents(prev => ({ ...prev, [activePath]: currentText }))
            setEditorMode(prev => prev === 'default' ? 'raw' : 'default')
          }
        }
      }
      if (e.key === 'e' && e.shiftKey) {
        e.preventDefault()
        if (activePath) {
          const lower = activePath.toLowerCase()
          const isHtmlFile = lower.endsWith('.html') || lower.endsWith('.htm')
          if (isHtmlFile) {
            setEditorMode(prev => prev === 'default' ? 'raw' : 'default')
          }
        }
      }
    }
    window.addEventListener('keydown', onKey)
    return () => { window.removeEventListener('keydown', onKey) }
  }, [handleSaveFile, closeFile, activePath, editorMode])

  // ── render ───────────────────────────────────────────────────────────────────

  const activeContent = activePath ? fileContents[activePath] : undefined

  return (
    <div className="flex flex-row h-full overflow-hidden w-full text-fg-primary bg-base">

      {/* ── Sidebar ───────────────────────────────────────────────────────────── */}
      <div className="w-52 flex flex-col h-full overflow-hidden shrink-0">

        {/* Sidebar header */}
        <div className="flex items-center gap-1 px-2 h-9 shrink-0">
          <div className="flex items-center gap-0.5 min-w-0 flex-1">
            <button
              onClick={() => { void handleSelectFolder() }}
              className="p-1 rounded hover:bg-hover text-fg-ghost hover:text-fg-primary transition-colors shrink-0"
              title="Open folder"
            >
              <FolderOpen className="h-3 w-3" />
            </button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  className="flex items-center gap-1 min-w-0 flex-1 px-1 rounded hover:bg-hover group transition-colors"
                  title={rootDir ?? 'Open folder'}
                >
                  <span className="text-3xs font-sans text-fg-ghost truncate group-hover:text-fg-muted">
                    {rootDir ? rootDir.split(/[\\/]/).pop() : 'open folder'}
                  </span>
                  {favoritePaths.length > 0 && (
                    <ChevronDown className="h-2.5 w-2.5 text-fg-ghost/50 shrink-0" />
                  )}
                </button>
              </DropdownMenuTrigger>
              {favoritePaths.length > 0 && (
                <DropdownMenuContent align="start" className="w-64">
                  {favoritePaths.map(p => (
                    <DropdownMenuItem
                      key={p}
                      onClick={() => { resetFolderState(p) }}
                      className={cn('font-sans text-3xs', p === rootDir && 'text-fg-primary')}
                    >
                      <Star className="h-3 w-3 text-yellow-400 shrink-0" />
                      <span className="truncate">{p}</span>
                    </DropdownMenuItem>
                  ))}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => { void handleSelectFolder() }} className="font-sans text-3xs">
                    <FolderOpen className="h-3 w-3 shrink-0" />
                    Open folder…
                  </DropdownMenuItem>
                </DropdownMenuContent>
              )}
            </DropdownMenu>
          </div>
          {rootDir && (
            <div className="flex items-center shrink-0">
              <button
                onClick={() => {
                  if (favoritePaths.includes(rootDir)) removeFavorite(rootDir)
                  else addFavorite(rootDir)
                }}
                className="p-1 rounded hover:bg-hover text-fg-ghost hover:text-fg-primary transition-colors"
                title={favoritePaths.includes(rootDir) ? 'Remove from favorites' : 'Add to favorites'}
              >
                {favoritePaths.includes(rootDir) ? <Star className="h-3 w-3 text-yellow-400" /> : <StarOff className="h-3 w-3" />}
              </button>
              <button
                onClick={() => { void handleNewFile() }}
                className="p-1 rounded hover:bg-hover text-fg-ghost hover:text-fg-primary transition-colors"
                title="New file"
              >
                <Plus className="h-3 w-3" />
              </button>
              <button
                onClick={() => { void loadGitStatus(rootDir) }}
                className="p-1 rounded hover:bg-hover text-fg-ghost hover:text-fg-primary transition-colors"
                title="Refresh"
              >
                <RefreshCw className="h-3 w-3" />
              </button>
            </div>
          )}
        </div>

        {/* File tree */}
        <div className="flex-1 overflow-hidden py-1 min-h-0">
          {rootDir && (
            <FileTree
              root={rootDir}
              gitStatus={gitStatusMap}
              onSelectFile={(entry) => { void handleSelectFile(entry.path) }}
              onQuickie={(path, presetId) => { void handleQuickie(path, presetId) }}
            />
          )}
        </div>

        {/* Open files list */}
        {openPaths.length > 0 && (
          <div className="shrink-0 border-t border-hair max-h-40 overflow-y-auto">
            {openPaths.map(p => {
              const name = p.split(/[\\/]/).pop() ?? p
              const isActive = p === activePath
              const isDirty = dirtyPaths.has(p)
              const gitCode = gitStatusMap[normalizePath(p)]
              return (
                <div
                  key={p}
                  className={cn(
                    'flex items-center gap-1.5 px-2 py-1 cursor-pointer hover:bg-hover transition-colors group',
                    isActive && 'bg-hover',
                  )}
                  onClick={() => { setActivePath(p) }}
                  onMouseDown={e => { if (e.button === 1) { e.preventDefault(); closeFile(p) } }}
                >
                  {isDirty && <span className="h-1 w-1 rounded-full bg-yellow-400 shrink-0" />}
                  <span className={cn('flex-1 text-3xs truncate', gitCode ? GIT_COLORS[gitCode] : isActive ? 'text-fg-primary' : 'text-fg-secondary')}>
                    {name}
                  </span>
                  <button
                    onClick={e => { e.stopPropagation(); closeFile(p) }}
                    className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-active text-fg-ghost hover:text-fg-primary transition-all shrink-0"
                  >
                    <X className="h-2.5 w-2.5" />
                  </button>
                </div>
              )
            })}
          </div>
        )}

        {/* Git toggle — sidebar footer */}
        {isGitRepo && gitBranch && (
          <button
            onClick={() => { setGitPanelOpen(v => !v) }}
            className="flex items-center gap-1.5 px-2 py-1.5 border-t border-hair shrink-0 w-full hover:bg-hover transition-colors"
          >
            <GitBranch className="h-2.5 w-2.5 text-purple-400 shrink-0" />
            <span className="text-[9px] font-mono text-purple-400 truncate">{gitBranch}</span>
            {gitChanges.length > 0 && (
              <span className="ml-auto text-[9px] font-bold font-mono px-1 rounded bg-yellow-500/10 text-yellow-400 shrink-0">
                {gitChanges.length}
              </span>
            )}
          </button>
        )}
      </div>

      {/* ── Main ──────────────────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col h-full overflow-hidden min-w-0 relative">

        {/* Editor */}
        <div className="flex-1 overflow-hidden">
          {activePath && activeContent !== undefined ? (
            <FileEditor
              path={activePath}
              content={activeContent}
              mode={editorMode}
              onMount={ed => { editorRef.current = ed }}
              onChange={handleEditorChange}
            />
          ) : (
            <div className="flex flex-col items-center justify-center h-full gap-3 select-none">
              <span className="text-[10px] font-mono text-fg-ghost/30 uppercase tracking-widest">
                {rootDir ? 'select a file' : 'open a folder to start'}
              </span>
              {!rootDir && (
                <div className="flex flex-col items-center gap-4">
                  <button
                    onClick={() => { void handleSelectFolder() }}
                    className="flex items-center gap-2 px-3 py-1.5 rounded border border-hair text-[10px] font-mono text-fg-ghost hover:text-fg-primary hover:border-subtle transition-colors"
                  >
                    <FolderOpen className="h-3 w-3" />
                    Open folder
                  </button>
                  {favoritePaths.length > 0 && (
                    <div className="mt-4 flex flex-col gap-1.5 w-64 max-h-[40vh] overflow-y-auto pr-2">
                      <div className="text-[10px] font-mono text-fg-ghost/50 uppercase tracking-widest text-center mb-1 flex items-center justify-center gap-1.5">
                        <Star className="h-3 w-3" /> Favorites
                      </div>
                      {favoritePaths.map(p => (
                        <div key={p} className="flex items-center gap-1 group">
                          <button
                            onClick={() => { resetFolderState(p) }}
                            className="flex-1 px-2 py-1.5 rounded bg-hover/30 border border-hair text-[10px] font-mono text-fg-secondary hover:text-fg-primary hover:border-subtle transition-colors text-left truncate"
                            title={p}
                          >
                            {p}
                          </button>
                          <button
                            onClick={() => { removeFavorite(p) }}
                            className="p-1.5 rounded text-fg-ghost hover:text-red-400 hover:bg-red-400/10 opacity-0 group-hover:opacity-100 transition-all shrink-0"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── Git panel overlay ─────────────────────────────────────────────── */}
        {isGitRepo && rootDir && (
          <div className={cn(
            'absolute bottom-0 left-0 right-0 h-64 border-t border-hair bg-base z-10 flex flex-col transition-transform duration-200 ease-in-out',
            gitPanelOpen ? 'translate-y-0' : 'translate-y-full',
          )}>
            <div className="flex items-center gap-2 px-3 h-8 shrink-0 border-b border-hair">
              <GitBranch className="h-3 w-3 text-purple-400 shrink-0" />
              <span className="text-3xs font-sans text-purple-400 font-semibold">{gitBranch}</span>
              {gitChanges.length > 0 && (
                <span className="text-3xs font-sans px-1.5 rounded bg-yellow-500/10 text-yellow-400 font-bold">
                  {gitChanges.length} changed
                </span>
              )}
              <div className="flex-1" />
              <button onClick={() => { void loadGitStatus(rootDir) }} className="p-0.5 rounded hover:bg-hover text-fg-ghost hover:text-fg-primary transition-colors" title="Refresh">
                <RefreshCw className="h-2.5 w-2.5" />
              </button>
              <button onClick={() => { setGitPanelOpen(false) }} className="p-0.5 rounded hover:bg-hover text-fg-ghost hover:text-fg-primary transition-colors">
                <X className="h-3 w-3" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto min-h-0">
              {gitChanges.length === 0 ? (
                <p className="text-3xs font-sans text-fg-ghost/40 text-center py-8 uppercase tracking-widest">nothing to commit</p>
              ) : (
                gitChanges.map(ch => {
                  const fullPath = normalizePath(rootDir) + '/' + ch.path
                  const isStaged = stagedPaths.has(fullPath)
                  return (
                    <div
                      key={ch.path}
                      onClick={() => { toggleStaged(fullPath) }}
                      className={cn('flex items-center gap-2 px-3 py-1 text-3xs font-sans cursor-pointer hover:bg-hover/60 transition-colors', isStaged && 'bg-hover/30')}
                    >
                      <span className={cn('font-bold text-3xs w-3 shrink-0 text-center', GIT_COLORS[ch.code] ?? 'text-fg-ghost')}>{ch.code}</span>
                      <span className="truncate text-fg-secondary flex-1 min-w-0">{ch.path}</span>
                      {isStaged && <span className="text-3xs font-bold text-green-400 shrink-0">✓</span>}
                    </div>
                  )
                })
              )}
            </div>

            <div className="flex items-center gap-2 px-3 py-2 shrink-0 border-t border-hair">
              <input
                type="text"
                value={commitMsg}
                onChange={e => { setCommitMsg(e.target.value) }}
                onKeyDown={e => { if (e.key === 'Enter') void handleCommit() }}
                placeholder={stagedPaths.size > 0 ? `commit ${stagedPaths.size} file(s)…` : 'message (empty = stage all)…'}
                className="flex-1 min-w-0 bg-hover border border-hair rounded px-2 py-1 text-3xs font-sans text-fg-primary placeholder-fg-ghost/40 outline-none focus:border-purple-500/40 transition-colors"
              />
              <button
                onClick={() => { void handleCommit() }}
                disabled={commitState === 'busy' || gitChanges.length === 0}
                className={cn(
                  'flex items-center gap-1.5 px-2.5 py-1 rounded border text-3xs font-sans font-bold shrink-0 transition-all',
                  commitState === 'done'
                    ? 'bg-green-500/10 border-green-500/30 text-green-400'
                    : 'bg-purple-600 border-purple-500 text-white hover:bg-purple-700 disabled:opacity-40 disabled:cursor-not-allowed',
                )}
              >
                {commitState === 'done'
                  ? <><CheckCircle2 className="h-3 w-3" /><span>Done</span></>
                  : commitState === 'busy' ? <span>…</span>
                  : <><Save className="h-3 w-3" /><span>Commit</span></>}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
