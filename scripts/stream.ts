#!/usr/bin/env node
/**
 * Jules Stream
 *
 * Streams a Jules session and prints bash output exactly as it runs.
 * Everything is plain text — no JSON, no cards.
 *
 * Usage:
 *   npx tsx scripts/stream.ts <session-id>
 *   npx tsx scripts/stream.ts <session-id> --history   # replay past commands too
 *
 * Environment:
 *   JULES_API_KEY — required
 */

import { jules } from '@google/jules-sdk'
import type { Activity, BashArtifact } from '@google/jules-sdk/types'

// ── ANSI ──────────────────────────────────────────────────────────────────────

const c = {
  reset:  '\x1b[0m',
  bold:   '\x1b[1m',
  dim:    '\x1b[2m',
  green:  '\x1b[32m',
  red:    '\x1b[31m',
  yellow: '\x1b[33m',
  cyan:   '\x1b[36m',
  gray:   '\x1b[90m',
}

const out = (s: string) => process.stdout.write(s)
const ts  = () => c.gray + new Date().toLocaleTimeString() + c.reset

// ── renderers ─────────────────────────────────────────────────────────────────

function renderBash(bash: BashArtifact) {
  out(`${c.green}$ ${bash.command}${c.reset}\n`)
  if (bash.stdout) {
    out(bash.stdout)
    if (!bash.stdout.endsWith('\n')) out('\n')
  }
  const ok = bash.exitCode === 0
  out((ok ? c.gray : c.red) + `[exit ${bash.exitCode ?? 'N/A'}]` + c.reset + '\n\n')
}

function renderActivity(activity: Activity) {
  switch (activity.type) {
    case 'progressUpdated': {
      const bashes = activity.artifacts.filter((a): a is BashArtifact => a.type === 'bashOutput')
      for (const bash of bashes) renderBash(bash)

      if (!bashes.length) {
        const line = [activity.title, activity.description].filter(Boolean).join(' — ')
        if (line) out(`${ts()} ${c.dim}${line}${c.reset}\n`)
      }
      break
    }

    case 'agentMessaged': {
      const msg = activity.message ?? ''
      if (!msg) break
      out(`\n${c.cyan}╌╌ agent ╌╌${c.reset}\n${msg}\n${c.cyan}╌╌╌╌╌╌╌╌╌╌${c.reset}\n\n`)
      break
    }

    case 'userMessaged': {
      const msg = activity.message ?? ''
      if (!msg) break
      out(`\n${c.dim}╌╌ you ╌╌\n${msg}\n╌╌╌╌╌╌╌╌${c.reset}\n\n`)
      break
    }

    case 'planGenerated': {
      const steps = activity.plan?.steps ?? []
      out(`\n${c.yellow}── plan (${steps.length} steps) ──${c.reset}\n`)
      for (const step of steps) {
        out(`  ${c.dim}${String(step.index + 1)}.${c.reset} ${step.title}\n`)
        if (step.description) out(`     ${c.dim}${step.description}${c.reset}\n`)
      }
      out('\n')
      break
    }

    case 'planApproved':
      out(`${ts()} ${c.green}plan approved${c.reset}\n`)
      break

    case 'sessionCompleted':
      out(`\n${c.green}${c.bold}✓ done${c.reset}\n`)
      break

    case 'sessionFailed':
      out(`\n${c.red}${c.bold}✗ failed${activity.reason ? `: ${activity.reason}` : ''}${c.reset}\n`)
      break
  }
}

// ── main ──────────────────────────────────────────────────────────────────────

async function stream(sessionId: string, includeHistory: boolean) {
  const session = jules.session(sessionId)
  const info    = await session.info()

  out(`${c.bold}${info.title || sessionId}${c.reset}  ${c.dim}${info.state}${c.reset}\n`)
  out('─'.repeat(60) + '\n\n')

  const src = includeHistory ? session.stream() : session.updates()

  for await (const activity of src) {
    renderActivity(activity)

    if (activity.type === 'sessionCompleted' || activity.type === 'sessionFailed') break
  }
}

// ── entry ─────────────────────────────────────────────────────────────────────

const args      = process.argv.slice(2)
const sessionId = args.find(a => !a.startsWith('--'))
const history   = args.includes('--history')

if (!sessionId) {
  console.error('Usage: npx tsx scripts/stream.ts <session-id> [--history]')
  process.exit(1)
}

if (!process.env['JULES_API_KEY']) {
  console.error('JULES_API_KEY not set')
  process.exit(1)
}

stream(sessionId, history).catch((err: unknown) => {
  console.error(err)
  process.exit(1)
})
