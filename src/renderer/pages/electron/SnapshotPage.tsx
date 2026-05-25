import type { ReactNode } from 'react';

export default function SnapshotPage(): ReactNode {
    console.info('[Page] Mounted SnapshotPage')
  return (
    <div className="flex items-center justify-center h-full">
      <p className="text-fg-ghost text-sm select-none">Snapshot</p>
    </div>
  );
}
