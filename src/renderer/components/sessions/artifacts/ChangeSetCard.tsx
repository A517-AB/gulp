import type {ChangeSetArtifact, MediaArtifact} from '@jules'
import {MediaCard} from './MediaCard.tsx'

const IMAGE_EXTENSIONS = new Set(['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'bmp'])

function isImagePath(path: string): boolean {
    const ext = path.split('.').pop()?.toLowerCase() ?? ''
    return IMAGE_EXTENSIONS.has(ext)
}

const CHANGE_COLOR = {
    created: 'text-emerald-400',
    modified: 'text-yellow-400',
    deleted: 'text-red-400',
} as const

const CHANGE_SIGN = {
    created: '+',
    modified: '~',
    deleted: '-',
} as const

export function ChangeSetCard({artifact, media}: { artifact: ChangeSetArtifact; media: MediaArtifact[] }) {
    const {files, summary} = artifact.parsed()
    let mediaIndex = 0

    return (
        <div className="rounded-lg border border-hair bg-raised px-3 py-2 space-y-1.5">
            <div className="text-[10px] font-mono text-fg-ghost">
                {summary.totalFiles} file{summary.totalFiles === 1 ? '' : 's'}
                {summary.created > 0 && <span className="text-emerald-400"> · +{summary.created}</span>}
                {summary.modified > 0 && <span className="text-yellow-400"> · ~{summary.modified}</span>}
                {summary.deleted > 0 && <span className="text-red-400"> · -{summary.deleted}</span>}
            </div>
            <ul className="space-y-1.5">
                {files.map((file) => {
                    const thumb = isImagePath(file.path) ? media[mediaIndex++] : undefined
                    return (
                        <li key={file.path} className="space-y-1">
                            <div className="flex items-baseline gap-1.5 text-[10px] font-mono">
                                <span className={CHANGE_COLOR[file.changeType]}>{CHANGE_SIGN[file.changeType]}</span>
                                <span className="text-fg-dim truncate">{file.path}</span>
                                <span className="text-fg-ghost shrink-0">+{file.additions}/-{file.deletions}</span>
                            </div>
                            {thumb && <MediaCard artifact={thumb}/>}
                        </li>
                    )
                })}
            </ul>
            {artifact.gitPatch.suggestedCommitMessage && (
                <div className="text-[10px] text-fg-ghost pt-1 border-t border-hair/50">
                    {artifact.gitPatch.suggestedCommitMessage}
                </div>
            )}
        </div>
    )
}
