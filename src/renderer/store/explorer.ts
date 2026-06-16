// Explorer page store — workspace file tree, git status cache, editor tabs. NOT for Sync or Ship.
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface GitChange {
  path: string
  code: string
}

interface ExplorerState {
  gitCache: Record<string, GitChange[]>
  setGitCache: (rootDir: string, changes: GitChange[]) => void
  clearGitCache: (rootDir: string) => void
}

export const useExplorerStore = create<ExplorerState>()(persist(
  (set) => ({
    gitCache: {},
    setGitCache: (rootDir, changes) =>
      set(s => ({ gitCache: { ...s.gitCache, [rootDir]: changes } })),
    clearGitCache: (rootDir) =>
      set(s => ({
        gitCache: Object.fromEntries(Object.entries(s.gitCache).filter(([k]) => k !== rootDir)),
      })),
  }),
  { name: 'explorer-store', partialize: (s) => ({ gitCache: s.gitCache }) },
))
