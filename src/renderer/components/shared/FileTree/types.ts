import type { FsEntry } from '@shared/filesystem'
export type { FileTreeNode } from '@/hooks/use-file-tree'

export interface FileTreeProps {
  root: string | null
  onSelectFile?:   (entry: FsEntry) => void
  onSelectFolder?: (entry: FsEntry) => void
  onDelete?:       (entry: FsEntry) => Promise<void>
  onQuickie?:      (path: string, presetId: string) => void
  className?: string
  gitStatus?: Record<string, string>
}
