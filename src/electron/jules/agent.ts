/**
 * Agent example — batch/parallel session execution.
 *
 * Uses `jules.all()` to dispatch multiple tasks concurrently with a configurable
 * concurrency limit, then streams all sessions in parallel. Demonstrates the
 * pattern for fan-out workloads where several independent prompts run at once.
 */
import { jules } from '@google/jules-sdk';
import '../_shared/check-env.js';

const tasks = [
  'Analyze the repository and list potential improvements',
  'Write a script to automate the deployment process',
  'Review the test suite and suggest additional test cases',
];

console.log(`Creating ${tasks.length} concurrent sessions...`);

const sessions = await jules.all(
  tasks,
  (task) => ({ prompt: task }),
  { concurrency: 2, stopOnError: false },
);

// Helper: stream a single session
async function streamSession(session: typeof sessions[number]) {
  console.log(`\nSession ${session.id}:`);

  session.result().then(outcome => {
    console.log(`\n--- [${session.id}] Result ---`);
    console.log(`State: ${outcome.state}`);
    console.log(`PR: ${outcome.pullRequest?.url ?? 'none'}`);
    console.log(`Files: ${outcome.generatedFiles().all().length}`);
  });

  for await (const activity of session.stream()) {
    if (activity.type === 'agentMessaged') {
      console.log(`  [${session.id}] Agent: ${activity.message.slice(0, 120)}`);
    }
  }
}

// Stream all sessions concurrently
await Promise.all(sessions.map(streamSession));

console.log('\nAll sessions complete.');
