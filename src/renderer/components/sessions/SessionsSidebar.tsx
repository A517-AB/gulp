import {useState} from 'react'
import {type CachedSession, relativeTime, repoFromSource, STATE_META, type StateMeta, useSessions} from './index.ts'

interface SessionsSidebarProps {
    onSelect?: (session: CachedSession) => void
    selectedId?: string
}

export function SessionsSidebar({onSelect, selectedId}: SessionsSidebarProps) {
    const sessions = useSessions()
    const [internalId, setInternalId] = useState<string | undefined>(undefined)
    const activeId = selectedId ?? internalId

    return (
        <div className="flex h-full flex-col overflow-y-auto bg-surface">
            {sessions.map((session) => {
                const state = session.state ?? 'unspecified'
                const meta = (STATE_META[state] as StateMeta | undefined) ?? STATE_META.unspecified
                const repo = repoFromSource(session.sourceContext?.source ?? '')
                const active = session.id === activeId
                const title = session.title ?? 'Untitled'
                return (
                    <button
                        key={session.id}
                        type="button"
                        onClick={() => {
                            setInternalId(session.id)
                            onSelect?.(session)
                        }}
                        className={`flex flex-col gap-1 border-l-2 px-3 py-2.5 text-left transition-colors ${
                            active
                                ? `${meta.accent} bg-raised`
                                : 'border-transparent hover:bg-hover'
                        }`}
                    >
                        <div className="flex items-center gap-2">
                            <div className={`h-2 w-2 shrink-0 rounded-full ${meta.dot}`}/>
                            <span className="flex-1 truncate text-[12px] font-medium text-fg-primary">
                                {title}
                            </span>
                            <span className="shrink-0 font-mono text-[10px] tabular-nums text-fg-ghost">
                                {relativeTime(session.createTime)}
                            </span>
                        </div>
                        {repo !== '' && (
                            <span className={`truncate pl-3.5 font-mono text-[10px] ${meta.text}`}>
                                {repo}
                            </span>
                        )}
                    </button>
                )
            })}
        </div>
    )
}
