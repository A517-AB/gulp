export const releaseChannels = ['stable', 'preview', 'nightly'] as const
export const cacheStrategies = ['balanced', 'eager', 'manual'] as const
export const topbarDensities = ['comfortable', 'compact'] as const

export type ReleaseChannel = (typeof releaseChannels)[number]
export type CacheStrategy = (typeof cacheStrategies)[number]
export type TopbarDensity = (typeof topbarDensities)[number]
export type DiagnosticLevel = 'stable' | 'warning' | 'blocking'

export interface WorkspacePreferences {
  workspaceLabel: string
  releaseChannel: ReleaseChannel
  cacheStrategy: CacheStrategy
  crashGuard: boolean
  topbarDensity: TopbarDensity
}

export interface SourceFileSummary {
  name: string
  path: string
  bytes: number
  updatedAt: string
}

export interface ShellSnapshot {
  appName: string
  appVersion: string
  platform: string
  projectRoot: string
  sourceFolders: string[]
  scripts: string[]
  preferences: WorkspacePreferences
  files: SourceFileSummary[]
  lastScanAt: string
}

export interface DiagnosticItem {
  id: string
  level: DiagnosticLevel
  title: string
  detail: string
  hint: string
  updatedAt: string
}

export interface DesktopBridge {
  getShellSnapshot: () => Promise<ShellSnapshot>
  getDiagnostics: (force?: boolean) => Promise<DiagnosticItem[]>
  savePreferences: (input: WorkspacePreferences) => Promise<WorkspacePreferences>
}

export function createDefaultPreferences(): WorkspacePreferences {
  return {
    workspaceLabel: 'Last Workspace',
    releaseChannel: 'stable',
    cacheStrategy: 'balanced',
    crashGuard: true,
    topbarDensity: 'comfortable',
  }
}