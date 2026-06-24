import {filesystem, ipc} from '@shared/bridge'

interface SessionOutput {
    type: string;
    changeSet?: { gitPatch?: { unidiffPatch?: string } }
}

import JSZip from 'jszip'
import {toast} from 'sonner'

export function extractPatch(outputs: SessionOutput[]): string | null {
    const cs = outputs.find((o): o is SessionOutput & { type: 'changeSet' } => o.type === 'changeSet')
    return cs?.changeSet?.gitPatch?.unidiffPatch ?? null
}

export function extractPatchFromActivities(activities: unknown[]): string | null {
    for (let i = activities.length - 1; i >= 0; i--) {
        const artifacts = (activities[i] as { artifacts?: unknown[] }).artifacts ?? []
        for (let j = artifacts.length - 1; j >= 0; j--) {
            const art = artifacts[j] as { changeSet?: { gitPatch?: { unidiffPatch?: string } } }
            if (art.changeSet?.gitPatch?.unidiffPatch) return art.changeSet.gitPatch.unidiffPatch
        }
    }
    return null
}

export function extractFilePatch(unidiff: string, filePath: string): string {
    const sections = unidiff.split(/(?=^diff --git )/m).filter(Boolean)
    return sections.find(s => s.includes(`b/${filePath}`) || s.includes(`/${filePath}`)) ?? ''
}

export function parseFilesFromDiff(unidiff: string): Map<string, { content: string; isCreated: boolean }> {
    const files = new Map<string, { content: string; isCreated: boolean }>()
    if (!unidiff) return files
    for (const block of unidiff.split(/(?=^diff --git)/m).filter(Boolean)) {
        const pathMatch = /^\+\+\+ b\/(.+)$/m.exec(block)
        if (!pathMatch?.[1]) continue
        const filePath = pathMatch[1]
        const isCreated = block.includes('new file mode')
        const contentLines: string[] = []
        for (const line of block.split('\n')) {
            if (line.startsWith('+++') || line.startsWith('---') || line.startsWith('@@') ||
                line.startsWith('diff --git') || line.startsWith('index ') || line.startsWith('new file')) continue
            if (line.startsWith('+')) contentLines.push(line.slice(1))
        }
        files.set(filePath, {content: isCreated ? contentLines.join('\n') : block, isCreated})
    }
    return files
}

export async function downloadFilePatch(filePath: string, unidiff: string): Promise<void> {
    const section = extractFilePatch(unidiff, filePath) || unidiff
    const name = filePath.split('/').pop() ?? 'file'
    const finalName = `${name}.patch`
    try {
        if (filesystem && ipc?.artifact?.save) {
            const savePath = await filesystem.showSaveDialog(finalName)
            if (!savePath) return
            const bytes = new TextEncoder().encode(section)
            let binary = ''
            for (let i = 0; i < bytes.length; i += 8192) {
                binary += String.fromCharCode(...bytes.subarray(i, Math.min(i + 8192, bytes.length)))
            }
            await ipc.artifact.save(btoa(binary), savePath)
            toast.success(`Saved ${finalName}`)
        } else {
            const blob = new Blob([section], {type: 'text/plain'})
            const url = URL.createObjectURL(blob)
            const a = document.createElement('a')
            a.href = url
            a.download = finalName
            document.body.appendChild(a)
            a.click()
            document.body.removeChild(a)
            URL.revokeObjectURL(url)
            toast.success(`Downloaded ${finalName}`)
        }
    } catch (err) {
        console.error('[git-patch] downloadFilePatch failed:', err)
        toast.error(`Failed to save ${finalName}`)
    }
}

export async function downloadAllAsZip(unidiff: string, label: string): Promise<void> {
    const files = parseFilesFromDiff(unidiff)
    if (files.size === 0) {
        toast.error('No files found in diff');
        return
    }
    const toastId = 'git-patch-zip'
    const zipName = `${label}_changes.zip`
    toast.loading('Building ZIP…', {id: toastId})
    try {
        const zip = new JSZip()
        for (const [path, info] of files) {
            zip.file(info.isCreated ? path : `${path}.patch`, info.content)
        }
        const blob = await zip.generateAsync({type: 'blob'})
        if (filesystem && ipc?.artifact?.save) {
            const savePath = await filesystem.showSaveDialog(zipName)
            if (!savePath) {
                toast.dismiss(toastId);
                return
            }
            const reader = new FileReader()
            reader.onload = async () => {
                try {
                    const base64 = (reader.result as string).split(',')[1]
                    if (!base64) throw new Error('base64 parse failed')
                    await ipc!.artifact.save(base64, savePath)
                    toast.success('ZIP saved', {id: toastId})
                } catch (err) {
                    console.error('[git-patch] zip Electron save failed:', err)
                    toast.error('Failed to save ZIP', {id: toastId})
                }
            }
            reader.readAsDataURL(blob)
        } else {
            const url = URL.createObjectURL(blob)
            const a = document.createElement('a')
            a.href = url
            a.download = zipName
            document.body.appendChild(a)
            a.click()
            document.body.removeChild(a)
            URL.revokeObjectURL(url)
            toast.success('ZIP downloaded', {id: toastId})
        }
    } catch (err) {
        console.error('[git-patch] downloadAllAsZip failed:', err)
        toast.error('ZIP failed', {id: toastId})
    }
}
