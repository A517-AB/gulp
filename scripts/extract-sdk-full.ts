// Produces research/sdk-reference.json — AI-consumable SDK reference
// Run: deno run --allow-read --allow-write scripts/extract-sdk-full.ts

import {join} from 'https://deno.land/std@0.224.0/path/mod.ts'

const SDK = './node_modules/@google/jules-sdk/dist'

async function read(file: string) {
  return Deno.readTextFile(join(SDK, file))
}

// ── parse interfaces and types from a .d.ts string ──────────────────────────

function parseInterfaces(src: string): Record<string, string> {
  const out: Record<string, string> = {}
  // match interface blocks (greedy but bounded by next export keyword)
  const re = /export interface (\w+)[^{]*\{([\s\S]*?)(?=\nexport |\ninterface |\ndeclare |\ntype |\n\/\*\*\n|\n$)/g
  for (const m of src.matchAll(re)) {
    out[m[1]!] = m[2]!.trim()
  }
  return out
}

function parseTypes(src: string): Record<string, string> {
  const out: Record<string, string> = {}
  const re = /export type (\w+)\s*=\s*([\s\S]*?);(?=\s*(?:\/\*\*|export|$))/g
  for (const m of src.matchAll(re)) {
    out[m[1]!] = m[2]!.replace(/\s+/g, ' ').trim()
  }
  return out
}

// ── load all relevant d.ts files ─────────────────────────────────────────────

const files = [
  'types.d.ts',
  'activities/types.d.ts',
  'activities/client.d.ts',
  'session.d.ts',
  'sessions.d.ts',
  'client.d.ts',
  'artifacts.d.ts',
  'snapshot.d.ts',
  'errors.d.ts',
  'query/schema.d.ts',
  'query/computed.d.ts',
  'query/projection.d.ts',
  'query/validate.d.ts',
  'streaming.d.ts',
  'caching.d.ts',
  'polling.d.ts',
  'storage/types.d.ts',
]

const allInterfaces: Record<string, string> = {}
const allTypes: Record<string, string> = {}

for (const f of files) {
  try {
    const src = await read(f)
    Object.assign(allInterfaces, parseInterfaces(src))
    Object.assign(allTypes, parseTypes(src))
  } catch { /* file may not exist */ }
}

// ── read index.mjs for runtime facts ─────────────────────────────────────────

const mjs = await Deno.readTextFile('./node_modules/@google/jules-sdk/dist-jules/index.mjs')

// HTTP endpoints from template literals
const httpEndpoints = [...new Set(
  [...mjs.matchAll(/`([^`]{3,80})`/g)]
    .map(m => m[1]!)
    .filter(s => (s.includes('sessions/') || s.includes('sources/')) && !s.includes('\n') && !s.includes('*'))
)]

// async method names from the class bodies
const asyncMethods = [...new Set(
  [...mjs.matchAll(/async\s+(\w+)\s*\(/g)].map(m => m[1]!)
    .filter(n => n.length > 2 && n !== 'constructor')
)]

// session states from the bundle
const sessionStates = [...mjs.matchAll(/'(queued|planning|awaitingPlanApproval|awaitingUserFeedback|inProgress|paused|failed|completed|unspecified)'/g)]
  .map(m => m[1]!)
const uniqueStates = [...new Set(sessionStates)]

// ── activity type variants ────────────────────────────────────────────────────

const activityTypes = [
  'agentMessaged',
  'userMessaged',
  'planGenerated',
  'planApproved',
  'progressUpdated',
  'sessionCompleted',
  'sessionFailed',
]

// ── known IPC channels from bridge.ts ────────────────────────────────────────

const bridgeSrc = await Deno.readTextFile('./electron/ipc/bridge.ts')
const ipcChannels = [...new Set(
  [...bridgeSrc.matchAll(/'(sdk:[a-zA-Z0-9._:-]+)'/g)].map(m => m[1]!)
)].sort()

// ── known issues / corrections ────────────────────────────────────────────────

const corrections = [
  {
    issue: 'sdk:session.hydrate IPC channel is redundant',
    detail: 'SessionClient has no .hydrate() method. The handler calls .activities.hydrate() internally anyway. sdk:activities.hydrate is the correct channel. sdk:session.hydrate should be deleted.',
    file: 'electron/ipc/handlers.ts',
  },
  {
    issue: 'session.select() is deprecated on SessionClient',
    detail: 'The SDK marks session.select() as @deprecated. Use session.activities.select() instead. The IPC channel sdk:session.select routes to session.activities.select which is fine, but the type surface should reflect activities.select.',
    file: 'electron/ipc/handlers.ts',
  },
  {
    issue: 'serialize() wraps primitives unnecessarily',
    detail: 'hydrate() returns a number. JSON.parse(JSON.stringify(5)) is fine but if hydrate() ever returns undefined, JSON.stringify(undefined) returns undefined (not a string), causing JSON.parse(undefined) → "Unexpected end of JSON input". Guard with: if (result === undefined) return 0',
    file: 'electron/ipc/handlers.ts',
  },
  {
    issue: 'GitAPI type only exposes 7 of ~20 registered handlers',
    detail: 'electron/git.ts registers: log, diff, show, remote, branches, currentBranch, tags, unstage, amend, fetch, checkout, deleteBranch, merge, rebase, stash, reset, restore, clean, clone, shell.exec, shell.runScript, shell.runInline — none of these are in GitAPI (electron.d.ts) or preload.mts. They are unreachable from the renderer.',
    file: 'src/shared/electron.d.ts + electron/preload.mts',
  },
]

// ── hydration flow (explicit, for AI use) ────────────────────────────────────

const hydrationFlow = {
  summary: 'hydrate() is a method on ActivityClient only (jules.session(id).activities.hydrate()). It is NOT on SessionClient directly.',
  steps: [
    '1. Call jules.session(sessionId).activities.hydrate() — network call, fetches new activities since last cached createTime, writes to local storage, returns count:number',
    '2. If session frozen (>30 days old), hydrate() skips network call and returns 0',
    '3. Call jules.session(sessionId).activities.select(options?) — LOCAL only, reads from storage, re-instantiates artifact class instances via _hydrateActivityArtifacts()',
    '4. Artifacts come back as plain objects from JSON storage — SDK restores them to ChangeSetArtifact | MediaArtifact | BashArtifact class instances automatically',
    '5. Never call select() on a cold cache without hydrate() first — you will get []',
  ],
  ipcCorrect: 'sdk:activities.hydrate',
  ipcWrong: 'sdk:session.hydrate (duplicate, delete it)',
  returnsType: 'Promise<number> — count of new activities synced',
}

// ── assemble output ───────────────────────────────────────────────────────────

const output = {
  _meta: {
    generated: new Date().toISOString(),
    purpose: 'AI-consumable SDK reference for @google/jules-sdk. Use this to answer questions about types, methods, IPC channels, and known issues without re-reading source files.',
    sdkPackage: '@google/jules-sdk',
    sdkVersion: JSON.parse(await Deno.readTextFile('./node_modules/@google/jules-sdk/package.json')).version,
  },
  hydrationFlow,
  corrections,
  ipcChannels,
  httpEndpoints,
  sessionStates: uniqueStates,
  activityTypes,
  asyncMethodsInBundle: asyncMethods.sort(),
  interfaces: allInterfaces,
  types: allTypes,
}

await Deno.writeTextFile('./research/sdk-reference.json', JSON.stringify(output, null, 2))

const stats = {
  interfaces: Object.keys(allInterfaces).length,
  types: Object.keys(allTypes).length,
  ipcChannels: ipcChannels.length,
  httpEndpoints: httpEndpoints.length,
  corrections: corrections.length,
}
console.log('written → research/sdk-reference.json')
console.log(JSON.stringify(stats, null, 2))
