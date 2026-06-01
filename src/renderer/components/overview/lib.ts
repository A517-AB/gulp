import JSZip from 'jszip'
import type { JulesLocalGeneratedFile } from '@shared/electron'
import type { JulesAlias } from './types'

export function buildPrompt(alias: JulesAlias, body: string): string {
  const mdDirective = alias.expects === 'md' ? 'Report back in markdown.' : undefined
  return [body.trim(), alias.instructions, mdDirective]
    .filter((part): part is string => Boolean(part?.trim()))
    .join('\n\n')
}

function triggerDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

/** Bundles generated files into a .zip and downloads it. */
export async function downloadZip(files: JulesLocalGeneratedFile[], name = 'artifacts'): Promise<void> {
  if (files.length === 0) return
  const zip = new JSZip()
  for (const file of files) {
    zip.file(file.path, file.content)
  }
  const blob = await zip.generateAsync({ type: 'blob' })
  triggerDownload(blob, `${name}.zip`)
}
