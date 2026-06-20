// The single seam where the main process pulls @google/jules-sdk *runtime* in.
//
// The SDK's index.d.ts exposes exactly 21 runtime VALUE exports plus one
// `export * from './errors'` (the 11 error classes — "the wild card"). Everything
// else it ships is a TYPE, and types never need to cross IPC: the renderer imports
// those straight from '@google/jules-sdk/types'. Keeping every value import behind
// this file means there is one place to audit what actually executes in main.
//
// The 21 value exports, for reference:
//   jules, connect, parseUnidiff, toSummary, validateQuery, formatValidationResult,
//   getSchema, getAllSchemas, generateTypeDefinition, generateMarkdownDocs,
//   SESSION_SCHEMA, ACTIVITY_SCHEMA, FILTER_OP_SCHEMA, PROJECTION_SCHEMA,
//   SessionCursor, JulesClientImpl, MemoryStorage, MemorySessionStorage,
//   NodePlatform, ChangeSetArtifact, BashArtifact
// Only the ones the handlers genuinely use are re-exported below.

export {
  jules,
  parseUnidiff,
  toSummary,
  validateQuery,
  formatValidationResult,
  getSchema,
  getAllSchemas,
  generateTypeDefinition,
  generateMarkdownDocs,
} from '@google/jules-sdk'

// The wild card: the full error set in one shot. Used by the IPC error envelope
// (errors.ts) to map SDK error classes onto a wire-safe shape.
export {
  JulesError,
  JulesApiError,
  JulesAuthenticationError,
  JulesNetworkError,
  JulesRateLimitError,
  MissingApiKeyError,
  SourceNotFoundError,
  AutomatedSessionFailedError,
  TimeoutError,
  SyncInProgressError,
  InvalidStateError,
} from '@google/jules-sdk'
