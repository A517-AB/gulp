import type { ReactNode } from 'react';

export default function WorkbenchPage(): ReactNode {
    console.info('[Page] Mounted WorkbenchPage')
    return (
        <div className="flex items-center justify-center h-full">
            <p className="text-fg-ghost text-sm select-none">Sessions</p>
        </div>
    );
}
