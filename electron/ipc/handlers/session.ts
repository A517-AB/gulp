import * as fs from 'node:fs'
import * as path from 'node:path'
import { execFileSync } from 'node:child_process'
import type { SessionConfig, SessionState } from '@google/jules-sdk'
import type { SelectOptions, StreamActivitiesOptions } from '@google/jules-sdk/types'
import { jules } from '../sdk'
import { serialize } from '../serialize'
import { CH, sessionStream, sessionHistory, sessionUpdates } from '../channels'
import { handle, pump } from './util'

interface ApplyResult {
  success: boolean
  branch?: string
  error?:  string
}

// Platform glue, not an SDK reimplementation: the SDK hands us a unidiff, git does
// the rest. There is no SDK method for "apply this patch to a local checkout".
function applyPatch(snapshotPatch: string, suggestedMessage: string, cwd: string): ApplyResult {
  const branch = `jules-patch-${String(Date.now())}`
  let patchPath: string | null = null
  try {
    const message = suggestedMessage || 'Applied changes from Jules'
    execFileSync('git', ['checkout', '-b', branch], { cwd, stdio: 'pipe' })
    patchPath = path.join(cwd, 'jules_changes.patch')
    fs.writeFileSync(patchPath, snapshotPatch)
    execFileSync('git', ['apply', patchPath], { cwd, stdio: 'pipe' })
    execFileSync('git', ['add', '.'], { cwd, stdio: 'pipe' })
    execFileSync('git', ['commit', '-m', message], { cwd, stdio: 'pipe' })
    return { success: true, branch }
  } catch (error) {
    console.error('[sdk:session.applyPatch] error:', error)
    return { success: false, error: error instanceof Error ? error.message : String(error) }
  } finally {
    if (patchPath) {
      try { fs.unlinkSync(patchPath) } catch { /* ignore */ }
    }
  }
}

export function registerSessionHandlers(): void {
  handle(CH.session.create, async (_event, config: SessionConfig) =>
    serialize({ id: (await jules.session(config)).id }),
  )

  handle(CH.session.send, (_event, id: string, prompt: string) =>
    jules.session(id).send(prompt),
  )

  handle(CH.session.ask, async (_event, id: string, prompt: string) =>
    serialize(await jules.session(id).ask(prompt)),
  )

  handle(CH.session.approve, (_event, id: string) =>
    jules.session(id).approve(),
  )

  handle(CH.session.info, async (_event, id: string) =>
    serialize(await jules.session(id).info()),
  )

  handle(CH.session.result, async (_event, id: string) => {
    const o = await jules.session(id).result()
    return serialize({
      sessionId:   o.sessionId,
      title:       o.title,
      state:       o.state,
      pullRequest: o.pullRequest,
      outputs:     o.outputs,
    })
  })

  handle(CH.session.waitFor, (_event, id: string, state: SessionState) =>
    jules.session(id).waitFor(state),
  )

  handle(CH.session.snapshot, async (_event, id: string, options?: { activities?: boolean }) => {
    const snap = await jules.session(id).snapshot(options)
    return snap.toJSON({ exclude: [] })
  })

  handle(CH.session.archive, (_event, id: string) =>
    jules.session(id).archive(),
  )

  handle(CH.session.unarchive, (_event, id: string) =>
    jules.session(id).unarchive(),
  )

  handle(CH.session.select, async (_event, id: string, options?: SelectOptions) =>
    serialize(await jules.session(id).activities.select(options)),
  )

  handle(CH.session.applyPatch, async (_event, id: string, options: { cwd: string }) => {
    const snapshot = await jules.session(id).snapshot()
    const gitPatch = snapshot.changeSet()?.gitPatch
    if (!gitPatch?.unidiffPatch) {
      return { success: false, error: 'No ChangeSet artifact with gitPatch data found in this session.' }
    }
    return applyPatch(gitPatch.unidiffPatch, gitPatch.suggestedCommitMessage, options.cwd)
  })

  handle(CH.session.streamStart, (event, id: string, options?: StreamActivitiesOptions) =>
    pump(event, jules.session(id).stream(options), sessionStream(id)),
  )

  handle(CH.session.historyStart, (event, id: string) =>
    pump(event, jules.session(id).history(), sessionHistory(id)),
  )

  handle(CH.session.updatesStart, (event, id: string) =>
    pump(event, jules.session(id).updates(), sessionUpdates(id)),
  )
}
