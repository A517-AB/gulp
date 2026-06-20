import type { SdkIpc } from '@/jules'
import { clientApi } from './client'
import { sessionApi } from './session'
import { activitiesApi } from './activities'
import { sourcesApi } from './sources'
import { artifactApi } from './artifact'
import { queryApi, utilApi } from './query'

// The renderer-facing SDK client, assembled from per-domain slices and exposed
// to the window via preload (contextBridge). Implements the SdkIpc contract from
// src/jules; nothing here imports the SDK runtime — it's pure transport.
export const sdk: SdkIpc = {
  client:     clientApi,
  session:    sessionApi,
  activities: activitiesApi,
  sources:    sourcesApi,
  artifact:   artifactApi,
  util:       utilApi,
  query:      queryApi,
}
