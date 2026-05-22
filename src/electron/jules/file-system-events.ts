import { jules } from '@google/jules-sdk';
import chokidar from 'chokidar';
import fs from 'fs/promises';
import path from 'path';
import '../_shared/check-env.js';
import { resolveSource } from '../_shared/resolve-source.js';
import { logStream } from '../_shared/log-stream.js';

const rawDir = process.env.WATCH_DIR || 'watched-directory';
const WATCH_DIR = path.resolve(process.cwd(), rawDir);

// Guard against path traversal (e.g., WATCH_DIR="../../etc")
if (!WATCH_DIR.startsWith(process.cwd())) {
  console.error(`Error: WATCH_DIR must resolve inside the working directory. Got: ${WATCH_DIR}`);
  process.exit(1);
}

await fs.mkdir(WATCH_DIR, { recursive: true });

const source = resolveSource();

/** Debounce timers keyed by absolute filepath to avoid rapid duplicate sessions. */
const debounceTimers = new Map<string, ReturnType<typeof setTimeout>>();
const DEBOUNCE_MS = 500;

async function handleFileEvent(event: string, filepath: string) {
  console.log(`\n[${event}] ${filepath}`);

  let content: string;
  try {
    content = await fs.readFile(filepath, 'utf-8');
  } catch (err) {
    // File may have been deleted between the event firing and the read attempt
    console.warn(`Skipping ${filepath}: could not read file (${(err as NodeJS.ErrnoException).code ?? err})`);
    return;
  }

  const session = await jules.session({
    prompt: `A file was ${event}.\nPath: ${filepath}\nContent:\n\`\`\`\n${content}\n\`\`\`\nReview and suggest improvements.`,
    source,
  });

  console.log(`Session created: ${session.id}`);

  session.result().then(outcome => {
    console.log(`Session ${outcome.state}. PR: ${outcome.pullRequest?.url ?? 'none'}`);
  }).catch((err: unknown) => {
    console.error(`Session ${session.id} result error:`, err);
  });

  await logStream(session, {
    agentMessaged: (a) => console.log(`Agent: ${a.message}`),
    progressUpdated: (a) => console.log(`Progress: ${a.title}`),
  });
}

/**
 * Debounced wrapper: resets the timer on every call for the same filepath,
 * so only the last event within {@link DEBOUNCE_MS} is actually processed.
 */
function debouncedHandleFileEvent(event: string, filepath: string) {
  const existing = debounceTimers.get(filepath);
  if (existing) clearTimeout(existing);

  debounceTimers.set(
    filepath,
    setTimeout(() => {
      debounceTimers.delete(filepath);
      handleFileEvent(event, filepath).catch((err) => {
        console.error(`Error handling ${event} for ${filepath}:`, err);
      });
    }, DEBOUNCE_MS),
  );
}

console.log(`Watching: ${WATCH_DIR}`);
console.log(`Source: ${source.github} (${source.baseBranch})`);

const watcher = chokidar.watch(WATCH_DIR, {
  ignored: /(^|[\/\\])\../,
  persistent: true,
  ignoreInitial: true,
});

watcher
  .on('add', (p) => debouncedHandleFileEvent('added', p))
  .on('change', (p) => debouncedHandleFileEvent('changed', p));

process.on('SIGINT', () => {
  watcher.close();
  process.exit(0);
});
