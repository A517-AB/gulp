/**
 * jules-server.ts — Hono sidecar for the Jules SDK
 *
 * Single Bun process. Hosts @google/jules-sdk behind REST + WebSocket.
 * Routes use @hono/zod-openapi so the OpenAPI spec is generated from the
 * Zod schemas — no separate type definitions to maintain.
 *
 *   GET  /docs            → Swagger UI
 *   GET  /openapi.json    → OpenAPI 3.1 spec (feed into openapi-typescript)
 *   GET  /health          → liveness check
 *
 * env:
 *   JULES_API_KEY   — required (or POST /connect with one)
 *   JULES_PORT      — defaults to 3939
 *   JULES_HOST      — defaults to 127.0.0.1 (do NOT bind 0.0.0.0)
 *
 * run:
 *   bun run jules-server.ts
 */

import { OpenAPIHono, createRoute, z } from '@hono/zod-openapi';
import { swaggerUI } from '@hono/swagger-ui';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import {
  connect,
  JulesApiError,
  JulesAuthenticationError,
  JulesRateLimitError,
  MissingApiKeyError,
} from '@google/jules-sdk';
import type { JulesClient } from '@google/jules-sdk';

// ── client lifecycle ─────────────────────────────────────────────────────────
let client: JulesClient | null = null;

function getClient(): JulesClient {
  if (client) return client;
  const apiKey = process.env.JULES_API_KEY;
  if (!apiKey) throw new MissingApiKeyError();
  client = connect({ apiKey });
  return client;
}

// active streams keyed by session/run id, for cancellation
const activeStreams = new Map<string, { cancel: () => void }>();

// ── shared zod schemas ───────────────────────────────────────────────────────
const SessionStateSchema = z.enum([
  'unspecified', 'queued', 'planning', 'awaitingPlanApproval',
  'awaitingUserFeedback', 'inProgress', 'paused', 'failed', 'completed',
]);

const SessionConfigSchema = z.object({
  prompt: z.string(),
  title: z.string().optional(),
  source: z.object({
    github: z.string(),
    baseBranch: z.string().optional(),
  }).optional(),
  requireApproval: z.boolean().optional(),
  autoPr: z.boolean().optional(),
}).openapi('SessionConfig');

const SessionSchema = z.object({
  id: z.string(),
  name: z.string().optional(),
  title: z.string(),
  state: SessionStateSchema,
  prompt: z.string().optional(),
  url: z.string().optional(),
  createTime: z.string(),
  updateTime: z.string(),
  archived: z.boolean().optional(),
}).passthrough().openapi('Session');

const ActivitySchema = z.object({
  id: z.string(),
  name: z.string().optional(),
  type: z.string(),
  createTime: z.string(),
  originator: z.enum(['user', 'agent', 'system']).optional(),
  artifacts: z.array(z.any()).optional(),
}).passthrough().openapi('Activity');

const SourceSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: z.literal('githubRepo'),
  githubRepo: z.object({
    defaultBranch: z.string().optional(),
    branches: z.array(z.string()).optional(),
  }).passthrough(),
}).openapi('Source');

const OkSchema = z.object({ ok: z.boolean() }).openapi('Ok');
const ErrorSchema = z.object({
  error: z.string(),
  message: z.string(),
  status: z.number().optional(),
}).openapi('Error');

const errorResponses = {
  400: { description: 'Bad request', content: { 'application/json': { schema: ErrorSchema } } },
  401: { description: 'Auth failed', content: { 'application/json': { schema: ErrorSchema } } },
  404: { description: 'Not found', content: { 'application/json': { schema: ErrorSchema } } },
  429: { description: 'Too many requests', content: { 'application/json': { schema: ErrorSchema } } },
  500: { description: 'Server error', content: { 'application/json': { schema: ErrorSchema } } },
};

type CacheEntry<T> = {
  expiresAt: number;
  value: T;
};

const responseCache = new Map<string, CacheEntry<unknown>>();
const inFlight = new Map<string, Promise<unknown>>();

