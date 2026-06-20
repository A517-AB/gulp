import type { SdkIpc } from '@/jules'
import { invoke } from '../transport'
import { CH } from '../channels'

export const utilApi: SdkIpc['util'] = {
  toSummary: (activity) => invoke(CH.util.toSummary, activity),
  toSummaries: (activities) => invoke(CH.util.toSummaries, activities),
}

export const queryApi: SdkIpc['query'] = {
  validate: (query) => invoke(CH.query.validate, query),
  format: (result) => invoke(CH.query.format, result),
  schema: (domain) => invoke(CH.query.schema, domain),
  schemas: () => invoke(CH.query.schemas),
  typeDef: (domain) => invoke(CH.query.typeDef, domain),
  markdownDocs: () => invoke(CH.query.markdownDocs),
}
