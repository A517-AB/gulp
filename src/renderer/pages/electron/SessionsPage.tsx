import {SessionsSidebar} from '@/components/sessions'

export default function SessionsPage() {
    return (
        <div className="flex h-full">
            <aside className="w-72 shrink-0 border-r border-hair">
                <SessionsSidebar/>
            </aside>
        </div>
    )
}
