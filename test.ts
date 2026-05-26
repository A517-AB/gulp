import { jules } from '@google/jules-sdk'

const session = await jules.session({
  prompt: process.argv[2] ?? 'say hello in a new file hello.txt',
  source: { github: process.argv[3] ?? 'owner/repo', baseBranch: 'main' },
})

console.log(`session: ${session.id}`)

for await (const activity of session.stream()) {
  switch (activity.type) {
    case 'planGenerated':
      console.log('[plan]', activity.plan.steps.map(s => s.title).join(' → '))
      break
    case 'progressUpdated':
      console.log('[progress]', activity.title ?? activity.description)
      break
    case 'agentMessaged':
      console.log('[agent]', activity.message)
      break
    case 'sessionCompleted':
      console.log('[done]')
      break
    case 'sessionFailed':
      console.error('[failed]')
      break
  }
}

const result = await session.result()
console.log('state:', result.state)
if (result.pullRequest) console.log('PR:', result.pullRequest.url)
