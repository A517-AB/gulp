import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import type { editor } from 'monaco-editor'
import {
  FolderOpen, Save, X, GitBranch,
  RefreshCw, ChevronUp, ChevronDown, Plus, CheckCircle2,
} from 'lucide-react'
import { FileTree } from '@/components/shared/FileTree'
import { CodeEditor } from '@/ui/code-editor'
import { filesystem, git } from '@shared/bridge'
import { cn } from '@/utils'

// ── constants ──────────────────────────────────────────────────────────────────

const LANG_MAP: Record<string, string> = {
  py: 'python', ts: 'typescript', tsx: 'typescript',
  js: 'javascript', jsx: 'javascript', sh: 'shell',
  json: 'json', md: 'markdown', html: 'html', css: 'css',
  yaml: 'yaml', yml: 'yaml', rs: 'rust', go: 'go',
  rb: 'ruby', php: 'php', java: 'java', cs: 'csharp',
  cpp: 'cpp', c: 'c', kt: 'kotlin', swift: 'swift',
  toml: 'ini', env: 'ini', sql: 'sql', graphql: 'graphql',
}

const GIT_COLORS: Record<string, string> = {
  M: 'text-yellow-400', A: 'text-green-400',
  D: 'text-red-400', '?': 'text-cyan-400/80', U: 'text-red-500',
}

const normalize = (p: string) => p.replace(/\\/g, '/')

function langFor(path: string): string {
  return LANG_MAP[path.split('.').pop()?.toLowerCase() ?? ''] ?? 'plaintext'
}

// ── types ──────────────────────────────────────────────────────────────────────

interface Tab {
  path: string
  savedContent: string
}

interface GitChange {
  path: string
  code: string
}

// ── component ──────────────────────────────────────────────────────────────────

