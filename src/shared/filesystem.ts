export interface FsEntry {
  name: string
  path: string
  isDir: boolean
  ext: string
  size: number
  modifiedAt: string
}

export interface FsStat {
  size: number
  isDir: boolean
  isFile: boolean
  createdAt: string
  modifiedAt: string
}

export interface ReaddirOptions {
  showHidden?: boolean
  respectGitignore?: boolean
}

export interface FileFilter {
  name: string
  extensions: string[]
}

export interface FsBookmark {
  path: string
  label: string
  addedAt: string
}
