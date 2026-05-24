import type { ReactNode } from 'react';

export default function HomePage(): ReactNode {
  return (
    <div className="flex items-center justify-center h-full">
      <p className="text-fg-ghost text-sm select-none">Home</p>
    </div>
  );
}
