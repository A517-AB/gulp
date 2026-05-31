import JSZip from 'jszip'
import type { JulesLocalGeneratedFile } from '@shared/electron'
import type { JulesAlias } from './types'

const MARKDOWN_DIRECTIVE = 'Report back in markdown.'

/** Builds the prompt sent in send mode: body + alias instructions (if any) + markdown directive. */
export function buildPrompt(alias: JulesAlias, body: string): string {
  return [body.trim(), alias.instructions, MARKDOWN_DIRECTIVE]
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
