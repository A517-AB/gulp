import { execFileSync } from 'node:child_process'
import type { Source } from '@google/jules-sdk'
import { jules } from '../sdk'
import { serialize } from '../serialize'
import { CH } from '../channels'
import { handle } from './util'

function resolveGitSource(cwd?: string): { github: string | null; baseBranch: string } {
  const baseBranch = process.env.BASE_BRANCH ?? 'main'
  const fromEnv = process.env.GITHUB_REPO
  if (fromEnv) return { github: fromEnv, baseBranch }
  try {
    const url = execFileSync('git', ['remote', 'get-url', 'origin'], { cwd, encoding: 'utf-8' }).trim()
    const match = /github\.com[:/](.+?)(?:\.git)?$/.exec(url)
    return { github: match?.[1] ?? null, baseBranch }
  } catch {
    return { github: null, baseBranch }
  }
}

export function registerSourcesHandlers(): void {
  handle(CH.sources.list, async () => {
    const sources: Source[] = []
    for await (const src of jules.sources()) sources.push(src)
    return serialize(sources)
  })

  handle(CH.sources.get, async (_event, filter: { github: string }) =>
    serialize(await jules.sources.get(filter)),
  )

  handle(CH.sources.resolve, (_event, cwd?: string) => resolveGitSource(cwd))
}
