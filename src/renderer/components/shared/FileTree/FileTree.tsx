import { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { Tree, type NodeRendererProps } from 'react-arborist'
import { Folder, FolderOpen, File, AlertCircle } from 'lucide-react'
import { cn } from '@/utils'
import { useFileTree } from '@/hooks/use-file-tree'
import type { FileTreeNode, FileTreeProps } from './types'
import type { FsEntry } from '@shared/filesystem'

// ── context ───────────────────────────────────────────────────────────────────

interface TreeCtx {
  loadChildren:   (node: FileTreeNode) => Promise<void>
  onSelectFile:   ((entry: FsEntry) => void) | undefined
  onSelectFolder: ((entry: FsEntry) => void) | undefined
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

  return (
    <div
      style={style}
      className={cn(
        'flex items-center gap-1.5 px-2 rounded-sm cursor-pointer select-none',
        'hover:bg-hover hover:text-fg-primary transition-colors',
        node.isSelected && 'bg-selected text-fg-primary',
      )}
      onClick={handleClick}
    >
      <Icon
        size={13}
        className={cn('shrink-0', node.data.isDir ? 'text-fg-secondary' : 'text-fg-muted')}
      />
      <span className="truncate text-xs text-fg-secondary">{node.data.name}</span>
    </div>
  )
}

// ── component ─────────────────────────────────────────────────────────────────

export function FileTree({ root, onSelectFile, onSelectFolder, className }: FileTreeProps) {
  const { nodes, error, loadChildren } = useFileTree(root)
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

  const ctx = useMemo<TreeCtx>(
    () => ({ loadChildren, onSelectFile, onSelectFolder }),
    [loadChildren, onSelectFile, onSelectFolder],
  )

  return (
    <TreeContext.Provider value={ctx}>
      <div className={cn('flex flex-col h-full', className)}>
        <div ref={containerRef} className="flex-1 overflow-hidden">
          {error ? (
            <div className="flex items-center gap-2 px-3 pt-4 text-destructive">
              <AlertCircle size={13} className="shrink-0" />
              <span className="text-xs truncate">{error}</span>
            </div>
          ) : height !== null && nodes.length > 0 ? (
            <Tree
              data={nodes}
              idAccessor="id"
              childrenAccessor="children"
              openByDefault={false}
              rowHeight={24}
              indent={14}
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
