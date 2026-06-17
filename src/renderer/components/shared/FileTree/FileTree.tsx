import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { Tree, type NodeRendererProps } from 'react-arborist'
import { File, Folder, FolderOpen, AlertCircle, ChevronRight } from 'lucide-react'
import { cn } from '@/utils'
import { useFileTree } from '@/hooks/use-file-tree'
import type { FileTreeNode, FileTreeProps } from './types'
import type { FsEntry } from '@shared/filesystem'
import { filesystem } from '@shared/bridge'
import {
  ContextMenu, ContextMenuContent, ContextMenuItem,
  ContextMenuSeparator, ContextMenuTrigger,
  ContextMenuSub, ContextMenuSubTrigger, ContextMenuSubContent,
} from '@/ui/context-menu'
import { GIT_COLORS, normalizePath } from '@/utils/git'

// ── context ───────────────────────────────────────────────────────────────────

interface TreeCtx {
  loadChildren:   (node: FileTreeNode) => Promise<void>
  refresh:        () => void
  onSelectFile:   ((entry: FsEntry) => void) | undefined
  onSelectFolder: ((entry: FsEntry) => void) | undefined
  onDelete:       ((entry: FsEntry) => Promise<void>) | undefined
  onQuickie:      ((path: string, presetId: string) => void) | undefined
  gitStatus:      Record<string, string>
}

const TreeContext = createContext<TreeCtx | null>(null)

function useTreeContext(): TreeCtx {
  const ctx = useContext(TreeContext)
  if (!ctx) throw new Error('FileNode must be rendered inside FileTree')
  return ctx
}

const getFileIconColor = (filename: string) => {
  const ext = filename.split('.').pop()?.toLowerCase() ?? ''
  const colorMap: Record<string, string> = {
    tsx: "text-[#61dafb]",
    ts: "text-[#3178c6]",
    jsx: "text-[#61dafb]",
    js: "text-[#f7df1e]",
    css: "text-[#264de4]",
    json: "text-[#cb3837]",
    md: "text-muted-foreground",
    svg: "text-[#ffb13b]",
    png: "text-[#a1a1aa]",
    default: "text-muted-foreground",
  }
  return colorMap[ext] ?? colorMap['default']
}

// ── node renderer ─────────────────────────────────────────────────────────────

