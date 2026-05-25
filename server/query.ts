import { OpenAPIHono, createRoute, z } from '@hono/zod-openapi';
import { getClient } from './client.ts';
import { validateQuery, formatValidationResult } from '@google/jules-sdk';
import { errorResponses } from './types.ts';

export const queryRoutes = new OpenAPIHono();

// ── global select ─────────────────────────────────────────────────────────────

queryRoutes.openapi(
  createRoute({
    method: 'post', path: '/select', tags: ['query'],
    request: { body: { content: { 'application/json': { schema: z.unknown() } } } },
    responses: {
      200: {
        description: 'results',
        content: { 'application/json': { schema: z.object({ results: z.array(z.unknown()) }) } },
      },
      ...errorResponses,
    },
  }),
  async (c) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const results = await getClient().select(c.req.valid('json') as any);
    return c.json({ results });
  },
);

// ── validate query without running ────────────────────────────────────────────

queryRoutes.openapi(
  createRoute({
    method: 'post', path: '/select/validate', tags: ['query'],
    request: { body: { content: { 'application/json': { schema: z.unknown() } } } },
    responses: {
      200: {
        description: 'validation result',
        content: {
          'application/json': {
            schema: z.object({
              valid:    z.boolean(),
              detail:   z.string(),
              errors:   z.array(z.unknown()),
              warnings: z.array(z.unknown()),
            }),
          },
        },
      },
      ...errorResponses,
    },
  }),
  async (c) => {
    const result = validateQuery(c.req.valid('json'));
    return c.json({
      valid:    result.valid,
      detail:   formatValidationResult(result),
      errors:   result.errors   ?? [],
      warnings: result.warnings ?? [],
    });
  },
);