const CACHE_TTL_MS = 10_000;
const SESSIONS_DEFAULT_LIMIT = 20;
const SESSIONS_MAX_LIMIT = 50;
const ACTIVITIES_DEFAULT_LIMIT = 50;
const ACTIVITIES_MAX_LIMIT = 200;

// SDK pattern note:
// src/good shit/simple/{main,repoless}.ts uses session.info() for metadata,
// session.stream()/run.stream() for live work, and result()/generatedFiles()/
// changeSet() for final outputs. Keep REST reads bounded and cached; use WS
// streams for live feeds instead of repeatedly replaying full history().

function cacheKey(parts: unknown[]): string {
  return parts.map((part) => String(part ?? '')).join(':');
}

async function cached<T>(key: string, ttlMs: number, load: () => Promise<T>): Promise<T> {
  const now = Date.now();
  const entry = responseCache.get(key) as CacheEntry<T> | undefined;
  if (entry && entry.expiresAt > now) return entry.value;

  const pending = inFlight.get(key) as Promise<T> | undefined;
  if (pending) return pending;

  const promise = load()
    .then((value) => {
      responseCache.set(key, { value, expiresAt: Date.now() + ttlMs });
      return value;
    })
    .finally(() => {
      inFlight.delete(key);
    });

  inFlight.set(key, promise);
  return promise;
}

function clearReadCache(): void {
  responseCache.clear();
}

// ── helper: collect async iterable to array ──────────────────────────────────
async function collect<T>(iter: AsyncIterable<T>): Promise<T[]> {
  const out: T[] = [];
  for await (const x of iter) out.push(x);
  return out;
}

async function collectUpTo<T>(iter: AsyncIterable<T>, limit: number): Promise<T[]> {
  const out: T[] = [];
  for await (const x of iter) {
    out.push(x);
    if (out.length >= limit) break;
  }
  return out;
}

function boundedLimit(value: number | undefined, fallback: number, max: number): number {
  if (!Number.isFinite(value) || value === undefined || value < 1) return fallback;
  return Math.min(Math.floor(value), max);
}

// ── app ──────────────────────────────────────────────────────────────────────
const app = new OpenAPIHono();

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

// concurrency queue — at most 4 SDK calls in flight; extras wait, none are dropped
const FAST_PATHS = new Set(['/health', '/docs', '/openapi.json', '/connected', '/streams']);
let activeCount = 0;
const waitQueue: Array<() => void> = [];
const MAX_CONCURRENT = 4;

app.use('*', async (c, next) => {
  if (FAST_PATHS.has(c.req.path)) return next();
  if (activeCount >= MAX_CONCURRENT) {
    await new Promise<void>(resolve => waitQueue.push(resolve));
  }
  activeCount++;
  try {
    return await next();
  } finally {
    activeCount--;
    waitQueue.shift()?.();
  }
});

// global error mapper for SDK exceptions → proper HTTP status
app.onError((err, c) => {
  console.error(err);
  if (err instanceof JulesAuthenticationError) return c.json({ error: 'AuthError', message: err.message, status: 401 }, 401);
  if (err instanceof JulesRateLimitError) return c.json({ error: 'RateLimit', message: err.message, status: 429 }, 429);
  if (err instanceof MissingApiKeyError) return c.json({ error: 'MissingApiKey', message: err.message, status: 401 }, 401);
  if (err instanceof JulesApiError) {
    const status = (err.status >= 400 && err.status < 600 ? err.status : 500) as 400 | 401 | 404 | 500;
    return c.json({ error: 'JulesApiError', message: err.message, status: err.status }, status);
  }
  return c.json({ error: err.name, message: err.message, status: 500 }, 500);
});

// ── health ───────────────────────────────────────────────────────────────────
app.openapi(
  createRoute({
    method: 'get', path: '/health', tags: ['meta'],
    responses: { 200: { description: 'ok', content: { 'application/json': { schema: z.object({ ok: z.boolean(), pid: z.number(), uptime: z.number() }) } } } },
  }),
  (c) => c.json({ ok: true, pid: process.pid, uptime: process.uptime() }),
);

