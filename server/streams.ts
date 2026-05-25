import { OpenAPIHono, createRoute, z } from '@hono/zod-openapi';
import { activeStreams } from './ws.ts';
import { IdParam } from './types.ts';

export const streamsRoutes = new OpenAPIHono();

streamsRoutes.openapi(
  createRoute({
    method: 'get', path: '/streams', tags: ['streams'],
    responses: {
      200: {
        description: 'list',
        content: { 'application/json': { schema: z.object({ streams: z.array(z.string()) }) } },
      },
    },
  }),
  (c) => c.json({ streams: [...activeStreams.keys()] }),
);

streamsRoutes.openapi(
  createRoute({
    method: 'delete', path: '/streams/{id}', tags: ['streams'],
    request: { params: IdParam },
    responses: {
      200: {
        description: 'cancelled',
        content: { 'application/json': { schema: z.object({ cancelled: z.boolean() }) } },
      },
    },
  }),
  (c) => {
    const id = c.req.valid('param').id;
    const s  = activeStreams.get(id);
    if (!s) return c.json({ cancelled: false });
    s.cancel();
    activeStreams.delete(id);
    return c.json({ cancelled: true });
  },
);
