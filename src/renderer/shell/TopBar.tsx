import { useState, useEffect } from 'react';
import type { TopBarProps } from './types';
import { isElectron, windowControls } from '@shared/bridge';
import { ThemeToggle } from '@/ui/theme-toggle';

export function TopBar({ left, center, right }: TopBarProps) {
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    return (
        <header
            className={`app-drag-region h-toolbar grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2 px-3 shrink-0 bg-transparent hover:opacity-100 transition-opacity duration-500 hover:duration-200 hover:delay-0 ${mounted ? 'opacity-0 delay-[4000ms]' : 'opacity-100'}`}>
            <div className="flex items-center gap-2 min-w-0 justify-start overflow-hidden">
                {left}
            </div>

            <div className="flex items-center gap-1 justify-center overflow-x-auto scrollbar-none min-w-0">
                {center}
            </div>

            <div className="flex items-center gap-2 justify-end">
                {right}
                <ThemeToggle />

                {isElectron && (
                    <div className="flex items-center gap-0.5 ml-1">
                        <button
                            type="button"
                            onClick={() => { windowControls?.minimize(); }}
                            className="group flex items-center justify-center w-8 h-8 rounded-md hover:bg-purple-500/10 hover:shadow-[0_0_10px_rgba(168,85,247,0.25)] transition-all"
                            aria-label="Minimize"
                        >
                            <svg width="10" height="1" viewBox="0 0 10 1" className="text-fg-ghost group-hover:text-fg-secondary transition-colors">
                                <rect fill="currentColor" width="10" height="1" />
                            </svg>
                        </button>

                        <button
                            type="button"
                            onClick={() => { windowControls?.maximize(); }}
                            className="group flex items-center justify-center w-8 h-8 rounded-md hover:bg-purple-500/10 hover:shadow-[0_0_10px_rgba(168,85,247,0.25)] transition-all"
                            aria-label="Maximize"
                        >
                            <svg width="9" height="9" viewBox="0 0 9 9" className="text-fg-ghost group-hover:text-fg-secondary transition-colors">
                                <rect fill="none" stroke="currentColor" strokeWidth="1" x="0.5" y="0.5" width="8" height="8" rx="1" />
                            </svg>
                        </button>

                        <button
                            type="button"
                            onClick={() => { windowControls?.close(); }}
                            className="group flex items-center justify-center w-8 h-8 rounded-md hover:bg-red-500/10 hover:shadow-[0_0_10px_rgba(239,68,68,0.25)] transition-all"
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