// ── connection ───────────────────────────────────────────────────────────────
app.openapi(
  createRoute({
    method: 'post', path: '/connect', tags: ['connection'],
    request: { body: { content: { 'application/json': { schema: z.object({ apiKey: z.string() }) } } } },
    responses: { 200: { description: 'connected', content: { 'application/json': { schema: OkSchema } } }, ...errorResponses },
  }),
  (c) => {
    const { apiKey } = c.req.valid('json');
    client = connect({ apiKey });
    clearReadCache();
    return c.json({ ok: true });
  },
);

app.openapi(
  createRoute({
    method: 'post', path: '/disconnect', tags: ['connection'],
    responses: { 200: { description: 'disconnected', content: { 'application/json': { schema: OkSchema } } } },
  }),
  (c) => { client = null; clearReadCache(); return c.json({ ok: true }); },
);

app.openapi(
  createRoute({
    method: 'get', path: '/connected', tags: ['connection'],
    responses: { 200: { description: 'status', content: { 'application/json': { schema: z.object({ connected: z.boolean() }) } } } },
  }),
  (c) => c.json({ connected: client !== null || !!process.env.JULES_API_KEY }),
);

// ── sources ──────────────────────────────────────────────────────────────────
app.openapi(
  createRoute({
    method: 'get', path: '/sources', tags: ['sources'],
    responses: {
      200: { description: 'list', content: { 'application/json': { schema: z.object({ sources: z.array(SourceSchema) }) } } },
      ...errorResponses,
    },
  }),
  async (c) => {
    const sources = await collect(getClient().sources());
    return c.json({ sources });
  },
);

app.openapi(
  createRoute({
    method: 'get', path: '/sources/{owner}/{repo}', tags: ['sources'],
    request: { params: z.object({ owner: z.string(), repo: z.string() }) },
    responses: {
      200: { description: 'source', content: { 'application/json': { schema: SourceSchema.nullable() } } },
      ...errorResponses,
    },
  }),
  async (c) => {
    const { owner, repo } = c.req.valid('param');
    const source = await getClient().sources.get({ github: `${owner}/${repo}` });
    return c.json(source ?? null);
  },
);

// ── sessions (collection) ────────────────────────────────────────────────────
const ListSessionsQuery = z.object({
  pageSize: z.coerce.number().optional(),
  pageToken: z.string().optional(),
  filter: z.string().optional(),
  limit: z.coerce.number().optional(),
  refresh: z.coerce.boolean().optional(),
});

app.openapi(
  createRoute({
    method: 'get', path: '/sessions', tags: ['sessions'],
    request: { query: ListSessionsQuery },
    responses: {
      200: { description: 'list', content: { 'application/json': { schema: z.object({ sessions: z.array(SessionSchema) }) } } },
      ...errorResponses,
    },
  }),
  async (c) => {
    const query = c.req.valid('query');
    const limit = boundedLimit(query.limit ?? query.pageSize, SESSIONS_DEFAULT_LIMIT, SESSIONS_MAX_LIMIT);
    const pageSize = boundedLimit(query.pageSize, limit, limit);
    const key = cacheKey(['sessions', query.filter, query.pageToken, pageSize, limit]);
    const sessions = query.refresh
      ? await collectUpTo(getClient().sessions({ ...query, limit, pageSize }), limit)
      : await cached(key, CACHE_TTL_MS, () => collectUpTo(getClient().sessions({ ...query, limit, pageSize }), limit));
    return c.json({ sessions });
  },
);

app.openapi(
  createRoute({
    method: 'post', path: '/sessions', tags: ['sessions'],
    request: { body: { content: { 'application/json': { schema: SessionConfigSchema } } } },
    responses: {
      200: { description: 'created', content: { 'application/json': { schema: z.object({ id: z.string(), url: z.string().optional(), state: SessionStateSchema }) } } },
      ...errorResponses,
    },
  }),
  async (c) => {
    const session = await getClient().session(c.req.valid('json'));
    const info = await session.info();
    clearReadCache();
    return c.json({ id: session.id, url: info.url, state: info.state });
  },
);

