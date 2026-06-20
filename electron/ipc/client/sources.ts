import type { SdkIpc } from '@/jules'
import { invoke } from '../transport'
import { CH } from '../channels'

export const sourcesApi: SdkIpc['sources'] = {
  list: () => invoke(CH.sources.list),
  get: (filter) => invoke(CH.sources.get, filter),
  resolve: (cwd?) => invoke(CH.sources.resolve, cwd),
}
