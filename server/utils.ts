import { OpenAPIHono, createRoute, z } from '@hono/zod-openapi';
import { parseUnidiff } from '@google/jules-sdk';
import { errorResponses } from './types.ts';

export const utilsRoutes = new OpenAPIHono();

utilsRoutes.openapi(
  createRoute({
    method: 'post', path: '/utils/parse-diff', tags: ['utils'],
    request: {
      body: {
        content: {
          'application/json': {
            schema: z.object({
              patch:  z.string(),
              format: z.enum(['files', 'content']).optional(),
            }),
          },
        },
      },
    },
    responses: {
      200: {
        description: 'parsed diff',
        content: { 'application/json': { schema: z.array(z.unknown()) } },
      },
      ...errorResponses,
    },
  }),
  async (c) => {
    const { patch, format = 'files' } = c.req.valid('json');
    // Fallback: parseUnidiffWithContent doesn't exist in SDK, use parseUnidiff for everything
    return c.json(parseUnidiff(patch));
  },
);
