import * as ContextMenu from '@radix-ui/react-context-menu'
import type {ReactNode} from 'react'

interface Action {
    label: string
    icon?: ReactNode
    onSelect: () => void
    variant?: 'default' | 'danger'
}

interface SessionContextMenuProps {
    children: ReactNode
    actions: Action[]
}

const itemBase = "flex items-center gap-2.5 px-2.5 py-1.5 rounded-md text-[11px] font-mono outline-none cursor-pointer select-none transition-colors"
const itemDefault = `${itemBase} text-fg-secondary data-[highlighted]:bg-hover data-[highlighted]:text-fg-primary`
const itemDanger = `${itemBase} text-red-400 data-[highlighted]:bg-red-500/10 data-[highlighted]:text-red-300`

export function SessionContextMenu({children, actions}: SessionContextMenuProps) {
    if (actions.length === 0) return <>{children}</>

    return (
        <ContextMenu.Root>
            <ContextMenu.Trigger className="contents">
                {children}
            </ContextMenu.Trigger>
            <ContextMenu.Portal>
                <ContextMenu.Content
                    className="z-50 min-w-[160px] overflow-hidden rounded-xl border border-hair bg-surface/95 backdrop-blur-xl p-1 shadow-2xl">
                    {actions.map((action, i) => (
                        <ContextMenu.Item
                            key={i}
                            className={action.variant === 'danger' ? itemDanger : itemDefault}
                            onSelect={action.onSelect}
                        >
                            {action.icon && <span className="h-3 w-3 shrink-0 flex items-center">{action.icon}</span>}
                            {action.label}
                        </ContextMenu.Item>
                    ))}
                </ContextMenu.Content>
            </ContextMenu.Portal>
        </ContextMenu.Root>
    )
}
