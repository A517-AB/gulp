import type { ReactNode } from 'react';

export default function RunsPage(): ReactNode {
    console.info('[Page] Mounted RunsPage')
    return (
        <div className="flex items-center justify-center h-full">
            <p className="text-fg-ghost text-sm font-mono select-none">Runs</p>
        </div>
    );
}
