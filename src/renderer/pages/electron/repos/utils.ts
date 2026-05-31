import type {
  JulesLocalActivity,
  JulesLocalGeneratedFile,
  JulesLocalSessionState,
} from '@shared/electron'

export function formatTimestamp(value?: string): string {
  if (!value) {
    return 'n/a'
  }

  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString()
}

export function getStateToneClass(
  state?: JulesLocalSessionState | 'completed' | 'failed',
): string {
  switch (state) {
    case 'completed':
      return 'border border-emerald-400/20 bg-emerald-500/10 text-emerald-200'
    case 'failed':
      return 'border border-red-400/20 bg-red-500/10 text-red-200'
    case 'awaitingPlanApproval':
    case 'awaitingUserFeedback':
      return 'border border-amber-400/20 bg-amber-500/10 text-amber-200'
    case 'planning':
    case 'queued':
    case 'inProgress':
      return 'border border-sky-400/20 bg-sky-500/10 text-sky-200'
    default:
      return 'border border-white/10 bg-white/5 text-white/70'
  }
}

export function parseRepositoryList(raw: string): string[] {
  return Array.from(
    new Set(
      raw
        .split(/[\r\n,]+/)
        .map((value) => value.trim())
        .filter(Boolean),
    ),
  )
}

export function mergeRepositoryList(raw: string, repository: string): string {
  const repositories = parseRepositoryList(raw)

  if (!repositories.includes(repository)) {
    repositories.push(repository)
  }

  return repositories.join('\n')
}

export function summarizeActivity(activity: JulesLocalActivity): string {
  switch (activity.type) {
    case 'agentMessaged':
    case 'userMessaged':
      return activity.message ?? activity.type
    case 'progressUpdated':
      return activity.description ?? activity.title ?? activity.type
    case 'planGenerated':
      return activity.plan
        ? `${activity.plan.steps.length} plan step${activity.plan.steps.length === 1 ? '' : 's'}`
        : 'Plan generated'
    case 'sessionFailed':
      return activity.reason ?? 'Session failed'
    default:
      return activity.title ?? activity.description ?? activity.type
  }
}

export function summarizeArtifacts(activity: JulesLocalActivity): string | null {
  if (!activity.artifacts.length) {
    return null
  }

  return activity.artifacts
    .map((artifact) => {
      switch (artifact.type) {
        case 'changeSet':
          return artifact.summary ?? 'Code changes'
        case 'bashOutput':
          return artifact.command ?? 'Bash output'
        default:
          return artifact.format ?? 'Media output'
      }
    })
    .join(' • ')
}

export function pickFilePath(
  files: JulesLocalGeneratedFile[],
  preferredPath: string | null,
): string | null {
  if (!files.length) {
    return null
  }

  if (preferredPath && files.some((file) => file.path === preferredPath)) {
    return preferredPath
  }

  return files.find((file) => /\.mdx?$/i.test(file.path))?.path ?? files[0]?.path ?? null
}