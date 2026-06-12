import { useState, useCallback, useEffect, useRef } from 'react'
import { filesystem } from '@shared/bridge'
import type { FsEntry } from '@shared/filesystem'

export interface FileTreeNode {
  id: string
  name: string
  isDir: boolean
  entry: FsEntry
  children: FileTreeNode[] | null
  loaded: boolean
}

function entryToNode(entry: FsEntry): FileTreeNode {
  return {
    id:       entry.path,
    name:     entry.name,
    isDir:    entry.isDir,
    entry,
    children: entry.isDir ? [] : null,
    loaded:   false,
  }
}

function insertChildren(nodes: FileTreeNode[], id: string, children: FileTreeNode[]): FileTreeNode[] {
  return nodes.map(n => {
    if (n.id === id) return { ...n, children, loaded: true }
    if (n.children?.length) return { ...n, children: insertChildren(n.children, id, children) }
    return n
  })
}

export function useFileTree(root: string | null) {
  const [nodes, setNodes] = useState<FileTreeNode[]>([])
  const [error, setError] = useState<string | null>(null)
  const [rev, setRev] = useState(0)
  const cancelRef = useRef<(() => void) | null>(null)

  const loadDir = useCallback(async (dir: string): Promise<FileTreeNode[]> => {
    if (!filesystem) return []
    const entries = await filesystem.readdir(dir)
    return entries.map(entryToNode)
  }, [])

  const refresh = useCallback(() => { setRev(r => r + 1) }, [])

  useEffect(() => {
    cancelRef.current?.()
    if (!root) return
    let cancelled = false
    cancelRef.current = () => { cancelled = true }
    loadDir(root).then(
      result => { if (!cancelled) setNodes(result) },
      (err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load directory')
      },
    )
    return () => { cancelled = true }
  }, [root, loadDir, rev])

  const loadChildren = useCallback(async (node: FileTreeNode) => {
    if (node.loaded || !node.isDir) return
    try {
      const children = await loadDir(node.id)
      setNodes(prev => insertChildren(prev, node.id, children))
    } catch {
      setNodes(prev => insertChildren(prev, node.id, []))
    }
  }, [loadDir])

  return { nodes: root ? nodes : [], error, loadChildren, refresh }
}