// ── single session ───────────────────────────────────────────────────────────
const IdParam = z.object({ id: z.string() });

app.openapi(
  createRoute({
    method: 'get', path: '/sessions/{id}', tags: ['session'],
    request: { params: IdParam },
    responses: {
      200: { description: 'info', content: { 'application/json': { schema: SessionSchema } } },
      ...errorResponses,
    },
  }),
  async (c) => c.json(await getClient().session(c.req.valid('param').id).info()),
);

app.openapi(
  createRoute({
    method: 'post', path: '/sessions/{id}/messages', tags: ['session'],
    request: {
      params: IdParam,
      body: { content: { 'application/json': { schema: z.object({ prompt: z.string() }) } } },
    },
    responses: { 200: { description: 'sent', content: { 'application/json': { schema: OkSchema } } }, ...errorResponses },
  }),
  async (c) => {
    await getClient().session(c.req.valid('param').id).send(c.req.valid('json').prompt);
    clearReadCache();
    return c.json({ ok: true });
  },
);

app.openapi(
  createRoute({
    method: 'post', path: '/sessions/{id}/ask', tags: ['session'],
    request: {
      params: IdParam,
      body: { content: { 'application/json': { schema: z.object({ prompt: z.string() }) } } },
    },
    responses: { 200: { description: 'reply', content: { 'application/json': { schema: ActivitySchema } } }, ...errorResponses },
  }),
  async (c) => c.json(await getClient().session(c.req.valid('param').id).ask(c.req.valid('json').prompt)),
);

app.openapi(
  createRoute({
    method: 'post', path: '/sessions/{id}/approve', tags: ['session'],
    request: { params: IdParam },
    responses: { 200: { description: 'approved', content: { 'application/json': { schema: OkSchema } } }, ...errorResponses },
  }),
  async (c) => {
    await getClient().session(c.req.valid('param').id).approve();
    clearReadCache();
    return c.json({ ok: true });
  },
);

app.openapi(
  createRoute({
    method: 'post', path: '/sessions/{id}/waitFor', tags: ['session'],
    request: {
      params: IdParam,
      body: { content: { 'application/json': { schema: z.object({ state: SessionStateSchema, timeoutMs: z.number().optional() }) } } },
    },
    responses: { 200: { description: 'reached', content: { 'application/json': { schema: OkSchema } } }, ...errorResponses },
  }),
  async (c) => {
    const { state, timeoutMs } = c.req.valid('json');
    await getClient().session(c.req.valid('param').id).waitFor(state, { timeoutMs });
    clearReadCache();
    return c.json({ ok: true });
  },
);

app.openapi(
  createRoute({
    method: 'get', path: '/sessions/{id}/result', tags: ['session'],
    request: { params: IdParam },
    responses: { 200: { description: 'outcome', content: { 'application/json': { schema: z.any() } } }, ...errorResponses },
  }),
  async (c) => {
    const outcome = await getClient().session(c.req.valid('param').id).result();
    return c.json({
      ...outcome,
      generatedFiles: outcome.generatedFiles().all(),
      changeSet: outcome.changeSet(),
    });
  },
);

app.openapi(
  createRoute({
    method: 'post', path: '/sessions/{id}/archive', tags: ['session'],
    request: { params: IdParam },
    responses: { 200: { description: 'archived', content: { 'application/json': { schema: OkSchema } } }, ...errorResponses },
  }),
  async (c) => { await getClient().session(c.req.valid('param').id).archive(); clearReadCache(); return c.json({ ok: true }); },
);

app.openapi(
  createRoute({
    method: 'post', path: '/sessions/{id}/unarchive', tags: ['session'],
    request: { params: IdParam },
    responses: { 200: { description: 'unarchived', content: { 'application/json': { schema: OkSchema } } }, ...errorResponses },
  }),
  async (c) => { await getClient().session(c.req.valid('param').id).unarchive(); clearReadCache(); return c.json({ ok: true }); },
);

