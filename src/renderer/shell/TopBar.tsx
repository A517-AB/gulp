import type { ReactNode } from 'react';
import { ThemeToggle } from '@/ui/theme-toggle';
import { isWeb } from '@shared/bridge';

interface TopBarProps {
    left?:   ReactNode
    center?: ReactNode
    right?:  ReactNode
}

export function TopBar({ left, center, right }: TopBarProps) {
    return (
        <header className="app-drag-region h-toolbar flex items-center gap-2 px-3 bg-surface border-b border-hair shrink-0">

            <div className="flex items-center gap-2 flex-1 min-w-0">
                {left}
            </div>

            {center != null && (
                <div className="flex items-center gap-2 shrink-0">
                    {center}
                </div>
            )}

            <div className="flex items-center gap-2 flex-1 justify-end">
                {right}
                {isWeb && <ThemeToggle />}
            </div>

        </header>
    )
}

