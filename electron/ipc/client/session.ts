import type { SdkIpc } from '@/jules'
import { invoke, stream } from '../transport'
import { CH, sessionStream, sessionHistory, sessionUpdates } from '../channels'

export const sessionApi: SdkIpc['session'] = {
  create: (config) => invoke(CH.session.create, config),
  send: (id, prompt) => invoke(CH.session.send, id, prompt),
  ask: (id, prompt) => invoke(CH.session.ask, id, prompt),
  approve: (id) => invoke(CH.session.approve, id),
  info: (id) => invoke(CH.session.info, id),
  result: (id) => invoke(CH.session.result, id),
  waitFor: (id, state) => invoke(CH.session.waitFor, id, state),
  snapshot: (id, options?) => invoke(CH.session.snapshot, id, options),
  archive: (id) => invoke(CH.session.archive, id),
  unarchive: (id) => invoke(CH.session.unarchive, id),
  select: (id, options?) => invoke(CH.session.select, id, options),
  applyPatch: (id, options) => invoke(CH.session.applyPatch, id, options),

  stream: (id, onItem, onDone, options?) =>
    stream(sessionStream(id), onItem as (item: unknown) => void, onDone, [id, options]),

  history: (id, onItem, onDone) =>
    stream(sessionHistory(id), onItem as (item: unknown) => void, onDone, [id]),

  updates: (id, onItem, onDone) =>
    stream(sessionUpdates(id), onItem as (item: unknown) => void, onDone, [id]),
}
