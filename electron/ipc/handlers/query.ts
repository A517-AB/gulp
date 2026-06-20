import type { Activity } from '@google/jules-sdk'
import {
  toSummary,
  validateQuery,
  formatValidationResult,
  getSchema,
  getAllSchemas,
  generateTypeDefinition,
  generateMarkdownDocs,
} from '../sdk'
import { serialize } from '../serialize'
import { CH } from '../channels'
import { handle } from './util'

type Domain = 'sessions' | 'activities'

export function registerQueryHandlers(): void {
  // ── util ──────────────────────────────────────────────────────────────────
  handle(CH.util.toSummary, (_event, activity: Activity) =>
    serialize(toSummary(activity)),
  )

  handle(CH.util.toSummaries, (_event, activities: Activity[]) =>
    serialize(activities.map((a) => toSummary(a))),
  )

  // ── query ─────────────────────────────────────────────────────────────────
  handle(CH.query.validate, (_event, query: unknown) =>
    serialize(validateQuery(query)),
  )

  handle(CH.query.format, (_event, result: ReturnType<typeof validateQuery>) =>
    formatValidationResult(result),
  )

  handle(CH.query.schema, (_event, domain: Domain) =>
    serialize(getSchema(domain)),
  )

  handle(CH.query.schemas, () =>
    serialize(getAllSchemas()),
  )

  handle(CH.query.typeDef, (_event, domain: Domain) =>
    generateTypeDefinition(domain),
  )

  handle(CH.query.markdownDocs, () =>
    generateMarkdownDocs(),
  )
}
