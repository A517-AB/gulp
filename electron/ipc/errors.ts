// Main-side error enveloping. Maps SDK error classes onto the wire shape so the
// renderer can recover name/status/url instead of a flattened "Error: ...".

import { JulesError, JulesApiError } from './sdk'
import { SENTINEL } from './wire'
import type { IpcErrorShape } from './wire'

export function encodeError(err: unknown): string {
  const base: IpcErrorShape =
    err instanceof Error
      ? { name: err.name, message: err.message }
      : { name: 'Error', message: String(err) }

  if (err instanceof JulesApiError) {
    return SENTINEL + JSON.stringify({ ...base, status: err.status, url: err.url })
  }
  if (err instanceof JulesError && err.cause) {
    return SENTINEL + JSON.stringify({ ...base, cause: err.cause.message })
  }
  return SENTINEL + JSON.stringify(base)
}