app.openapi(
  createRoute({
    method: 'get', path: '/sessions/{id}/snapshot', tags: ['session'],
    request: {
      params: IdParam,
      query: z.object({
        activities: z.coerce.boolean().optional(),
        format: z.enum(['json', 'markdown']).optional(),
      }),
    },
    responses: { 200: { description: 'snapshot', content: { 'application/json': { schema: z.any() } } }, ...errorResponses },
  }),
  async (c) => {
    const { activities, format } = c.req.valid('query');
    const snapshot = await getClient().session(c.req.valid('param').id).snapshot({ activities });
    return format === 'markdown' ? c.json({ markdown: snapshot.toMarkdown() }) : c.json(snapshot.toJSON());
  },
);

app.openapi(
  createRoute({
    method: 'get', path: '/sessions/{id}/activities', tags: ['session'],
    request: {
      params: IdParam,
      query: z.object({
        limit: z.coerce.number().optional(),
        refresh: z.coerce.boolean().optional(),
      }),
    },
    responses: {
      200: { description: 'history', content: { 'application/json': { schema: z.object({ activities: z.array(ActivitySchema) }) } } },
      ...errorResponses,
    },
  }),
  async (c) => {
    const id = c.req.valid('param').id;
    const query = c.req.valid('query');
    const limit = boundedLimit(query.limit, ACTIVITIES_DEFAULT_LIMIT, ACTIVITIES_MAX_LIMIT);
    const key = cacheKey(['activities', id, limit]);
    const load = () => collectUpTo(getClient().session(id).history(), limit);
    const activities = query.refresh ? await load() : await cached(key, CACHE_TTL_MS, load);
    return c.json({ activities });
  },
);

app.openapi(
  createRoute({
    method: 'post', path: '/sessions/{id}/select', tags: ['session', 'query'],
    request: {
      params: IdParam,
      body: { content: { 'application/json': { schema: z.any() } } },
    },
    responses: {
      200: { description: 'filtered', content: { 'application/json': { schema: z.object({ activities: z.array(ActivitySchema) }) } } },
      ...errorResponses,
    },
  }),
  async (c) => {
    const opts = c.req.valid('json') ?? {};
    const activities = await getClient().session(c.req.valid('param').id).activities.select(opts);
    return c.json({ activities });
  },
);

// ── run (automated, fire-and-forget) ─────────────────────────────────────────
app.openapi(
  createRoute({
    method: 'post', path: '/run', tags: ['run'],
    request: { body: { content: { 'application/json': { schema: SessionConfigSchema } } } },
    responses: { 200: { description: 'started', content: { 'application/json': { schema: z.object({ id: z.string() }) } } }, ...errorResponses },
  }),
  async (c) => {
    const run = await getClient().run(c.req.valid('json'));
    clearReadCache();
    return c.json({ id: run.id });
  },
);

// ── batch ────────────────────────────────────────────────────────────────────
app.openapi(
  createRoute({
    method: 'post', path: '/batch', tags: ['batch'],
    request: {
      body: {
        content: {
          'application/json': {
            schema: z.object({
              configs: z.array(SessionConfigSchema),
              concurrency: z.number().optional(),
              stopOnError: z.boolean().optional(),
              delayMs: z.number().optional(),
            }),
          },
        },
      },
    },
    responses: {
      200: { description: 'started', content: { 'application/json': { schema: z.object({ sessions: z.array(z.object({ id: z.string() })) }) } } },
      ...errorResponses,
    },
  }),
  async (c) => {
    const { configs, ...opts } = c.req.valid('json');
    const sessions = await getClient().all(configs, (config) => config, opts);
    clearReadCache();
    return c.json({ sessions: sessions.map((s) => ({ id: s.id })) });
  },
);

// ── local query (JQL) ────────────────────────────────────────────────────────
app.openapi(
  createRoute({
    method: 'post', path: '/select', tags: ['query'],
    request: { body: { content: { 'application/json': { schema: z.any() } } } },
    responses: { 200: { description: 'results', content: { 'application/json': { schema: z.object({ results: z.array(z.any()) }) } } }, ...errorResponses },
  }),
  async (c) => {
    const results = await getClient().select(c.req.valid('json'));
    return c.json({ results });
  },
);

