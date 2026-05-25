import type { ReactNode } from 'react';

export default function OverviewPage(): ReactNode {
    console.info('[Page] Mounted OverviewPage')
  return (
    <div className="flex items-center justify-center h-full">
      <p className="text-fg-ghost text-sm font-mono select-none">Overview</p>
    </div>
  );
}
