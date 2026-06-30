import {useState} from 'react'
import {Feed, SessionsSidebar} from '@/components/sessions'
import type {CachedSession} from '@/components/sessions/types.ts'

export default function SessionsPage() {
    const [selectedSession, setSelectedSession] = useState<CachedSession | null>(null)

    return (
        <div className="flex h-full w-full">
            <aside className="w-72 shrink-0 border-r border-hair">
                <SessionsSidebar
                    onSelect={(s) => {
                        setSelectedSession(s)
                    }}
                    {...(selectedSession ? {selectedId: selectedSession.id} : {})}
                />
            </aside>
            <main className="flex-1 min-w-0">
                {selectedSession ? (
                    <Feed session={selectedSession}/>
                ) : (
                    <div
                        className="flex h-full items-center justify-center text-fg-dim text-xs font-mono uppercase tracking-widest">
                        No Session Selected
                    </div>
                )}
            </main>
        </div>
    )
}
