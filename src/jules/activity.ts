import type { Activity } from '@google/jules-sdk/types'

// Derived from the SDK — never hand-listed, can't drift.
export type ActivityType = Activity['type']
export type ActivityRole = Activity['originator']

// The message lane.
//
// Backed by the SDK's own storage: `session.activities.stream()` net-syncs all
// history (deduped, chronological), then transitions into live updates — one
// async iterable, one subscription. Items arrive already deduped by id, so the
// consumer just appends/upserts by id. No hydrate, no select, no merge.
export type MessageStream = (
  sessionId: string,
  onItem: (activity: Activity) => void,
  onDone?: () => void,
) => () => void
