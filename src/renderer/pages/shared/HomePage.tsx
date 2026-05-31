import type { ReactNode } from 'react';
import { Clock } from '@/components/shared/Clock';

export default function HomePage(): ReactNode {
  return (
    <div className="flex items-center justify-center h-full bg-base">
      <Clock size={220} />
    </div>
  );
}
