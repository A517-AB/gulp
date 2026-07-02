import {useState} from 'react'
import {Send} from 'lucide-react'
import {jules} from '@jules'
import {type CachedSession, useActivities} from './index.ts'
import {ActivityRow} from './ActivityRow.tsx'

interface Props {
    session: CachedSession
}

export function Feed({session}: Props) {
    const activities = useActivities(session.id)
    const [input, setInput] = useState('')
    const [sending, setSending] = useState(false)
    const isAwaitingApproval = session.state === 'awaitingPlanApproval'
    const planApproved = activities.some(a => a.type === 'planApproved')

    const handleSend = async () => {
        if (!input.trim() || sending) return
        setSending(true)
        try {
            await jules.session(session.id).send(input.trim())
            setInput('')
        } finally {
            setSending(false)
        }
    }

    return (
        <div className="flex h-full flex-col">
            <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
                {activities.map(act => (
                    <ActivityRow
                        key={act.id}
                        act={act}
                        sessionId={session.id}
                        isAwaitingApproval={isAwaitingApproval}
                        planApproved={planApproved}
                    />
                ))}
            </div>

            <footer className="border-t border-hair p-3 flex gap-2 items-end">
                <textarea
                    value={input}
                    onChange={e => {
                        setInput(e.target.value)
                    }}
                    onKeyDown={e => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault()
                            void handleSend()
                        }
                    }}
                    disabled={sending}
                    rows={1}
                    className="flex-1 resize-none bg-raised border border-hair rounded px-3 py-2 text-sm text-fg-primary outline-none placeholder:text-fg-ghost max-h-32 min-h-[36px]"
                />
                <button
                    onClick={() => {
                        void handleSend()
                    }}
                    disabled={!input.trim() || sending}
                    className="flex h-9 w-9 items-center justify-center rounded bg-indigo-600 hover:bg-indigo-500 text-white transition-colors disabled:opacity-30 shrink-0"
                >
                    <Send className="h-4 w-4"/>
                </button>
            </footer>
        </div>
    )
}
