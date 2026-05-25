import { OpenAPIHono, createRoute, z } from '@hono/zod-openapi';
import { setClient, clearClient, isConnected } from './client.ts';
import { clearCache } from './cache.ts';
import { OkSchema, errorResponses } from './types.ts';

export const connectionRoutes = new OpenAPIHono();

connectionRoutes.openapi(
  createRoute({
    method: 'get', path: '/health', tags: ['meta'],
    responses: {
      200: {
        description: 'ok',
        content: { 'application/json': { schema: z.object({ ok: z.boolean(), pid: z.number(), uptime: z.number() }) } },
      },
    },
  }),
  (c) => c.json({ ok: true, pid: process.pid, uptime: process.uptime() }),
);

connectionRoutes.openapi(
  createRoute({
    method: 'post', path: '/connect', tags: ['connection'],
    request: { body: { content: { 'application/json': { schema: z.object({ apiKey: z.string() }) } } } },
    responses: {
      200: { description: 'connected', content: { 'application/json': { schema: OkSchema } } },
      ...errorResponses,
    },
  }),
  (c) => {
    const { apiKey } = c.req.valid('json');
    setClient(apiKey);
    clearCache();
    return c.json({ ok: true });
  },
);

connectionRoutes.openapi(
  createRoute({
    method: 'post', path: '/disconnect', tags: ['connection'],
    responses: {
      200: { description: 'disconnected', content: { 'application/json': { schema: OkSchema } } },
    },
  }),
  (c) => {
    clearClient();
    clearCache();
    return c.json({ ok: true });
  },
);

connectionRoutes.openapi(
  createRoute({
    method: 'get', path: '/connected', tags: ['connection'],
    responses: {
      200: {
        description: 'status',
        content: { 'application/json': { schema: z.object({ connected: z.boolean() }) } },
      },
    },
  }),
  (c) => c.json({ connected: isConnected() }),
);
