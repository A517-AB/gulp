import { ipcRenderer } from 'electron'
import type { ApplyResult } from '../../../shared/types.js'

export const repolessSdk = {
  pickDir: (): Promise<string | null> =>
    ipcRenderer.invoke('sdk:repoless.pickDir'),

  start: (prompt: string, repoPath?: string): Promise<{ id: string }> =>
    ipcRenderer.invoke('sdk:repoless.start', prompt, repoPath),

  apply: (id: string, repoPath: string, branchName: string): Promise<ApplyResult> =>
    ipcRenderer.invoke('sdk:repoless.apply', id, repoPath, branchName),
}
