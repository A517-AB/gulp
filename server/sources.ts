import { OpenAPIHono, createRoute, z } from '@hono/zod-openapi';
import { getClient } from './client.ts';
import { collect } from './helpers.ts';
import { SourceSchema, errorResponses } from './types.ts';

export const sourcesRoutes = new OpenAPIHono();

sourcesRoutes.openapi(
  createRoute({
    method: 'get', path: '/sources', tags: ['sources'],
    responses: {
      200: {
        description: 'list',
        content: { 'application/json': { schema: z.object({ sources: z.array(SourceSchema) }) } },
      },
      ...errorResponses,
    },
  }),
  async (c) => {
    const sources = await collect(getClient().sources());
    return c.json({ sources });
  },
);

sourcesRoutes.openapi(
  createRoute({
    method: 'get', path: '/sources/{owner}/{repo}', tags: ['sources'],
    request: { params: z.object({ owner: z.string(), repo: z.string() }) },
    responses: {
      200: {
        description: 'source',
        content: { 'application/json': { schema: SourceSchema.nullable() } },
      },
      ...errorResponses,
    },
  }),
  async (c) => {
    const { owner, repo } = c.req.valid('param');
    const source = await getClient().sources.get({ github: `${owner}/${repo}` });
    return c.json(source ?? null);
  },
);
