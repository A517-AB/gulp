import {TerminalPane} from '@/components/shared/TerminalPane'
import {NoteEditor} from '@/components/markdown/NoteEditor'

export default function TerminalPage() {
    return (
        <div className="flex h-full w-full overflow-hidden">
            <div className="flex-1 min-w-0 overflow-hidden p-4">
                <TerminalPane active={true} disableStdin={false} variant="system"/>
            </div>
            <div className="w-80 shrink-0 overflow-hidden">
                <NoteEditor id="terminal-notes" title="Terminal Notes" className="h-full"/>
            </div>
        </div>
    )
}
