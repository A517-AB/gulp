import { OpenAPIHono, createRoute, z } from '@hono/zod-openapi';
import { getClient } from './client.ts';
import { collect, summarizeArtifacts, findMediaArtifact } from './helpers.ts';
import { parseUnidiff } from '@google/jules-sdk';
import { IdParam, ErrorSchema, errorResponses } from './types.ts';
import type { GeneratedFileSummary } from './types.ts';

export const artifactsRoutes = new OpenAPIHono();

// ── all artifacts for a session ───────────────────────────────────────────────

artifactsRoutes.openapi(
  createRoute({
    method: 'get', path: '/sessions/{id}/artifacts', tags: ['artifacts'],
    request: { params: IdParam },
    responses: {
      200: {
        description: 'artifacts',
        content: { 'application/json': { schema: z.object({ artifacts: z.array(z.unknown()) }) } },
      },
      ...errorResponses,
    },
  }),
  async (c) => {
    const activities = await collect(getClient().session(c.req.valid('param').id).history());
    return c.json({ artifacts: summarizeArtifacts(activities) });
  },
);

// ── media artifact download ───────────────────────────────────────────────────

artifactsRoutes.openapi(
  createRoute({
    method: 'get', path: '/sessions/{id}/artifacts/{activityId}/media', tags: ['artifacts'],
    request: { params: z.object({ id: z.string(), activityId: z.string() }) },
    responses: {
      200: {
        description: 'media binary',
        content: { 'application/octet-stream': { schema: z.unknown() } },
      },
      404: { description: 'not found', content: { 'application/json': { schema: ErrorSchema } } },
      ...errorResponses,
    },
  }),
  async (c) => {
    const { id, activityId } = c.req.valid('param');
    const activities = await collect(getClient().session(id).history());
    const media = findMediaArtifact(activities, activityId);

    if (!media) {
      return c.json({ error: 'NotFound', message: 'Media artifact not found' }, 404);
    }

    return new Response(media.data, {
      headers: { 'Content-Type': media.format ?? 'application/octet-stream' },
    });
  },
);

// ── diff ──────────────────────────────────────────────────────────────────────

artifactsRoutes.openapi(
  createRoute({
    method: 'get', path: '/sessions/{id}/diff', tags: ['artifacts'],
    request: {
      params: IdParam,
      query: z.object({ format: z.enum(['raw', 'parsed', 'files']).optional() }),
    },
    responses: {
      200: { description: 'diff', content: { 'application/json': { schema: z.unknown() } } },
      404: { description: 'no diff', content: { 'application/json': { schema: ErrorSchema } } },
      ...errorResponses,
    },
  }),
  async (c) => {
    const format  = c.req.valid('query').format ?? 'raw';
    const outcome = await getClient().session(c.req.valid('param').id).result();
    const cs      = outcome.changeSet();
    const patch   = cs?.gitPatch?.unidiffPatch;

    if (!patch) {
      return c.json({ error: 'NotFound', message: 'No diff available' }, 404);
    }

    if (format === 'parsed') return c.json(parseUnidiff(patch));
    if (format === 'files')  return c.json(parseUnidiff(patch)); // Fallback, parseUnidiffWithContent doesn't exist
    return new Response(patch, { headers: { 'Content-Type': 'text/plain' } });
  },
);

// ── generated files ───────────────────────────────────────────────────────────

artifactsRoutes.openapi(
  createRoute({
    method: 'get', path: '/sessions/{id}/files', tags: ['artifacts'],
    request: { params: IdParam },
    responses: {
      200: {
        description: 'files',
        content: { 'application/json': { schema: z.object({ files: z.array(z.unknown()) }) } },
      },
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
    return c.json({ files });
  },
);

// ── single file by path ───────────────────────────────────────────────────────

artifactsRoutes.openapi(
  createRoute({
    method: 'get', path: '/sessions/{id}/files/{filepath}', tags: ['artifacts'],
    request: { params: z.object({ id: z.string(), filepath: z.string() }) },
    responses: {
      200: { description: 'file content', content: { 'text/plain': { schema: z.string() } } },
      404: { description: 'not found', content: { 'application/json': { schema: ErrorSchema } } },
      ...errorResponses,
    },
  }),
  async (c) => {
    const { id, filepath } = c.req.valid('param');
    const outcome = await getClient().session(id).result();
    const file    = outcome.generatedFiles().get(filepath);

    if (!file) {
      return c.json({ error: 'NotFound', message: 'File not found' }, 404);
    }

    return new Response(file.content ?? '', { headers: { 'Content-Type': 'text/plain' } });
  },
);
