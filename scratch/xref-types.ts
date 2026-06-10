/**
 * Cross-reference: src/jules/types.ts vs @google/jules-sdk types.d.ts
 * Run: deno run --allow-read scratch/xref-types.ts
 */

import * as fs from 'node:fs'

const ourFile = fs.readFileSync('src/jules/types.ts', 'utf8')
const sdkFile = fs.readFileSync('node_modules/@google/jules-sdk/dist/types.d.ts', 'utf8')

function extractBlocks(src: string): Map<string, string[]> {
  const map = new Map<string, string[]>()

  const blockRe = /export\s+(?:interface|type)\s+(\w+)[^{]*\{([^}]*)\}/gs
  for (const m of src.matchAll(blockRe)) {
    const name   = m[1]!
    const body   = m[2]!
    const fields = [...body.matchAll(/^\s+(readonly\s+)?(\w+)\??:/gm)]
      .map(f => f[2]!)
      .filter(Boolean)
    map.set(name, fields)
  }

  // union types
  const unionRe = /export\s+type\s+(\w+)\s*=\s*([^;{]+);/g
  for (const m of src.matchAll(unionRe)) {
    if (!map.has(m[1]!)) map.set(m[1]!, ['(union)'])
  }

  return map
}

const ours = extractBlocks(ourFile)
const sdk  = extractBlocks(sdkFile)

const SDK_ALIAS: Record<string, string> = {
  Session: 'SessionResource',
}

const COMPARE = [
  'SessionState',
  'AutomationMode',
  'Source',
  'GitHubRepo',
  'Session',
  'SourceContext',
  'SessionOutput',
  'PullRequest',
  'Plan',
  'PlanStep',
  'GitPatch',
  'ChangeSet',
  'Activity',
  'CreateSessionRequest',
]

console.log('='.repeat(60))
console.log('CROSS-REFERENCE  src/jules/types.ts  vs  @google/jules-sdk')
console.log('='.repeat(60))

let issues = 0

for (const name of COMPARE) {
  const ourFields = ours.get(name)
  const sdkName   = SDK_ALIAS[name] ?? name
  const sdkFields = sdk.get(sdkName)

  if (!ourFields) {
    console.log(`\n[MISSING IN OURS]  ${name}`)
    issues++
    continue
  }
  if (!sdkFields) {
    console.log(`\n[APP-ONLY]  ${name}  (not in sdk, that's ok)`)
    continue
  }

  const ourSet = new Set(ourFields)
  const sdkSet = new Set(sdkFields)
  const missing = sdkFields.filter(f => f !== '(union)' && !ourSet.has(f))
  const extra   = ourFields.filter(f => f !== '(union)' && !sdkSet.has(f))

  if (!missing.length && !extra.length) {
    console.log(`\n[OK]   ${name}`)
  } else {
    console.log(`\n[DIFF] ${name}  (ours) vs  ${sdkName}  (sdk)`)
    if (missing.length) { console.log(`  sdk has, we don't : ${missing.join(', ')}`); issues++ }
    if (extra.length)   { console.log(`  we have, sdk doesn't: ${extra.join(', ')}`) }
  }
}

console.log('\n' + '='.repeat(60))
console.log(`${issues} issue(s) found`)
