import { OpenAPIHono, createRoute, z } from '@hono/zod-openapi';
import { getClient } from './client.ts';
import { errorResponses } from './types.ts';

export const syncRoutes = new OpenAPIHono();

syncRoutes.openapi(
  createRoute({
    method: 'post', path: '/sync', tags: ['sync'],
    request: {
      body: { content: { 'application/json': { schema: z.unknown() } }, required: false },
    },
    responses: {
      200: { description: 'stats', content: { 'application/json': { schema: z.unknown() } } },
      ...errorResponses,
    },
  }),
  async (c) => {
    const opts = await c.req.json().catch(() => ({}));
    return c.json(await getClient().sync(opts));
  },
);