// ── sync ─────────────────────────────────────────────────────────────────────
app.openapi(
  createRoute({
    method: 'post', path: '/sync', tags: ['sync'],
    request: { body: { content: { 'application/json': { schema: z.any() } }, required: false } },
    responses: { 200: { description: 'stats', content: { 'application/json': { schema: z.any() } } }, ...errorResponses },
  }),
  async (c) => {
    const opts = await c.req.json().catch(() => ({}));
    return c.json(await getClient().sync(opts));
  },
);

// ── stream control ───────────────────────────────────────────────────────────
app.openapi(
  createRoute({
    method: 'get', path: '/streams', tags: ['streams'],
    responses: { 200: { description: 'list', content: { 'application/json': { schema: z.object({ streams: z.array(z.string()) }) } } } },
  }),
  (c) => c.json({ streams: [...activeStreams.keys()] }),
);

app.openapi(
  createRoute({
    method: 'delete', path: '/streams/{id}', tags: ['streams'],
    request: { params: IdParam },
    responses: { 200: { description: 'cancelled', content: { 'application/json': { schema: z.object({ cancelled: z.boolean() }) } } } },
  }),
  (c) => {
    const id = c.req.valid('param').id;
    const s = activeStreams.get(id);
    if (!s) return c.json({ cancelled: false });
    s.cancel();
    activeStreams.delete(id);
    return c.json({ cancelled: true });
  },
);

// ── docs ─────────────────────────────────────────────────────────────────────
app.doc('/openapi.json', {
  openapi: '3.1.0',
  info: { version: '0.1.0', title: 'Jules SDK Sidecar', description: 'REST + WebSocket bridge to @google/jules-sdk. Local-only.' },
  servers: [{ url: `http://${process.env.JULES_HOST ?? '127.0.0.1'}:${process.env.JULES_PORT ?? 3939}` }],
});

app.get('/docs', swaggerUI({ url: '/openapi.json' }));

// ── websocket streaming (Bun-native) ─────────────────────────────────────────
//
// Hono's WS adapter for Bun is fine but using Bun.serve directly gives clean
// access to ws.data per connection. Endpoints:
//   /ws/sessions/:id/stream    → full history + future activities
//   /ws/sessions/:id/updates   → only future activities
//   /ws/run                    → send {type:'start',config} → live activities
//   /ws/sync                   → send sync opts → progress events
//
// Each WS message is JSON: {type:'activity'|'update'|'done'|'error'|'progress'|'started', ...}

type WsKind = 'session-stream' | 'session-updates' | 'run' | 'sync';

interface WsData {
  kind: WsKind;
  id: string;
  cancelled: boolean;
}

const PORT = Number(process.env.JULES_PORT ?? 3939);
const HOST = process.env.JULES_HOST ?? '127.0.0.1';

