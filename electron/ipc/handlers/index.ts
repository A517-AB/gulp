import { registerClientHandlers } from './client'
import { registerSessionHandlers } from './session'
import { registerActivitiesHandlers } from './activities'
import { registerSourcesHandlers } from './sources'
import { registerArtifactHandlers } from './artifact'
import { registerQueryHandlers } from './query'

export function registerSdkHandlers(): void {
  registerClientHandlers()
  registerSessionHandlers()
  registerActivitiesHandlers()
  registerSourcesHandlers()
  registerArtifactHandlers()
  registerQueryHandlers()
}
