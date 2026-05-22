import { ipcMain } from 'electron'
import type { WorkspacePreferences } from '../shared/bridge'
import { sanitizePreferences, writePreferences } from './preferences'
import { getDiagnostics, getShellSnapshot } from './workspace'

export function registerIpcHandlers() {
  console.info('[electron:ipc] registering handlers')
  ipcMain.handle('last:get-shell-snapshot', () => getShellSnapshot())
  ipcMain.handle('last:get-diagnostics', () => getDiagnostics())
  ipcMain.handle('last:save-preferences', async (_event, input: WorkspacePreferences) => {
    console.info('[electron:ipc] saving preferences')
    const preferences = sanitizePreferences(input)
    await writePreferences(preferences)

    return preferences
  })
}