const server = Bun.serve<WsData, {}>({
  port: PORT,
  hostname: HOST,
  idleTimeout: 120,
  async fetch(req, server) {
    const url = new URL(req.url);

    // ── upgrade to WS for /ws/* paths ───────────────────────────────────────
    if (url.pathname.startsWith('/ws/')) {
      const wsSession = url.pathname.match(/^\/ws\/sessions\/([^/]+)\/(stream|updates)$/);
      if (wsSession) {
        const id = wsSession[1];
        const kind: WsKind = wsSession[2] === 'stream' ? 'session-stream' : 'session-updates';
        if (server.upgrade(req, { data: { kind, id, cancelled: false } })) return undefined;
      }
      if (url.pathname === '/ws/run') {
        if (server.upgrade(req, { data: { kind: 'run', id: `run-${Date.now()}`, cancelled: false } })) return undefined;
      }
      if (url.pathname === '/ws/sync') {
        if (server.upgrade(req, { data: { kind: 'sync', id: `sync-${Date.now()}`, cancelled: false } })) return undefined;
      }
      return new Response('WS upgrade failed', { status: 400 });
    }

    // ── otherwise hand off to Hono ──────────────────────────────────────────
    return app.fetch(req);
  },

  websocket: {
    open(ws) {
      const { kind, id } = ws.data;
      ws.data.cancelled = false;
      activeStreams.set(id, { cancel: () => { ws.data.cancelled = true; ws.close(); } });

      // session streams start immediately on open; run/sync wait for the first message
      if (kind === 'session-stream' || kind === 'session-updates') {
        runSessionStream(ws, kind, id).catch((err) => {
          ws.send(JSON.stringify({ type: 'error', error: err instanceof Error ? err.message : String(err) }));
          ws.close();
        });
      }
    },

    async message(ws, raw) {
      const { kind } = ws.data;
      try {
        const msg = JSON.parse(raw.toString());
        if (kind === 'run' && msg.type === 'start') await runRunStream(ws, msg.config);
        else if (kind === 'sync') await runSyncStream(ws, msg ?? {});
      } catch (err) {
        ws.send(JSON.stringify({ type: 'error', error: err instanceof Error ? err.message : String(err) }));
        ws.close();
      }
    },

    close(ws) {
      ws.data.cancelled = true;
      activeStreams.delete(ws.data.id);
    },
  },
});

// ── ws handlers ──────────────────────────────────────────────────────────────
async function runSessionStream(ws: any, kind: 'session-stream' | 'session-updates', id: string) {
  const session = getClient().session(id);
  const iter = kind === 'session-stream' ? session.stream() : session.updates();
  const eventName = kind === 'session-stream' ? 'activity' : 'update';

  for await (const activity of iter) {
    if (ws.data.cancelled) return;
    ws.send(JSON.stringify({ type: eventName, activity }));
  }
  if (kind === 'session-stream' && !ws.data.cancelled) {
    const outcome = await session.result();
    ws.send(JSON.stringify({
      type: 'done',
      outcome: { ...outcome, generatedFiles: outcome.generatedFiles().all(), changeSet: outcome.changeSet() },
    }));
    ws.close();
  }
}

async function runRunStream(ws: any, config: any) {
  const run = await getClient().run(config);
  const realId = run.id;
  // re-key under the actual run id so external cancellation works
  activeStreams.delete(ws.data.id);
  ws.data.id = realId;
  activeStreams.set(realId, { cancel: () => { ws.data.cancelled = true; ws.close(); } });
  ws.send(JSON.stringify({ type: 'started', id: realId }));

  for await (const activity of run.stream()) {
    if (ws.data.cancelled) return;
    ws.send(JSON.stringify({ type: 'activity', activity }));
  }
  if (!ws.data.cancelled) {
    const outcome = await run.result();
    ws.send(JSON.stringify({
      type: 'done',
      outcome: { ...outcome, generatedFiles: outcome.generatedFiles().all(), changeSet: outcome.changeSet() },
    }));
    ws.close();
  }
}

async function runSyncStream(ws: any, opts: any) {
  const stats = await getClient().sync({
    ...opts,
    onProgress: (progress: any) => {
      if (!ws.data.cancelled) ws.send(JSON.stringify({ type: 'progress', progress }));
    },
  });
  if (!ws.data.cancelled) {
    ws.send(JSON.stringify({ type: 'done', stats }));
    ws.close();
  }
}

// ── boot ─────────────────────────────────────────────────────────────────────
console.log(`✔ Jules sidecar live on http://${HOST}:${PORT}`);
console.log(`  Swagger UI:  http://${HOST}:${PORT}/docs`);
console.log(`  OpenAPI:     http://${HOST}:${PORT}/openapi.json`);
console.log(`  WS streams:  ws://${HOST}:${PORT}/ws/sessions/:id/{stream|updates}`);

const shutdown = (sig: string) => {
  console.log(`\n${sig} received, closing...`);
  for (const s of activeStreams.values()) s.cancel();
  server.stop();
  process.exit(0);
};
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