export function ExplorerPage() {
  const [rootDir, setRootDir] = useState<string | null>(() =>
    localStorage.getItem('workspace:explorer:root'),
  )
  const [tabs, setTabs] = useState<Tab[]>([])
  const [activeTabPath, setActiveTabPath] = useState<string | null>(null)
  const [dirtyPaths, setDirtyPaths] = useState<Set<string>>(new Set())

  // git
  const [isGitRepo, setIsGitRepo] = useState(false)
  const [gitBranch, setGitBranch] = useState('')
  const [gitChanges, setGitChanges] = useState<GitChange[]>([])
  const [gitPanelOpen, setGitPanelOpen] = useState(false)
  const [commitMsg, setCommitMsg] = useState('')
  const [commitState, setCommitState] = useState<'idle' | 'busy' | 'done'>('idle')
  const [stagedPaths, setStagedPaths] = useState<Set<string>>(new Set())

  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null)
  const activeSavedRef = useRef('')

  useEffect(() => {
    const tab = tabs.find(t => t.path === activeTabPath)
    activeSavedRef.current = tab?.savedContent ?? ''
  }, [tabs, activeTabPath])

  useEffect(() => {
    if (rootDir) localStorage.setItem('workspace:explorer:root', rootDir)
    else localStorage.removeItem('workspace:explorer:root')
  }, [rootDir])

  // ── git ────────────────────────────────────────────────────────────────────

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

      if (statusRes.ok) {
        const changes: GitChange[] = statusRes.stdout
          .split('\n')
          .filter(Boolean)
          .map(line => {
            const xy = line.slice(0, 2)
            const filePart = line.slice(3).trim()
            const path = filePart.includes(' -> ') ? (filePart.split(' -> ')[1] ?? filePart) : filePart
            let code = '?'
            if (xy === '??') code = '?'
            else if (xy.includes('U') || xy === 'AA' || xy === 'DD') code = 'U'
            else if (xy.startsWith('D') || xy.endsWith('D')) code = 'D'
            else if (xy.startsWith('A') || xy.endsWith('A')) code = 'A'
            else if (xy.startsWith('M') || xy.endsWith('M') || xy.startsWith('R')) code = 'M'
            return { path, code }
          })
        setGitChanges(changes)
      }
    } catch {
      setIsGitRepo(false)
    }
  }, [])

  useEffect(() => {
    if (!rootDir) return
    const run = async () => { await loadGitStatus(rootDir) }
    void run()
  }, [rootDir, loadGitStatus])

  const gitStatusMap = useMemo(() => {
    if (!rootDir) return {}
    const map: Record<string, string> = {}
    for (const ch of gitChanges) {
      map[normalize(rootDir) + '/' + ch.path] = ch.code
    }
    return map
  }, [gitChanges, rootDir])

  // ── file ops ───────────────────────────────────────────────────────────────

  const handleSelectFolder = useCallback(async () => {
    if (!filesystem) return
    const path = await filesystem.showOpenDialog()
    if (!path) return
    setRootDir(path)
    setTabs([])
    setActiveTabPath(null)
    setDirtyPaths(new Set())
    setGitChanges([])
    setIsGitRepo(false)
    setStagedPaths(new Set())
  }, [])

  const handleSelectFile = useCallback(async (filePath: string) => {
    if (!filesystem) return
    if (tabs.some(t => t.path === filePath)) {
      setActiveTabPath(filePath)
      return
    }
    try {
      const content = await filesystem.readFile(filePath)
      setTabs(prev => [...prev, { path: filePath, savedContent: content }])
      setActiveTabPath(filePath)
    } catch (err) {
      console.error('[Explorer] read failed:', err)
    }
  }, [tabs])

  const closeTab = useCallback((filePath: string) => {
    const idx = tabs.findIndex(t => t.path === filePath)
    const next = tabs.filter(t => t.path !== filePath)
    setTabs(next)
    if (activeTabPath === filePath) {
      setActiveTabPath(next[idx]?.path ?? next[Math.max(0, idx - 1)]?.path ?? null)
    }
    setDirtyPaths(prev => { const s = new Set(prev); s.delete(filePath); return s })
  }, [tabs, activeTabPath])

  const handleSaveFile = useCallback(async () => {
    if (!filesystem || !activeTabPath) return
    const content = editorRef.current?.getValue() ?? ''
    try {
      await filesystem.writeFile(activeTabPath, content)
      setTabs(prev => prev.map(t => t.path === activeTabPath ? { ...t, savedContent: content } : t))
      setDirtyPaths(prev => { const s = new Set(prev); s.delete(activeTabPath); return s })
      if (rootDir) void loadGitStatus(rootDir)
    } catch (err) {
      console.error('[Explorer] save failed:', err)
    }
  }, [activeTabPath, rootDir, loadGitStatus])

  const handleNewFile = useCallback(async () => {
    if (!filesystem || !rootDir) return
    const savePath = await filesystem.showSaveDialog('untitled.ts')
    if (!savePath) return
    try {
      await filesystem.writeFile(savePath, '')
      setTabs(prev => [...prev, { path: savePath, savedContent: '' }])
      setActiveTabPath(savePath)
    } catch (err) {
      console.error('[Explorer] new file failed:', err)
    }
  }, [rootDir])

  const handleEditorChange = useCallback((value: string | undefined) => {
    if (!activeTabPath) return
    const isDirty = value !== activeSavedRef.current
    setDirtyPaths(prev => {
      const s = new Set(prev)
      if (isDirty) { s.add(activeTabPath) } else { s.delete(activeTabPath) }
      return s
    })
  }, [activeTabPath])

  // ── git ops ────────────────────────────────────────────────────────────────

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
        ? [...stagedPaths].map(p => normalize(p).replace(normalize(rootDir) + '/', ''))
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

  // ── keyboard ───────────────────────────────────────────────────────────────

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey)) return
      if (e.key === 's') { e.preventDefault(); void handleSaveFile() }
      if (e.key === 'w') { e.preventDefault(); if (activeTabPath) closeTab(activeTabPath) }
    }
    window.addEventListener('keydown', onKey)
    return () => { window.removeEventListener('keydown', onKey) }
  }, [handleSaveFile, closeTab, activeTabPath])

  // ── derived ────────────────────────────────────────────────────────────────

  const activeTab = tabs.find(t => t.path === activeTabPath)

  return (
    <div className="flex flex-row h-full overflow-hidden w-full text-fg-primary bg-base">

      {/* ── Sidebar ─────────────────────────────────────────────────────────── */}
      <div className="w-52 flex flex-col h-full overflow-hidden shrink-0 border-r border-hair">

        {/* Sidebar header */}
        <div className="flex items-center gap-1 px-2 h-9 shrink-0 border-b border-hair">
          <button
            onClick={() => { void handleSelectFolder() }}
            className="flex items-center gap-1.5 min-w-0 flex-1 hover:text-fg-primary transition-colors group"
            title={rootDir ?? 'Open folder'}
          >
            <FolderOpen className="h-3 w-3 text-fg-ghost shrink-0 group-hover:text-fg-muted" />
            <span className="text-[10px] font-mono text-fg-ghost truncate group-hover:text-fg-muted">
              {rootDir ? rootDir.split(/[\\/]/).pop() : 'open folder'}
            </span>
          </button>
          {rootDir && (
            <div className="flex items-center shrink-0">
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
        <div className="flex-1 overflow-hidden py-1">
          {rootDir && (
            <FileTree
              root={rootDir}
              gitStatus={gitStatusMap}
              onSelectFile={(entry) => { void handleSelectFile(entry.path) }}
            />
          )}
        </div>

        {/* Git branch indicator in sidebar footer */}
        {isGitRepo && gitBranch && (
          <div className="flex items-center gap-1.5 px-2 py-1.5 border-t border-hair shrink-0">
            <GitBranch className="h-2.5 w-2.5 text-purple-400 shrink-0" />
            <span className="text-[9px] font-mono text-purple-400 truncate">{gitBranch}</span>
            {gitChanges.length > 0 && (
              <span className="ml-auto text-[9px] font-bold font-mono px-1 rounded bg-yellow-500/10 text-yellow-400 shrink-0">
                {gitChanges.length}
              </span>
            )}
          </div>
        )}
      </div>

      {/* ── Main ────────────────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col h-full overflow-hidden min-w-0">

        {/* Tab bar */}
        {tabs.length > 0 && (
          <div className="flex items-stretch h-9 border-b border-hair overflow-x-auto shrink-0 bg-base scrollbar-none">
            {tabs.map(tab => {
              const name = tab.path.split(/[\\/]/).pop() ?? tab.path
              const isActive = tab.path === activeTabPath
              const isDirty = dirtyPaths.has(tab.path)
              const gitCode = gitStatusMap[normalize(tab.path)]
              return (
                <button
                  key={tab.path}
                  onClick={() => { setActiveTabPath(tab.path) }}
                  title={tab.path}
                  className={cn(
                    'flex items-center gap-1.5 px-3 h-full border-r border-hair text-[10px] font-mono shrink-0 transition-colors group/tab select-none',
                    isActive ? 'bg-hover text-fg-primary' : 'text-fg-ghost hover:text-fg-secondary hover:bg-hover/40',
                  )}
                >
                  {isDirty && <span className="h-1.5 w-1.5 rounded-full bg-yellow-400 shrink-0" />}
                  <span className={cn('truncate max-w-[100px]', gitCode ? GIT_COLORS[gitCode] : '')}>
                    {name}
                  </span>
                  <span
                    role="button"
                    onClick={(e) => { e.stopPropagation(); closeTab(tab.path) }}
                    className="ml-0.5 p-0.5 rounded hover:bg-active text-fg-ghost hover:text-fg-primary opacity-0 group-hover/tab:opacity-100 transition-all shrink-0"
                  >
                    <X className="h-2.5 w-2.5" />
                  </span>
                </button>
              )
            })}
          </div>
        )}

        {/* Editor */}
        <div className="flex-1 overflow-hidden">
          {activeTab ? (
            <CodeEditor
              {...(activeTabPath ? { path: activeTabPath } : {})}
              defaultValue={activeTab.savedContent}
              language={langFor(activeTab.path)}
              onMount={(ed) => { editorRef.current = ed }}
              onChange={handleEditorChange}
              options={{ lineNumbers: 'on' }}
              containerClassName="rounded-none border-none border-0"
            />
          ) : (
            <div className="flex flex-col items-center justify-center h-full gap-3 select-none">
              <span className="text-[10px] font-mono text-fg-ghost/30 uppercase tracking-widest">
                {rootDir ? 'select a file' : 'open a folder to start'}
              </span>
              {!rootDir && (
                <button
                  onClick={() => { void handleSelectFolder() }}
                  className="flex items-center gap-2 px-3 py-1.5 rounded border border-hair text-[10px] font-mono text-fg-ghost hover:text-fg-primary hover:border-subtle transition-colors"
                >
                  <FolderOpen className="h-3 w-3" />
                  Open folder
                </button>
              )}
            </div>
          )}
        </div>

        {/* ── Git panel ─────────────────────────────────────────────────────── */}
        {isGitRepo && rootDir && (
          <div className={cn('border-t border-hair shrink-0 overflow-hidden transition-all duration-200', gitPanelOpen ? 'h-64' : 'h-8')}>

            {/* Panel header — always visible */}
            <div className="flex items-center gap-2 px-3 h-8 shrink-0">
              <GitBranch className="h-3 w-3 text-purple-400 shrink-0" />
              <span className="text-[10px] font-mono text-purple-400 font-semibold">{gitBranch}</span>
              {gitChanges.length > 0 && (
                <span className="text-[9px] font-mono px-1.5 rounded bg-yellow-500/10 text-yellow-400 font-bold">
                  {gitChanges.length} changed
                </span>
              )}
              <div className="flex-1" />
              <button
                onClick={() => { void loadGitStatus(rootDir) }}
                className="p-0.5 rounded hover:bg-hover text-fg-ghost hover:text-fg-primary transition-colors"
                title="Refresh git status"
              >
                <RefreshCw className="h-2.5 w-2.5" />
              </button>
              <button
                onClick={() => { setGitPanelOpen(v => !v) }}
                className="p-0.5 rounded hover:bg-hover text-fg-ghost hover:text-fg-primary transition-colors"
              >
                {gitPanelOpen
                  ? <ChevronDown className="h-3 w-3" />
                  : <ChevronUp className="h-3 w-3" />}
              </button>
            </div>

            {/* Panel body */}
            {gitPanelOpen && (
              <div className="flex flex-col gap-2 px-3 pb-3 h-56 overflow-hidden">

                {/* Changed files */}
                <div className="flex-1 overflow-y-auto rounded border border-hair bg-base/40 min-h-0">
                  {gitChanges.length === 0 ? (
                    <p className="text-[10px] font-mono text-fg-ghost/40 text-center py-8 uppercase tracking-widest">
                      nothing to commit
                    </p>
                  ) : (
                    gitChanges.map(ch => {
                      const fullPath = normalize(rootDir) + '/' + ch.path
                      const isStaged = stagedPaths.has(fullPath)
                      return (
                        <div
                          key={ch.path}
                          onClick={() => { toggleStaged(fullPath) }}
                          className={cn(
                            'flex items-center gap-2 px-3 py-1 text-[10px] font-mono cursor-pointer hover:bg-hover/60 transition-colors',
                            isStaged && 'bg-hover/30',
                          )}
                        >
                          <span className={cn('font-bold text-[9px] w-3 shrink-0 text-center', GIT_COLORS[ch.code] ?? 'text-fg-ghost')}>
                            {ch.code}
                          </span>
                          <span className="truncate text-fg-secondary flex-1 min-w-0">{ch.path}</span>
                          {isStaged && (
                            <span className="text-[9px] font-bold text-green-400 shrink-0">✓</span>
                          )}
                        </div>
                      )
                    })
                  )}
                </div>

                {/* Commit row */}
                <div className="flex items-center gap-2 shrink-0">
                  <input
                    type="text"
                    value={commitMsg}
                    onChange={e => { setCommitMsg(e.target.value) }}
                    onKeyDown={e => { if (e.key === 'Enter') void handleCommit() }}
                    placeholder={
                      stagedPaths.size > 0
                        ? `commit ${stagedPaths.size} file(s)…`
                        : 'message (empty = stage all)…'
                    }
                    className="flex-1 min-w-0 bg-hover border border-hair rounded px-2 py-1 text-[10px] font-mono text-fg-primary placeholder-fg-ghost/40 outline-none focus:border-purple-500/40 transition-colors"
                  />
                  <button
                    onClick={() => { void handleCommit() }}
                    disabled={commitState === 'busy' || gitChanges.length === 0}
                    className={cn(
                      'flex items-center gap-1.5 px-2.5 py-1 rounded border text-[10px] font-mono font-bold shrink-0 transition-all',
                      commitState === 'done'
                        ? 'bg-green-500/10 border-green-500/30 text-green-400'
                        : 'bg-purple-600 border-purple-500 text-white hover:bg-purple-700 disabled:opacity-40 disabled:cursor-not-allowed',
                    )}
                  >
                    {commitState === 'done'
                      ? <><CheckCircle2 className="h-3 w-3" /><span>Done</span></>
                      : commitState === 'busy'
                        ? <span>…</span>
                        : <><Save className="h-3 w-3" /><span>Commit</span></>}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
