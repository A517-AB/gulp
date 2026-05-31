import { useState, useCallback, useEffect } from 'react'
import { filesystem } from '@shared'
import type { FsEntry } from '@shared'

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
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadDir = useCallback(async (dir: string): Promise<FileTreeNode[]> => {
    if (!filesystem) return []
    const entries = await filesystem.readdir(dir)
    return entries.map(entryToNode)
  }, [])

  const refresh = useCallback(async () => {
    if (!root) return
    setLoading(true)
    setError(null)
    try {
      setNodes(await loadDir(root))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load directory')
    } finally {
      setLoading(false)
    }
  }, [root, loadDir])

  useEffect(() => { void refresh() }, [refresh])

  const loadChildren = useCallback(async (node: FileTreeNode) => {
    if (node.loaded || !node.isDir) return
    try {
      const children = await loadDir(node.id)
      setNodes(prev => insertChildren(prev, node.id, children))
    } catch {
      // folder unreadable — mark loaded with empty children so we don't retry
      setNodes(prev => insertChildren(prev, node.id, []))
    }
  }, [loadDir])

  return { nodes, loading, error, loadChildren, refresh }
}
