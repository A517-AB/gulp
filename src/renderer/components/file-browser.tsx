import { useState, useEffect } from 'react'
import { Folder, FolderOpen, FileText, ChevronRight, ChevronDown, Copy, Check, FolderSearch } from 'lucide-react'
import { filesystem } from '@/shared/bridge'
import { cn } from '@/utils'

type FsEntry = { name: string; isDir: boolean }

function joinPath(parent: string, name: string): string {
  const sep = parent.includes('\\') ? '\\' : '/'
  return parent.replace(/[/\\]+$/, '') + sep + name
}

const ICON_COLOR: Record<string, string> = {
  ts: 'text-blue-400', tsx: 'text-blue-400', js: 'text-yellow-400', jsx: 'text-yellow-400',
  json: 'text-emerald-400', md: 'text-purple-400', css: 'text-pink-400', html: 'text-orange-400',
  py: 'text-green-400', rs: 'text-orange-500', go: 'text-cyan-400', sh: 'text-green-300',
}

function fileColor(name: string): string {
  const ext = name.slice(name.lastIndexOf('.') + 1).toLowerCase()
  return ICON_COLOR[ext] ?? 'text-fg-ghost'
}

interface TreeNodeProps {
  path: string
  name: string
  isDir: boolean
  depth: number
  selected: string | null
  onSelect: (path: string, isDir: boolean) => void
}

function TreeNode({ path, name, isDir, depth, selected, onSelect }: TreeNodeProps) {
  const [open, setOpen]         = useState(false)
  const [children, setChildren] = useState<FsEntry[] | null>(null)
  const [loading, setLoading]   = useState(false)

  async function toggle() {
    if (!isDir) { onSelect(path, false); return }
    onSelect(path, true)
    if (!open && children === null) {
      setLoading(true)
      try {
        const entries = await filesystem!.readdir(path)
        setChildren(entries)
      } catch { setChildren([]) }
      finally { setLoading(false) }
    }
    setOpen(o => !o)
  }

  const isSelected = selected === path

  return (
    <div>
      <button
        type="button"
        onClick={toggle}
        style={{ paddingLeft: `${depth * 14 + 8}px` }}
        className={cn(
          'w-full flex items-center gap-1.5 py-[3px] pr-2 text-left text-[11px] transition-colors rounded-sm',
          isSelected
            ? 'bg-selected text-fg-primary'
            : 'text-fg-muted hover:text-fg-primary hover:bg-hover',
        )}
      >
        {isDir ? (
          loading
            ? <span className="size-[10px] rounded-full border border-fg-ghost border-t-transparent animate-spin shrink-0" />
            : open
              ? <ChevronDown size={10} className="shrink-0 text-fg-dim" />
              : <ChevronRight size={10} className="shrink-0 text-fg-dim" />
        ) : (
          <span className="w-2.5 shrink-0" />
        )}

        {isDir
          ? open
            ? <FolderOpen size={12} className="shrink-0 text-amber-400" />
            : <Folder     size={12} className="shrink-0 text-amber-400" />
          : <FileText size={12} className={cn('shrink-0', fileColor(name))} />
        }

        <span className="truncate font-mono">{name}</span>
      </button>

      {isDir && open && children?.map(child => (
        <TreeNode
          key={child.name}
          path={joinPath(path, child.name)}
          name={child.name}
          isDir={child.isDir}
          depth={depth + 1}
          selected={selected}
          onSelect={onSelect}
        />
      ))}

      {isDir && open && children?.length === 0 && (
        <div
          style={{ paddingLeft: `${(depth + 1) * 14 + 8}px` }}
          className="py-1 text-[10px] text-fg-ghost italic"
        >
          Empty
        </div>
      )}
    </div>
  )
}

interface FileBrowserProps {
  rootDir: string
}

export function FileBrowser({ rootDir }: FileBrowserProps) {
  const [rootEntries, setRootEntries] = useState<FsEntry[] | null>(null)
  const [fsError, setFsError]         = useState<string | null>(null)
  const [selected, setSelected]       = useState<string | null>(null)
  const [fileContent, setFileContent] = useState<string | null>(null)
  const [loadingFile, setLoadingFile] = useState(false)
  const [copied, setCopied]           = useState(false)

  useEffect(() => {
    if (!rootDir || !filesystem) return
    setRootEntries(null)
    setFsError(null)
    setSelected(null)
    setFileContent(null)
    filesystem.readdir(rootDir)
      .then(entries => setRootEntries(entries))
      .catch(err => setFsError(String(err)))
  }, [rootDir])

  async function onSelect(path: string, isDir: boolean) {
    setSelected(path)
    if (isDir) { setFileContent(null); return }
    setLoadingFile(true)
    setFileContent(null)
    try {
      const content = await filesystem!.readFile(path)
      setFileContent(content)
    } catch (err) {
      setFileContent(`Error reading file:\n${String(err)}`)
    } finally {
      setLoadingFile(false)
    }
  }

  async function copyContent() {
    if (!fileContent) return
    await navigator.clipboard.writeText(fileContent)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  if (!filesystem) return null

  return (
    <div className="flex h-full overflow-hidden">
      {/* ── Tree ── */}
      <div className="w-44 shrink-0 border-r border-hair overflow-y-auto py-1 bg-surface/20">
        {fsError && (
          <p className="px-3 py-2 text-[10px] text-red-400 break-all">{fsError}</p>
        )}
        {rootEntries === null && !fsError && (
          <div className="flex items-center gap-2 px-3 py-2">
            <span className="size-3 rounded-full border border-fg-ghost border-t-transparent animate-spin shrink-0" />
            <span className="text-[10px] text-fg-ghost">Loading…</span>
          </div>
        )}
        {rootEntries?.map(entry => (
          <TreeNode
            key={entry.name}
            path={joinPath(rootDir, entry.name)}
            name={entry.name}
            isDir={entry.isDir}
            depth={0}
            selected={selected}
            onSelect={onSelect}
          />
        ))}
      </div>

      {/* ── Content ── */}
      <div className="flex-1 overflow-hidden flex flex-col min-w-0">
        {loadingFile && (
          <div className="flex-1 flex items-center justify-center">
            <span className="size-4 rounded-full border border-fg-ghost border-t-transparent animate-spin" />
          </div>
        )}

        {!loadingFile && fileContent !== null && (
          <>
            <div className="shrink-0 flex items-center justify-between px-3 py-1.5 border-b border-hair bg-surface/30">
              <span className="text-[10px] font-mono text-fg-dim truncate min-w-0">{selected}</span>
              <button
                type="button"
                onClick={copyContent}
                className="shrink-0 flex items-center gap-1 ml-2 text-[10px] text-fg-ghost hover:text-fg-primary transition-colors"
              >
                {copied ? <Check size={10} className="text-emerald-400" /> : <Copy size={10} />}
                Copy
              </button>
            </div>
            <pre className="flex-1 overflow-auto p-3 text-[11px] font-mono text-fg-primary leading-relaxed whitespace-pre break-all">
              {fileContent}
            </pre>
          </>
        )}

        {!loadingFile && fileContent === null && (
          <div className="flex-1 flex flex-col items-center justify-center gap-2">
            <FolderSearch size={20} className="text-fg-ghost" />
            <p className="text-[10px] text-fg-ghost">Select a file to preview</p>
          </div>
        )}
      </div>
    </div>
  )
}
