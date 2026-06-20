import type { SelectOptions } from '@google/jules-sdk/types'
import { jules } from '../sdk'
import { serialize } from '../serialize'
import { CH, activitiesHistory, activitiesUpdates, activitiesStream } from '../channels'
import { handle, pump } from './util'

interface ListOptions {
  pageSize?:  number
  pageToken?: string
  filter?:    string
}

export function registerActivitiesHandlers(): void {
  handle(CH.activities.hydrate, (_event, id: string) =>
    jules.session(id).activities.hydrate(),
  )

  handle(CH.activities.select, async (_event, id: string, options?: SelectOptions) =>
    serialize(await jules.session(id).activities.select(options)),
  )

  handle(CH.activities.list, async (_event, id: string, options?: ListOptions) =>
    serialize(await jules.session(id).activities.list(options)),
  )

  handle(CH.activities.get, async (_event, id: string, activityId: string) =>
    serialize(await jules.session(id).activities.get(activityId)),
  )

  handle(CH.activities.historyStart, (event, id: string) =>
    pump(event, jules.session(id).activities.history(), activitiesHistory(id)),
  )

  handle(CH.activities.updatesStart, (event, id: string) =>
    pump(event, jules.session(id).activities.updates(), activitiesUpdates(id)),
  )

  handle(CH.activities.streamStart, (event, id: string) =>
    pump(event, jules.session(id).activities.stream(), activitiesStream(id)),
  )
}
