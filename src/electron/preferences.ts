import { app } from 'electron'
import { promises as fs } from 'node:fs'
import { join } from 'node:path'
import type { WorkspacePreferences } from '../shared/bridge'
import { createDefaultPreferences } from '../shared/bridge'

function getPreferencesPath() {
  return join(app.getPath('userData'), 'workspace-preferences.json')
}

export function sanitizePreferences(input: WorkspacePreferences): WorkspacePreferences {
  const fallback = createDefaultPreferences()

  return {
    workspaceLabel: input.workspaceLabel.trim().slice(0, 48) || fallback.workspaceLabel,
    releaseChannel: input.releaseChannel,
    cacheStrategy: input.cacheStrategy,
    crashGuard: input.crashGuard,
    topbarDensity: input.topbarDensity,
  }
}

export async function readPreferences() {
  try {
    const raw = await fs.readFile(getPreferencesPath(), 'utf8')
    const parsed = JSON.parse(raw) as WorkspacePreferences

    return sanitizePreferences(parsed)
  } catch {
    return createDefaultPreferences()
  }
}

export async function writePreferences(input: WorkspacePreferences) {
  await fs.mkdir(app.getPath('userData'), { recursive: true })
  await fs.writeFile(getPreferencesPath(), JSON.stringify(input, null, 2), 'utf8')
}