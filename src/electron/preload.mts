import { contextBridge, ipcRenderer } from 'electron'
import type { DesktopBridge, DiagnosticItem, ShellSnapshot, WorkspacePreferences } from '../shared/bridge'

const bridge: DesktopBridge = {
  getShellSnapshot: () => ipcRenderer.invoke('last:get-shell-snapshot') as Promise<ShellSnapshot>,
  getDiagnostics: (force = false) =>
    ipcRenderer.invoke('last:get-diagnostics', force) as Promise<DiagnosticItem[]>,
  savePreferences: (input) =>
    ipcRenderer.invoke('last:save-preferences', input) as Promise<WorkspacePreferences>,
}

console.info('[electron:preload] exposing lastBridge')
contextBridge.exposeInMainWorld('lastBridge', bridge)