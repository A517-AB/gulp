import type { ReactNode } from 'react';
import { Clock } from '@/components/shared/Clock';

export default function HomePage(): ReactNode {
  return (
    <div className="flex items-center justify-center h-full bg-base">
      <div className="relative p-6 rounded-full bg-surface/30 border border-hair shadow-sm">
        <Clock size={220} />
      </div>
    </div>
  );
}
