import { OpenAPIHono } from '@hono/zod-openapi';
import { swaggerUI } from '@hono/swagger-ui';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import {
  JulesApiError,
  JulesAuthenticationError,
  JulesRateLimitError,
  JulesNetworkError,
  MissingApiKeyError,
  TimeoutError,
  AutomatedSessionFailedError,
  InvalidStateError,
  SourceNotFoundError,
  SyncInProgressError,
} from '@google/jules-sdk';
import { connectionRoutes }  from './connection.ts';
import { sourcesRoutes }     from './sources.ts';
import { sessionsRoutes }    from './sessions.ts';
import { artifactsRoutes }   from './artifacts.ts';
import { runsRoutes }        from './runs.ts';
import { queryRoutes }       from './query.ts';
import { syncRoutes }        from './sync.ts';
import { streamsRoutes }     from './streams.ts';
import { utilsRoutes }       from './utils.ts';

// ── concurrency queue ─────────────────────────────────────────────────────────

const FAST_PATHS = new Set(['/health', '/docs', '/openapi.json', '/connected', '/streams']);
const MAX_CONCURRENT = 4;
let activeCount = 0;
const waitQueue: Array<() => void> = [];

// ── app ───────────────────────────────────────────────────────────────────────

export const app = new OpenAPIHono();

app.use('*', logger());
app.use('*', cors({
  origin: (origin) => {
    if (!origin) return null;
    if (/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) return origin;
    if (/^app:\/\//.test(origin) || /^file:\/\//.test(origin)) return origin;
    return null;
  },
  credentials: true,
}));

app.use('*', async (c, next) => {
  if (FAST_PATHS.has(c.req.path)) return next();
  if (activeCount >= MAX_CONCURRENT) {
    await new Promise<void>((resolve) => waitQueue.push(resolve));
  }
  activeCount++;
  try {
    return await next();
  } finally {
    activeCount--;
    waitQueue.shift()?.();
  }
});

// ── error handler ─────────────────────────────────────────────────────────────

app.onError((err, c) => {
  console.error(err);
  if (err instanceof JulesAuthenticationError)
    return c.json({ error: 'AuthError',       message: err.message, status: 401 }, 401);
  if (err instanceof JulesRateLimitError)
    return c.json({ error: 'RateLimit',        message: err.message, status: 429 }, 429);
  if (err instanceof MissingApiKeyError)
    return c.json({ error: 'MissingApiKey',    message: err.message, status: 401 }, 401);
  if (err instanceof TimeoutError)
    return c.json({ error: 'Timeout',          message: err.message, status: 408 }, 408);
  if (err instanceof AutomatedSessionFailedError)
    return c.json({ error: 'SessionFailed',    message: err.message, status: 422 }, 422);
  if (err instanceof InvalidStateError)
    return c.json({ error: 'InvalidState',     message: err.message, status: 409 }, 409);
  if (err instanceof SourceNotFoundError)
    return c.json({ error: 'SourceNotFound',   message: err.message, status: 404 }, 404);
  if (err instanceof SyncInProgressError)
    return c.json({ error: 'SyncInProgress',   message: err.message, status: 409 }, 409);
  if (err instanceof JulesNetworkError)
    return c.json({ error: 'NetworkError',     message: err.message, status: 503 }, 503);
  if (err instanceof JulesApiError) {
    const status = (err.status >= 400 && err.status < 600 ? err.status : 500) as 400 | 401 | 404 | 500;
    return c.json({ error: 'JulesApiError',    message: err.message, status: err.status }, status);
  }
  return c.json({ error: err.name, message: err.message, status: 500 }, 500);
});

// ── routes ────────────────────────────────────────────────────────────────────

app.route('/', connectionRoutes);
app.route('/', sourcesRoutes);
app.route('/', sessionsRoutes);
app.route('/', artifactsRoutes);
app.route('/', runsRoutes);
app.route('/', queryRoutes);
app.route('/', syncRoutes);
app.route('/', streamsRoutes);
app.route('/', utilsRoutes);

// ── docs ──────────────────────────────────────────────────────────────────────

const HOST = process.env.JULES_HOST ?? '127.0.0.1';
const PORT = process.env.JULES_PORT ?? '3939';

app.doc('/openapi.json', {
  openapi: '3.1.0',
  info: {
    version: '0.2.0',
    title: 'Jules SDK Sidecar',
    description: 'REST + WebSocket bridge to @google/jules-sdk. Local-only.',
  },
  servers: [{ url: `http://${HOST}:${PORT}` }],
});

app.get('/docs', swaggerUI({ url: '/openapi.json' }));
