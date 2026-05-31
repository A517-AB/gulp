import { sdkIpc } from '@shared/bridge'
import type {
  JulesLocalActivity,
  JulesLocalFileFilter,
  JulesLocalGeneratedFile,
  JulesLocalSessionInfo,
  JulesLocalSessionRequest,
  JulesLocalStreamActivityEvent,
  JulesLocalStreamStateEvent,
} from '@shared/electron'

export type {
  JulesLocalActivity,
  JulesLocalFileFilter,
  JulesLocalGeneratedFile,
  JulesLocalSessionInfo,
  JulesLocalSessionRequest,
  JulesLocalStreamActivityEvent,
  JulesLocalStreamStateEvent,
} from '@shared/electron'

function requireLocalBridge() {
  if (!sdkIpc) {
    throw new Error('Jules local tools are only available in the Electron build.')
  }

  return sdkIpc
}

export const localJules = {
  createSession(request: JulesLocalSessionRequest): Promise<JulesLocalSessionInfo> {
    return requireLocalBridge().createSession(request)
  },

  resumeSession(sessionId: string): Promise<JulesLocalSessionInfo> {
    return requireLocalBridge().resumeSession(sessionId)
  },

  getSession(sessionId: string): Promise<JulesLocalSessionInfo> {
    return requireLocalBridge().getSession(sessionId)
  },

  approve(sessionId: string): Promise<void> {
    return requireLocalBridge().approve(sessionId)
  },

  sendMessage(sessionId: string, prompt: string): Promise<void> {
    return requireLocalBridge().sendMessage(sessionId, prompt)
  },

  ask(sessionId: string, prompt: string): Promise<JulesLocalActivity> {
    return requireLocalBridge().ask(sessionId, prompt)
  },

  getGeneratedFiles(sessionId: string, filter?: JulesLocalFileFilter): Promise<JulesLocalGeneratedFile[]> {
    return requireLocalBridge().getGeneratedFiles(sessionId, filter)
  },

  getMarkdownFiles(sessionId: string): Promise<JulesLocalGeneratedFile[]> {
    return requireLocalBridge().getMarkdownFiles(sessionId)
  },

  startStream(sessionId: string): Promise<void> {
    return requireLocalBridge().startStream(sessionId)
  },

  stopStream(sessionId: string): Promise<void> {
    return requireLocalBridge().stopStream(sessionId)
  },

  onActivity(callback: (payload: JulesLocalStreamActivityEvent) => void): () => void {
    return requireLocalBridge().onActivity(callback)
  },

  onStreamState(callback: (payload: JulesLocalStreamStateEvent) => void): () => void {
    return requireLocalBridge().onStreamState(callback)
  },

  applyPatch(sessionId: string, opts: { branch?: string; dryRun?: boolean; cwd: string }) {
    return requireLocalBridge().applyPatch(sessionId, opts)
  },
}

export function toMarkdownFiles(files: JulesLocalGeneratedFile[]): JulesLocalGeneratedFile[] {
  return files.filter((file) => /\.mdx?$/i.test(file.path))
}

export function indexFilesByPath(files: JulesLocalGeneratedFile[]): Map<string, JulesLocalGeneratedFile> {
  return new Map(files.map((file) => [file.path, file]))
}
