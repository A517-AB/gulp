export { isElectron, isWeb, terminal, queues, windowControls, power, popup, filesystem, snippets, sdkIpc } from './bridge'

export type { FsEntry, FsStat, ReaddirOptions, FileFilter, FsBookmark } from './filesystem'

export { FUSE_ROOT, fuseResolve, fuseFilePath, FuseSnippetType, FuseManifestItem, FuseManifest, FuseChangeEvent } from './fuse'

export type {
  ElectronAPI,
  ShellType,
  TerminalAPI,
  QueuesAPI,
  WindowAPI,
  PowerAPI,
  PopupNotification,
  PopupAPI,
  FilesystemAPI,
  EnvAPI,
  SnippetsAPI,
  JulesLocalAPI,
  JulesLocalSessionState,
  JulesLocalSessionRequest,
  JulesLocalSessionInfo,
  JulesLocalGeneratedFile,
  JulesLocalFileFilter,
  JulesLocalArtifact,
  JulesLocalPlanStep,
  JulesLocalPlan,
  JulesLocalActivity,
  JulesLocalStreamActivityEvent,
  JulesLocalStreamStateEvent,
} from './electron'
