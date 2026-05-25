import type { ReactNode } from 'react';

export default function ProjectsPage(): ReactNode {
    console.info('[Page] Mounted ProjectsPage')
  return (
    <div className="flex items-center justify-center h-full">
      <p className="text-neutral-500 text-sm select-none">Projects</p>
    </div>
  );
}
