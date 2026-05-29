import type { ReactNode } from 'react';
import { isElectron, windowControls, lowPower as lowPowerBridge } from '@/shared/bridge';
import { ThemeToggle } from '@/ui/theme-toggle';
import { useStore } from '@/store/app';

interface TopBarProps {
    left?:   ReactNode
    center?: ReactNode
    right?:  ReactNode
}

export function TopBar({ left, center, right }: TopBarProps) {
    const { enterLowPower, isLowPower, exitLowPower } = useStore()
    const handleLowPowerToggle = () => {
        if (isLowPower) {
            if (lowPowerBridge) {
                lowPowerBridge.exit()
            } else {
                exitLowPower()
            }
            return
        }

        if (lowPowerBridge) {
            lowPowerBridge.enter()
        } else {
            enterLowPower()
        }
    }

    return (
        <header className="group/bar app-drag-region relative h-toolbar flex items-center gap-2 px-3 bg-base shrink-0">

            <div className="flex items-center gap-2 flex-1 min-w-0">
                {left}
            </div>

            {/* Hidden low-power trigger — double-click only, no visual hint */}
            <button
                type="button"
                onDoubleClick={handleLowPowerToggle}
                className="absolute left-1/2 -translate-x-1/2 w-16 h-full opacity-0 cursor-default"
                aria-hidden="true"
                tabIndex={-1}
            />

            {center != null && (
                <div className="flex items-center gap-2 shrink-0 opacity-0 delay-[2000ms] transition-opacity duration-300 group-hover/bar:opacity-100 group-hover/bar:delay-0">
                    {center}
                </div>
            )}

            <div className="flex items-center gap-2 flex-1 justify-end opacity-0 delay-[2000ms] transition-opacity duration-300 group-hover/bar:opacity-100 group-hover/bar:delay-0">
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
