import { ipcRenderer } from 'electron';
import type { ElectronAPI } from './types.js';
import { sdk } from '../electron/jules/sdk.js';

const git: ElectronAPI['git'] = {
  status: (repoPath) => ipcRenderer.invoke('git:status', repoPath),
  log: (repoPath, maxCount) => ipcRenderer.invoke('git:log', repoPath, maxCount),
  branches: (repoPath) => ipcRenderer.invoke('git:branches', repoPath),
  checkout: (repoPath, branch, create) => ipcRenderer.invoke('git:checkout', repoPath, branch, create),
  rebase: (repoPath, onto) => ipcRenderer.invoke('git:rebase', repoPath, onto),
  rebaseAbort: (repoPath) => ipcRenderer.invoke('git:rebase-abort', repoPath),
  rebaseContinue: (repoPath) => ipcRenderer.invoke('git:rebase-continue', repoPath),
};

export const bridge: ElectronAPI = {
  ping: () => ipcRenderer.invoke('ping'),
  minimize: () => { ipcRenderer.send('window-minimize'); },
  maximize: () => { ipcRenderer.send('window-maximize'); },
  close: () => { ipcRenderer.send('window-close'); },
  sdk,
  git,
};
