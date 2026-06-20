import * as fs from 'node:fs'
import * as path from 'node:path'
import { Buffer } from 'node:buffer'
import type { GeneratedFile } from '@google/jules-sdk/types'
import { parseUnidiff } from '../sdk'
import { serialize } from '../serialize'
import { CH } from '../channels'
import { handle } from './util'

// The SDK exports parseUnidiff but NOT a with-content variant, so this stays as
// local glue rather than an SDK call. It walks the unidiff and keeps the added
// lines per file alongside the add/delete counts.
export function parseUnidiffWithContent(patch?: string | null): GeneratedFile[] {
  if (!patch) return []
  const lines = patch.split(/\r?\n/)
  const files: GeneratedFile[] = []
  let current: {
    path: string
    changeType: 'created' | 'modified' | 'deleted'
    addedLines: string[]
    additions: number
    deletions: number
  } | null = null
  let inHunk = false

  const flush = () => {
    if (!current) return
    files.push({
      path:       current.path,
      changeType: current.changeType,
      content:    current.addedLines.join('\n'),
      additions:  current.additions,
      deletions:  current.deletions,
    })
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    if (line === undefined) continue

    if (line.startsWith('--- ')) {
      const nextLine = lines[i + 1]
      if (nextLine?.startsWith('+++ ')) {
        const fromPath = line.substring(4)
        const toPath = nextLine.substring(4)

        let changeType: 'created' | 'modified' | 'deleted'
        let filePath: string
        if (fromPath === '/dev/null') {
          changeType = 'created'
          filePath = toPath.startsWith('b/') ? toPath.substring(2) : toPath
        } else if (toPath === '/dev/null') {
          changeType = 'deleted'
          filePath = fromPath.startsWith('a/') ? fromPath.substring(2) : fromPath
        } else {
          changeType = 'modified'
          filePath = toPath.startsWith('b/') ? toPath.substring(2) : toPath
        }

        flush()
        current = { path: filePath, changeType, addedLines: [], additions: 0, deletions: 0 }
        inHunk = false
        continue
      }
    }

    if (line.startsWith('@@')) {
      inHunk = true
      continue
    }

    if (current && inHunk) {
      if (line.startsWith('+')) {
        current.addedLines.push(line.substring(1))
        current.additions++
      } else if (line.startsWith('-')) {
        current.deletions++
      }
    }
  }

  flush()
  return files
}

export function registerArtifactHandlers(): void {
  // MediaArtifact.save() exists in the SDK but its platform dep can't cross IPC,
  // so the write is re-done here against fs with the base64 payload.
  handle(CH.artifact.save, async (_event, data: string, filepath: string) => {
    const resolved = path.resolve(filepath)
    await fs.promises.mkdir(path.dirname(resolved), { recursive: true })
    await fs.promises.writeFile(resolved, Buffer.from(data, 'base64'))
    return resolved
  })

  handle(CH.artifact.parseUnidiff, (_event, patch?: string | null) =>
    serialize(parseUnidiff(patch)),
  )

  handle(CH.artifact.parseUnidiffWithContent, (_event, patch?: string | null) =>
    serialize(parseUnidiffWithContent(patch)),
  )
}
