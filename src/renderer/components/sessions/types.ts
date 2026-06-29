import type {SessionResource} from '@jules'

// The SDK types this feature renders against. Consumers import them from the
// sessions folder rather than reaching into @jules directly.
export type {SessionResource, SessionState} from '@jules'

/**
 * `SessionResource` as the local cache actually returns it. The SDK d.ts marks
 * `sourceContext`, `title`, and `state` as always-present, but synced/cached
 * records (and repoless sessions) can omit them — the SDK's own storage layer
 * guards `sourceContext` with `?.` for the same reason. We extend the SDK type
 * to tell the truth instead of trusting the optimistic declaration.
 */
export type CachedSession = Omit<SessionResource, 'sourceContext' | 'title' | 'state'> & {
    sourceContext?: SessionResource['sourceContext']
    title?: SessionResource['title']
    state?: SessionResource['state']
}
