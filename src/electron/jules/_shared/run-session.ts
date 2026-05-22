import { jules } from '@google/jules-sdk';
import { logStream } from './log-stream.js';

/** Outcome of a Jules session: the agent's last message and all generated files. */
export interface SessionOutcome {
  agentMessage?: string;
  files: Record<string, string>;
}

/**
 * Runs a repoless Jules session, streams progress, and returns
 * the agent's last message along with all generated file contents.
 *
 * @param prompt The task description for Jules.
 * @param signal Optional AbortSignal for cancellation support.
 *
 * @example
 * ```ts
 * const controller = new AbortController();
 * const { agentMessage, files } = await runRepolessSession(
 *   'Analyze this CSV and generate a summary report.',
 *   controller.signal,
 * );
 * ```
 */
export async function runRepolessSession(
  prompt: string,
  signal?: AbortSignal,
): Promise<SessionOutcome> {
  signal?.throwIfAborted();

  const session = await jules.session({ prompt });

  // Non-blocking: collect generated files from outcome.
  // The .catch() prevents an unhandled rejection if this settles before we await it.
  let outcomeError: unknown;
  const outcomePromise = session.result().then(outcome => {
    console.error(`Session ${outcome.state}. PR: ${outcome.pullRequest?.url ?? 'none'}`);

    const files: Record<string, string> = {};
    for (const file of outcome.generatedFiles().all()) {
      files[file.path] = file.content;
    }
    return files;
  }).catch((err: unknown) => {
    outcomeError = err;
    return {} as Record<string, string>;
  });

  // Stream progress and capture the last agent message
  let agentMessage: string | undefined;
  await logStream(session, {
    agentMessaged: (a) => {
      agentMessage = a.message;
      console.error(`Agent: ${a.message.slice(0, 120)}`);
    },
    progressUpdated: (a) => console.error(`Progress: ${a.title}`),
  });

  const files = await outcomePromise;

  // Surface any error that occurred while collecting the outcome
  if (outcomeError) {
    throw new Error('Failed to collect session outcome', { cause: outcomeError });
  }

  return { ...(agentMessage !== undefined ? { agentMessage } : {}), files };
}
