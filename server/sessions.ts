import { OpenAPIHono, createRoute, z } from '@hono/zod-openapi';
import { getClient } from './client.ts';
import { cached, clearCache, cacheKey, CACHE_TTL_MS, SESSIONS_DEFAULT_LIMIT, SESSIONS_MAX_LIMIT, ACTIVITIES_DEFAULT_LIMIT, ACTIVITIES_MAX_LIMIT } from './cache.ts';
import { collectUpTo, boundedLimit } from './helpers.ts';
import {
  SessionConfigSchema,
  SessionSchema,
  SessionStateSchema,
  ActivitySchema,
  OkSchema,
  IdParam,
  errorResponses,
} from './types.ts';
import type { GeneratedFileSummary } from './types.ts';

export const sessionsRoutes = new OpenAPIHono();

const ListSessionsQuery = z.object({
  pageSize:  z.coerce.number().optional(),
  pageToken: z.string().optional(),
  filter:    z.string().optional(),
  limit:     z.coerce.number().optional(),
  refresh:   z.coerce.boolean().optional(),
});

// ── list sessions ─────────────────────────────────────────────────────────────

sessionsRoutes.openapi(
  createRoute({
    method: 'get', path: '/sessions', tags: ['sessions'],
    request: { query: ListSessionsQuery },
    responses: {
      200: {
        description: 'list',
        content: { 'application/json': { schema: z.object({ sessions: z.array(SessionSchema) }) } },
      },
      ...errorResponses,
    },
  }),
  async (c) => {
    const q = c.req.valid('query');
    const limit    = boundedLimit(q.limit ?? q.pageSize, SESSIONS_DEFAULT_LIMIT, SESSIONS_MAX_LIMIT);
    const pageSize = boundedLimit(q.pageSize, limit, limit);
    const key      = cacheKey(['sessions', q.filter, q.pageToken, pageSize, limit]);
    const load     = () => collectUpTo(getClient().sessions({ ...q, limit, pageSize }), limit);
    const sessions = q.refresh ? await load() : await cached(key, CACHE_TTL_MS, load);
    return c.json({ sessions });
  },
);

// ── create session ────────────────────────────────────────────────────────────

sessionsRoutes.openapi(
  createRoute({
    method: 'post', path: '/sessions', tags: ['sessions'],
    request: { body: { content: { 'application/json': { schema: SessionConfigSchema } } } },
    responses: {
      200: {
        description: 'created',
        content: {
          'application/json': {
            schema: z.object({ id: z.string(), url: z.string().optional(), state: SessionStateSchema }),
          },
        },
      },
      ...errorResponses,
    },
  }),
  async (c) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const session = await getClient().session(c.req.valid('json') as any);
    const info    = await session.info();
    clearCache();
    return c.json({ id: session.id, url: info.url, state: info.state });
  },
);

// ── get session ───────────────────────────────────────────────────────────────

