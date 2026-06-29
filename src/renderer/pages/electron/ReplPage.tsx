import {Repl} from '@/components/repl'
import {NoteEditor} from '@/components/markdown/NoteEditor'

export default function ReplPage() {
    return (
        <div className="flex h-full w-full overflow-hidden">
            <div className="flex-1 min-w-0 overflow-hidden">
                <Repl/>
            </div>
            <div className="w-80 shrink-0 overflow-hidden">
                <NoteEditor id="repl-notes" title="REPL Notes" className="h-full"/>
            </div>
        </div>
    )
}
