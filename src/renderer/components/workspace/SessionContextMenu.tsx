import * as ContextMenu from '@radix-ui/react-context-menu'
import type { ReactNode } from 'react'
import { Archive, Play } from 'lucide-react'
import type { SessionResource } from '@google/jules-sdk/types'
import { useStore } from '@/store/app'

const QUICK_REVIEW_PROMPT =
    "Please perform a comprehensive code review of the repository. Look for bugs, security issues, and opportunities for refactoring. Provide a detailed summary of your findings."

interface Props {
    session: SessionResource
    children: ReactNode
}

const itemCls = "flex items-center gap-2.5 px-2.5 py-1.5 rounded-md text-[11px] font-mono text-fg-secondary outline-none cursor-pointer select-none data-[highlighted]:bg-hover data-[highlighted]:text-fg-primary transition-colors"

/**
 * `SessionContextMenu` wraps a component to provide a right-click context menu with session-specific actions.
 * Actions include archiving the session, opening the repository externally, exploring files, etc.
 *
 * It interacts with the `useStore` to perform these actions (e.g., `archiveSessions`, `exploreFile`).
 *
 * Props:
 * - `session`: The `SessionResource` associated with the context menu.
 * - `children`: The React children that will trigger the context menu on right-click.
 */
export function SessionContextMenu({ session, children }: Props) {
    const sendMessage = useStore(s => s.sendMessage)
    const archiveSessions = useStore(s => s.archiveSessions)

    const isActive = session.state === 'inProgress' || session.state === 'planning'

    return (
        <ContextMenu.Root>
            <ContextMenu.Trigger className="contents">
                {children}
            </ContextMenu.Trigger>
            <ContextMenu.Portal>
                <ContextMenu.Content className="z-50 min-w-[160px] overflow-hidden rounded-xl border border-hair bg-surface/95 backdrop-blur-xl p-1 shadow-2xl">
                    {isActive && (
                        <ContextMenu.Item
                            className={itemCls}
                            onSelect={() => { void sendMessage(session.id, QUICK_REVIEW_PROMPT) }}
                        >
                            <Play className="h-3 w-3 shrink-0" />
                            Code review
                        </ContextMenu.Item>
                    )}

                    <ContextMenu.Separator className="my-1 h-px bg-hair mx-1" />

                    <ContextMenu.Item
                        className="flex items-center gap-2.5 px-2.5 py-1.5 rounded-md text-[11px] font-mono text-red-400 outline-none cursor-pointer select-none data-[highlighted]:bg-red-500/10 data-[highlighted]:text-red-300 transition-colors"
                        onSelect={() => { void archiveSessions([session.id]) }}
                    >
                        <Archive className="h-3 w-3 shrink-0" />
                        Archive
                    </ContextMenu.Item>
                </ContextMenu.Content>
            </ContextMenu.Portal>
        </ContextMenu.Root>
    )
}
