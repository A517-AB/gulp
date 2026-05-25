import { OpenAPIHono, createRoute, z } from '@hono/zod-openapi';
import { getClient } from './client.ts';
import { clearCache } from './cache.ts';
import { SessionConfigSchema, errorResponses } from './types.ts';

export const runsRoutes = new OpenAPIHono();

// ── automated run ─────────────────────────────────────────────────────────────

runsRoutes.openapi(
  createRoute({
    method: 'post', path: '/run', tags: ['run'],
    request: { body: { content: { 'application/json': { schema: SessionConfigSchema } } } },
    responses: {
      200: {
        description: 'started',
        content: { 'application/json': { schema: z.object({ id: z.string() }) } },
      },
      ...errorResponses,
    },
  }),
  async (c) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const run = await getClient().run(c.req.valid('json') as any);
    clearCache();
    return c.json({ id: run.id });
  },
);

// ── batch runs ────────────────────────────────────────────────────────────────

const BatchSchema = z.object({
  configs:      z.array(SessionConfigSchema),
  concurrency:  z.number().optional(),
  stopOnError:  z.boolean().optional(),
  delayMs:      z.number().optional(),
});

runsRoutes.openapi(
  createRoute({
    method: 'post', path: '/batch', tags: ['batch'],
    request: { body: { content: { 'application/json': { schema: BatchSchema } } } },
    responses: {
      200: {
        description: 'started',
        content: {
          'application/json': {
            schema: z.object({ sessions: z.array(z.object({ id: z.string() })) }),
          },
        },
      },
      ...errorResponses,
    },
  }),
  async (c) => {
    const { configs, ...opts } = c.req.valid('json');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sessions = await getClient().all(configs as any[], (config: any) => config, opts);
    clearCache();
    return c.json({ sessions: sessions.map((s) => ({ id: s.id })) });
  },
);
