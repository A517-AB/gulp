import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { GitChange } from '@/utils/git'

interface ExplorerState {
  rootDir: string | null
  favoritePaths: string[]
  openPaths: string[]
  activePath: string | null
  gitCache: Record<string, GitChange[]>
  
  setRootDir: (dir: string | null) => void
  addFavorite: (path: string) => void
  removeFavorite: (path: string) => void
  setOpenPaths: (paths: string[]) => void
  setActivePath: (path: string | null) => void
  setGitCache: (rootDir: string, changes: GitChange[]) => void
  clearGitCache: (rootDir: string) => void
}

export const useExplorerStore = create<ExplorerState>()(persist(
  (set) => ({
    rootDir: null,
    favoritePaths: [],
    openPaths: [],
    activePath: null,
    gitCache: {},
    
    setRootDir: (rootDir) => set({ rootDir }),
    addFavorite: (path) => set(s => ({ favoritePaths: [...new Set([...s.favoritePaths, path])] })),
    removeFavorite: (path) => set(s => ({ favoritePaths: s.favoritePaths.filter(p => p !== path) })),
    setOpenPaths: (openPaths) => set({ openPaths }),
    setActivePath: (activePath) => set({ activePath }),
    
    setGitCache: (rootDir, changes) =>
      set(s => ({ gitCache: { ...s.gitCache, [rootDir]: changes } })),
    clearGitCache: (rootDir) =>
      set(s => ({
        gitCache: Object.fromEntries(Object.entries(s.gitCache).filter(([k]) => k !== rootDir)),
      })),
  }),
  { 
    name: 'explorer-store', 
    partialize: (s) => ({ 
      gitCache: s.gitCache,
      rootDir: s.rootDir,
      favoritePaths: s.favoritePaths,
      openPaths: s.openPaths,
      activePath: s.activePath
    }) 
  },
))
