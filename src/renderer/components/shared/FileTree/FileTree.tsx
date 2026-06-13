import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { Tree, type NodeRendererProps } from 'react-arborist'
import { File, Folder, FolderOpen, AlertCircle } from 'lucide-react'
import { cn } from '@/utils'
import { useFileTree } from '@/hooks/use-file-tree'
import type { FileTreeNode, FileTreeProps } from './types'
import type { FsEntry } from '@shared/filesystem'
import { filesystem } from '@shared/bridge'
import {
  ContextMenu, ContextMenuContent, ContextMenuItem,
  ContextMenuSeparator, ContextMenuTrigger,
} from '@/ui/context-menu'

// ── context ───────────────────────────────────────────────────────────────────

interface TreeCtx {
  loadChildren:   (node: FileTreeNode) => Promise<void>
  refresh:        () => void
  onSelectFile:   ((entry: FsEntry) => void) | undefined
  onSelectFolder: ((entry: FsEntry) => void) | undefined
  onDelete:       ((entry: FsEntry) => Promise<void>) | undefined
}

const TreeContext = createContext<TreeCtx | null>(null)

function useTreeContext(): TreeCtx {
  const ctx = useContext(TreeContext)
  if (!ctx) throw new Error('FileNode must be rendered inside FileTree')
  return ctx
}

// ── node renderer ─────────────────────────────────────────────────────────────

function FileNode({ node, style }: NodeRendererProps<FileTreeNode>) {
  const ctx = useTreeContext()

  const Icon = node.data.isDir
    ? (node.isOpen ? FolderOpen : Folder)
    : File

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
            'flex items-center gap-1.5 px-2 rounded-sm cursor-pointer select-none',
            'hover:bg-hover transition-colors',
            node.isSelected && 'bg-selected text-fg-primary',
          )}
          onClick={handleClick}
        >
          <Icon
            size={12}
            className={cn('shrink-0', node.data.isDir ? 'text-fg-muted' : 'text-fg-ghost')}
          />
          <span className={cn(
            'truncate text-[11px] font-mono',
            node.isSelected ? 'text-fg-primary' : 'text-fg-secondary',
          )}>
            {node.data.name}
          </span>
        </div>
      </ContextMenuTrigger>
      <ContextMenuContent>
        <ContextMenuItem onClick={copyPath}>Copy path</ContextMenuItem>
        <ContextMenuItem onClick={copyName}>Copy name</ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem onClick={reveal}>Reveal in explorer</ContextMenuItem>
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

export function FileTree({ root, onSelectFile, onSelectFolder, onDelete, className }: FileTreeProps) {
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
    () => ({ loadChildren, refresh, onSelectFile, onSelectFolder, onDelete: onDeleteWrapped }),
    [loadChildren, refresh, onSelectFile, onSelectFolder, onDeleteWrapped],
  )

  return (
    <TreeContext.Provider value={ctx}>
      <div className={cn('flex flex-col h-full', className)}>
        <div ref={containerRef} className="flex-1 overflow-hidden">
          {error ? (
            <div className="flex items-center gap-2 px-3 pt-4 text-destructive">
              <AlertCircle size={12} className="shrink-0" />
              <span className="text-[11px] font-mono truncate">{error}</span>
            </div>
          ) : height !== null && nodes.length > 0 ? (
            <Tree
              data={nodes}
              idAccessor="id"
              childrenAccessor="children"
              openByDefault={false}
              rowHeight={22}
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
