import { ipcRenderer } from 'electron'
import type { IpcRendererEvent } from 'electron'
import type { Activity } from '@google/jules-sdk'
interface ApplyResult {
  branch: string
  diff: string
  applied: string[]
}

export const repolessSdk = {
  pickDir: (): Promise<string | null> =>
    ipcRenderer.invoke('sdk:repoless.pickDir'),

  start: (prompt: string, repoPath?: string): Promise<{ id: string }> =>
    ipcRenderer.invoke('sdk:repoless.start', prompt, repoPath),

  apply: (id: string, repoPath: string, branchName: string): Promise<ApplyResult> =>
    ipcRenderer.invoke('sdk:repoless.apply', id, repoPath, branchName),

  run: (
    prompt: string,
    repoPath?: string,
    onProgress?: (activity: Activity) => void,
  ): Promise<{ id: string; agentMessage?: string; files: Record<string, string> }> => {
    const runId = `run-${String(Date.now())}-${Math.random().toString(36).slice(2)}`
    const ch = `sdk:repoless.run.progress:${runId}`

    if (onProgress) {
      const handler = (_: IpcRendererEvent, activity: Activity) => { onProgress(activity) }
      ipcRenderer.on(ch, handler)
      return ipcRenderer
        .invoke('sdk:repoless.run', prompt, repoPath, runId)
        .finally(() => ipcRenderer.removeListener(ch, handler)) as Promise<{ id: string; agentMessage?: string; files: Record<string, string> }>
    }

    return ipcRenderer.invoke('sdk:repoless.run', prompt, repoPath, runId)
  },
}
