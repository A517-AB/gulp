import type { SdkIpc } from '@/jules'
import { invoke } from '../transport'
import { CH } from '../channels'

export const artifactApi: SdkIpc['artifact'] = {
  save: (data, filepath) => invoke(CH.artifact.save, data, filepath),
  parseUnidiff: (patch?) => invoke(CH.artifact.parseUnidiff, patch),
  parseUnidiffWithContent: (patch?) => invoke(CH.artifact.parseUnidiffWithContent, patch),
}