function FileNode({ node, style }: NodeRendererProps<FileTreeNode>) {
  const ctx = useTreeContext()

  const Icon = node.data.isDir
    ? (node.isOpen ? FolderOpen : Folder)
    : File

  const gitCode = ctx.gitStatus[normalizePath(node.data.entry.path)]
  const gitColor = gitCode ? (GIT_COLORS[gitCode] ?? '') : ''
  const fileColor = !node.data.isDir && !gitColor ? getFileIconColor(node.data.name) : ''

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (node.data.isDir) {
      void ctx.loadChildren(node.data)
      node.toggle()
      ctx.onSelectFolder?.(node.data.entry)
    } else {
      node.select()
      ctx.onSelectFile?.(node.data.entry)
    }
  }

  const copyPath = () => { void navigator.clipboard.writeText(node.data.entry.path) }
  const copyName = () => { void navigator.clipboard.writeText(node.data.name) }

  const reveal = () => {
    if (filesystem) void filesystem.revealInFileManager(node.data.entry.path)
  }

  const handleDelete = async () => {
    if (!filesystem) return
    if (node.data.isDir) {
      await filesystem.deleteDir(node.data.entry.path)
    } else {
      await filesystem.deleteFile(node.data.entry.path)
    }
    ctx.refresh()
    await ctx.onDelete?.(node.data.entry)
  }

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <div
          style={style}
          className={cn(
            'group flex items-center gap-1.5 px-2 py-0.5 rounded-sm cursor-pointer select-none',
            'transition-colors duration-200 ease-out hover:bg-hover',
            node.isSelected && 'bg-selected text-fg-primary',
          )}
          onClick={handleClick}
        >
          {/* Chevron for folders */}
          <div className="w-3 flex items-center justify-center shrink-0">
            {node.data.isDir && (
              <ChevronRight
                size={12}
                className={cn(
                  "text-fg-ghost transition-transform duration-200",
                  node.isOpen && "rotate-90"
                )}
              />
            )}
          </div>

          <Icon
            size={12}
            className={cn(
              'shrink-0 transition-transform duration-200 group-hover:scale-110',
              node.data.isDir ? 'text-fg-muted' : (gitColor || fileColor)
            )}
          />
          <span className={cn(
            'truncate text-[13px] transition-colors duration-200',
            gitColor || (node.isSelected ? 'text-fg-primary' : 'text-fg-secondary group-hover:text-fg-primary'),
          )}>
            {node.data.name}
          </span>
          {gitCode && !node.data.isDir && (
            <span className={cn('ml-auto text-3xs font-bold shrink-0', gitColor)}>
              {gitCode}
            </span>
          )}
        </div>
      </ContextMenuTrigger>
      <ContextMenuContent>
        <ContextMenuItem onClick={copyPath}>Copy path</ContextMenuItem>
        <ContextMenuItem onClick={copyName}>Copy name</ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem onClick={reveal}>Reveal in explorer</ContextMenuItem>
        {!node.data.isDir && ctx.onQuickie && (
          <>
            <ContextMenuSeparator />
            <ContextMenuSub>
              <ContextMenuSubTrigger>Ask Jules…</ContextMenuSubTrigger>
              <ContextMenuSubContent>
                <ContextMenuItem onClick={() => { ctx.onQuickie?.(node.data.entry.path, 'explain') }}>Explain this file</ContextMenuItem>
                <ContextMenuItem onClick={() => { ctx.onQuickie?.(node.data.entry.path, 'review') }}>Review for issues</ContextMenuItem>
                <ContextMenuItem onClick={() => { ctx.onQuickie?.(node.data.entry.path, 'improve') }}>Suggest improvements</ContextMenuItem>
              </ContextMenuSubContent>
            </ContextMenuSub>
          </>
        )}
        {!node.data.isDir && (
          <>
            <ContextMenuSeparator />
            <ContextMenuItem variant="destructive" onClick={() => { void handleDelete() }}>
              Delete
            </ContextMenuItem>
          </>
        )}
      </ContextMenuContent>
    </ContextMenu>
  )
}

// ── component ─────────────────────────────────────────────────────────────────

export function FileTree({ root, onSelectFile, onSelectFolder, onDelete, onQuickie, className, gitStatus = {} }: FileTreeProps) {
  const { nodes, error, loadChildren, refresh } = useFileTree(root)
  const containerRef = useRef<HTMLDivElement>(null)
  const [height, setHeight] = useState<number | null>(null)

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const ro = new ResizeObserver(entries => {
      const entry = entries[0]
      if (entry) setHeight(entry.contentRect.height)
    })
    ro.observe(el)
    return () => { ro.disconnect() }
  }, [])

  const onDeleteWrapped = useCallback(async (entry: FsEntry) => {
    await onDelete?.(entry)
  }, [onDelete])

  const ctx = useMemo<TreeCtx>(
    () => ({ loadChildren, refresh, onSelectFile, onSelectFolder, onDelete: onDeleteWrapped, onQuickie, gitStatus }),
    [loadChildren, refresh, onSelectFile, onSelectFolder, onDeleteWrapped, onQuickie, gitStatus],
  )

  return (
    <TreeContext.Provider value={ctx}>
      <div className={cn('flex flex-col h-full', className)}>
        <div ref={containerRef} className="flex-1 overflow-hidden">
          {error ? (
            <div className="flex items-center gap-2 px-3 pt-4 text-destructive">
              <AlertCircle size={12} className="shrink-0" />
              <span className="text-3xs font-mono truncate">{error}</span>
            </div>
          ) : height !== null && nodes.length > 0 ? (
            <Tree
              data={nodes}
              idAccessor="id"
              childrenAccessor="children"
              openByDefault={false}
              rowHeight={24}
              indent={12}
              height={height}
              width="100%"
              disableDrag
              disableDrop
            >
              {FileNode}
            </Tree>
          ) : null}
        </div>
      </div>
    </TreeContext.Provider>
  )
}
