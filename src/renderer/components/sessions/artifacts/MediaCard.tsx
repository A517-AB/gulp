import type {MediaArtifact} from '@jules'

export function MediaCard({artifact}: { artifact: MediaArtifact }) {
    if (!artifact.format.startsWith('image/')) return null

    return (
        <img
            src={artifact.toUrl()}
            alt=""
            className="max-w-full max-h-72 rounded-lg border border-hair object-contain"
        />
    )
}
