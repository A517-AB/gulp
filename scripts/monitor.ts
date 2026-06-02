#!/usr/bin/env node
/**
 * Session Monitor
 *
 * Streams a Jules session live and prints activities as they arrive.
 *
 * Usage:
 *   npx tsx scripts/monitor.ts <session-id>
 *
 * Environment:
 *   JULES_API_KEY — required
 */

import { jules } from '@google/jules-sdk'

function summarize(activity: { type: string; [key: string]: unknown }): string {
  switch (activity.type) {
    case 'planGenerated': {
      const plan = activity.plan as { steps?: unknown[] } | undefined
      return `Plan: ${String(plan?.steps?.length ?? 0)} steps`
    }
    case 'planApproved':
      return 'Plan approved'
    case 'progressUpdated': {
      const a = activity as { title?: string; description?: string }
      return a.title ?? a.description ?? '(working...)'
    }
    case 'agentMessaged': {
      const msg = (activity as { message?: string }).message ?? ''
      return `Agent: ${msg.slice(0, 120)}`
    }
    case 'userMessaged': {
      const msg = (activity as { message?: string }).message ?? ''
      return `User: ${msg.slice(0, 120)}`
    }
    case 'sessionCompleted':
      return 'Session completed'
    case 'sessionFailed': {
      const reason = (activity as { reason?: string }).reason ?? 'unknown'
      return `Failed: ${reason}`
    }
    default:
      return activity.type
  }
}

async function monitor(sessionId: string) {
  const session = jules.session(sessionId)
  const info = await session.info()

  console.log('─'.repeat(60))
  console.log(`Session: ${info.title || sessionId}`)
  console.log(`State:   ${info.state}`)
  console.log(`URL:     ${info.url}`)
  console.log('─'.repeat(60))

  const terminal = ['completed', 'failed', 'cancelled']
  if (terminal.includes(info.state)) {
    console.log(`\nSession already ${info.state} — fetching snapshot...\n`)
    const snapshot = await session.snapshot()
    console.log(`Duration:    ${String(Math.round(snapshot.durationMs / 1000 / 60))}m`)
    console.log(`Activities:  ${String(snapshot.activities.length)}`)
    console.log(`Attempts:    ${String(snapshot.insights.completionAttempts)}`)
    console.log(`Failures:    ${String(snapshot.insights.failedCommands.length)}`)
    if (snapshot.pr) console.log(`PR:          ${snapshot.pr.url}`)
    return
  }

  console.log('\nStreaming...\n')

  for await (const activity of session.stream()) {
    const time = new Date(activity.createTime).toLocaleTimeString()
    const summary = summarize(activity as unknown as { type: string; [key: string]: unknown })
    console.log(`[${time}] ${activity.type.padEnd(20)} ${summary}`)

    if (activity.type === 'sessionCompleted') {
      console.log('\n✓ Done')
      break
    }
    if (activity.type === 'sessionFailed') {
      console.log('\n✗ Failed')
      break
    }
  }
}

const sessionId = process.argv[2]

if (!sessionId) {
  console.error('Usage: npx tsx scripts/monitor.ts <session-id>')
  process.exit(1)
}

if (!process.env.JULES_API_KEY) {
  console.error('JULES_API_KEY not set')
  process.exit(1)
}

monitor(sessionId).catch((err: unknown) => {
  console.error(err)
  process.exit(1)
})