sessionsRoutes.openapi(
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

// ── send message ──────────────────────────────────────────────────────────────

sessionsRoutes.openapi(
  createRoute({
    method: 'post', path: '/sessions/{id}/messages', tags: ['session'],
    request: {
      params: IdParam,
      body: { content: { 'application/json': { schema: z.object({ prompt: z.string() }) } } },
    },
    responses: {
      200: { description: 'sent', content: { 'application/json': { schema: OkSchema } } },
      ...errorResponses,
    },
  }),
  async (c) => {
    await getClient().session(c.req.valid('param').id).send(c.req.valid('json').prompt);
    clearCache();
    return c.json({ ok: true });
  },
);

// ── ask (with reply) ──────────────────────────────────────────────────────────

sessionsRoutes.openapi(
  createRoute({
    method: 'post', path: '/sessions/{id}/ask', tags: ['session'],
    request: {
      params: IdParam,
      body: { content: { 'application/json': { schema: z.object({ prompt: z.string() }) } } },
    },
    responses: {
      200: { description: 'reply', content: { 'application/json': { schema: ActivitySchema } } },
      ...errorResponses,
    },
  }),
  async (c) => c.json(
    await getClient().session(c.req.valid('param').id).ask(c.req.valid('json').prompt),
  ),
);

// ── approve plan ──────────────────────────────────────────────────────────────

sessionsRoutes.openapi(
  createRoute({
    method: 'post', path: '/sessions/{id}/approve', tags: ['session'],
    request: { params: IdParam },
    responses: {
      200: { description: 'approved', content: { 'application/json': { schema: OkSchema } } },
      ...errorResponses,
    },
  }),
  async (c) => {
    await getClient().session(c.req.valid('param').id).approve();
    clearCache();
    return c.json({ ok: true });
  },
);

// ── wait for state ────────────────────────────────────────────────────────────

sessionsRoutes.openapi(
  createRoute({
    method: 'post', path: '/sessions/{id}/waitFor', tags: ['session'],
    request: {
      params: IdParam,
      body: {
        content: {
          'application/json': {
            schema: z.object({ state: SessionStateSchema, timeoutMs: z.number().optional() }),
          },
        },
      },
    },
    responses: {
      200: { description: 'reached', content: { 'application/json': { schema: OkSchema } } },
      ...errorResponses,
    },
  }),
  async (c) => {
    const { state, timeoutMs } = c.req.valid('json');
    await getClient().session(c.req.valid('param').id).waitFor(state);
    clearCache();
    return c.json({ ok: true });
  },
);

// ── result ────────────────────────────────────────────────────────────────────

sessionsRoutes.openapi(
  createRoute({
    method: 'get', path: '/sessions/{id}/result', tags: ['session'],
    request: { params: IdParam },
    responses: {
      200: { description: 'outcome', content: { 'application/json': { schema: z.unknown() } } },
      ...errorResponses,
    },
  }),
  async (c) => {
    const outcome = await getClient().session(c.req.valid('param').id).result();
    const files: GeneratedFileSummary[] = outcome.generatedFiles().all().map((f) => ({
      path: f.path,
      changeType: f.changeType,
      additions: f.additions,
      deletions: f.deletions,
      content: f.content ?? null,
    }));
    return c.json({
      ...outcome,
      generatedFiles: files,
      changeSet: outcome.changeSet(),
    });
  },
);

// ── archive / unarchive ───────────────────────────────────────────────────────

sessionsRoutes.openapi(
  createRoute({
    method: 'post', path: '/sessions/{id}/archive', tags: ['session'],
    request: { params: IdParam },
    responses: {
      200: { description: 'archived', content: { 'application/json': { schema: OkSchema } } },
      ...errorResponses,
    },
  }),
  async (c) => {
    await getClient().session(c.req.valid('param').id).archive();
    clearCache();
    return c.json({ ok: true });
  },
);

sessionsRoutes.openapi(
  createRoute({
    method: 'post', path: '/sessions/{id}/unarchive', tags: ['session'],
    request: { params: IdParam },
    responses: {
      200: { description: 'unarchived', content: { 'application/json': { schema: OkSchema } } },
      ...errorResponses,
    },
  }),
  async (c) => {
    await getClient().session(c.req.valid('param').id).unarchive();
    clearCache();
    return c.json({ ok: true });
  },
);

// ── snapshot ──────────────────────────────────────────────────────────────────

sessionsRoutes.openapi(
  createRoute({
    method: 'get', path: '/sessions/{id}/snapshot', tags: ['session'],
    request: {
      params: IdParam,
      query: z.object({
        activities: z.coerce.boolean().optional(),
        format:     z.enum(['json', 'markdown']).optional(),
      }),
    },
    responses: {
      200: { description: 'snapshot', content: { 'application/json': { schema: z.unknown() } } },
      ...errorResponses,
    },
  }),
  async (c) => {
    const { activities, format } = c.req.valid('query');
    const snapshot = await getClient().session(c.req.valid('param').id).snapshot({ activities });
    return format === 'markdown'
      ? c.json({ markdown: snapshot.toMarkdown() })
      : c.json(snapshot.toJSON());
  },
);

// ── activities (history) ──────────────────────────────────────────────────────

sessionsRoutes.openapi(
  createRoute({
    method: 'get', path: '/sessions/{id}/activities', tags: ['session'],
    request: {
      params: IdParam,
      query: z.object({
        limit:   z.coerce.number().optional(),
        refresh: z.coerce.boolean().optional(),
      }),
    },
    responses: {
      200: {
        description: 'history',
        content: { 'application/json': { schema: z.object({ activities: z.array(ActivitySchema) }) } },
      },
      ...errorResponses,
    },
  }),
  async (c) => {
    const id    = c.req.valid('param').id;
    const q     = c.req.valid('query');
    const limit = boundedLimit(q.limit, ACTIVITIES_DEFAULT_LIMIT, ACTIVITIES_MAX_LIMIT);
    const key   = cacheKey(['activities', id, limit]);
    const load  = () => collectUpTo(getClient().session(id).history(), limit).catch((e: unknown) => {
      if (e instanceof Error && 'status' in e && (e as { status: number }).status === 404) return []
      throw e
    });
    const activities = q.refresh ? await load() : await cached(key, CACHE_TTL_MS, load);
    return c.json({ activities });
  },
);

// ── scoped activity query ─────────────────────────────────────────────────────

sessionsRoutes.openapi(
  createRoute({
    method: 'post', path: '/sessions/{id}/select', tags: ['session', 'query'],
    request: {
      params: IdParam,
      body: { content: { 'application/json': { schema: z.unknown() } } },
    },
    responses: {
      200: {
        description: 'filtered',
        content: { 'application/json': { schema: z.object({ activities: z.array(ActivitySchema) }) } },
      },
      ...errorResponses,
    },
  }),
  async (c) => {
    const activities = await getClient()
      .session(c.req.valid('param').id)
      .activities.select(c.req.valid('json') ?? {});
    return c.json({ activities });
  },
);
