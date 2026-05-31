import { z } from 'zod'

export const FUSE_ROOT = 'D:/fuse'

export const FuseSnippetType = z.enum(['snippet', 'build'])
export type FuseSnippetType = z.infer<typeof FuseSnippetType>

export const FuseManifestItem = z.object({
  id:         z.string().uuid(),
  title:      z.string().nullable(),
  languageId: z.string(),
  type:       FuseSnippetType,
  file:       z.string(), // relative to FUSE_ROOT, e.g. "snippets/python/my-tool.py"
  tags:       z.array(z.string()).default([]),
  createdAt:  z.string().datetime(),
  updatedAt:  z.string().datetime(),
})
export type FuseManifestItem = z.infer<typeof FuseManifestItem>

export const FuseManifest = z.object({
  version: z.literal(1),
  items:   z.array(FuseManifestItem),
})
export type FuseManifest = z.infer<typeof FuseManifest>

export const FuseChangeEvent = z.object({
  event: z.string(),
  path:  z.string(),
})
export type FuseChangeEvent = z.infer<typeof FuseChangeEvent>

export function fuseResolve(...parts: string[]): string {
  return [FUSE_ROOT, ...parts].join('/')
}

const LANG_EXT: Record<string, string> = {
  python: 'py', typescript: 'ts', javascript: 'js',
  bash: 'sh', pwsh: 'ps1', json: 'json', markdown: 'md', html: 'html',
}

export function fuseFilePath(type: FuseSnippetType, languageId: string, slug: string): string {
  const ext = LANG_EXT[languageId] ?? languageId
  const dir = type === 'build'
    ? `snippets/${languageId}/build`
    : `snippets/${languageId}`
  return `${dir}/${slug}.${ext}`
}
