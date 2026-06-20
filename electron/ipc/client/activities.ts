import type { SdkIpc } from '@/jules'
import { invoke, stream } from '../transport'
import { CH, streams } from '../channels'

export const activitiesApi: SdkIpc['activities'] = {
  hydrate: (id) => invoke(CH.activities.hydrate, id),
  select: (id, options?) => invoke(CH.activities.select, id, options),
  list: (id, options?) => invoke(CH.activities.list, id, options),
  get: (id, activityId) => invoke(CH.activities.get, id, activityId),

  history: (id, onItem, onDone) =>
    stream(streams.activitiesHistory(id), onItem as (item: unknown) => void, onDone, [id]),

  updates: (id, onItem, onDone) =>
    stream(streams.activitiesUpdates(id), onItem as (item: unknown) => void, onDone, [id]),

  stream: (id, onItem, onDone) =>
    stream(streams.activitiesStream(id), onItem as (item: unknown) => void, onDone, [id]),
}
