import type { ReactNode } from 'react';
import { isElectron, windowControls } from '@shared/bridge';
import { ThemeToggle } from '@/ui/theme-toggle';

interface TopBarProps {
    left?:   ReactNode
    center?: ReactNode
    right?:  ReactNode
}

export function TopBar({ left, center, right }: TopBarProps) {
    return (
        <header className="app-drag-region h-toolbar flex items-center gap-2 px-3 bg-surface border-b border-hair shrink-0">

            <div className="flex items-center gap-2 flex-1 min-w-0">
                {isElectron && (
                    <span className="text-xxs font-mono tracking-wide text-fg-dim uppercase select-none mr-1">
                        Last
                    </span>
                )}
                {left}
            </div>

            {center != null && (
                <div className="flex items-center gap-2 shrink-0">
                    {center}
                </div>
            )}

            <div className="flex items-center gap-2 flex-1 justify-end">
                {right}
                <ThemeToggle />

                {isElectron && (
                    <div className="flex items-center gap-0.5 ml-1">
                        <button
                            type="button"
                            onClick={() => { windowControls?.minimize(); }}
                            className="group flex items-center justify-center w-8 h-8 rounded-md hover:bg-hover transition-colors"
                            aria-label="Minimize"
                        >
                            <svg width="10" height="1" viewBox="0 0 10 1" className="text-fg-ghost group-hover:text-fg-secondary transition-colors">
                                <rect fill="currentColor" width="10" height="1" />
                            </svg>
                        </button>

                        <button
                            type="button"
                            onClick={() => { windowControls?.maximize(); }}
                            className="group flex items-center justify-center w-8 h-8 rounded-md hover:bg-hover transition-colors"
                            aria-label="Maximize"
                        >
                            <svg width="9" height="9" viewBox="0 0 9 9" className="text-fg-ghost group-hover:text-fg-secondary transition-colors">
                                <rect fill="none" stroke="currentColor" strokeWidth="1" x="0.5" y="0.5" width="8" height="8" rx="1" />
                            </svg>
                        </button>

                        <button
                            type="button"
                            onClick={() => { windowControls?.close(); }}
                            className="group flex items-center justify-center w-8 h-8 rounded-md hover:bg-red-500/10 transition-colors"
                            aria-label="Close"
                        >
                            <svg width="10" height="10" viewBox="0 0 10 10" className="text-fg-ghost group-hover:text-red-400 transition-colors">
                                <line x1="1" y1="1" x2="9" y2="9" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
                                <line x1="9" y1="1" x2="1" y2="9" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
                            </svg>
                        </button>
                    </div>
                )}
            </div>

        </header>
    )
}
