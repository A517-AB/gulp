import type { ReactNode } from 'react';
import { Clock } from '@renderer/components/shared/Clock';

export default function HomePage(): ReactNode {
  return (
    <div className="flex items-center justify-center h-full bg-base">
      <div className="relative">
        {/* ambient glow */}
        <div className="absolute inset-0 rounded-full scale-150 blur-[80px] bg-primary/10 pointer-events-none" />
        {/* frosted container */}
        <div className="relative rounded-full p-8 border border-hair bg-surface/60 backdrop-blur-xl shadow-[0_32px_80px_rgba(0,0,0,0.5),0_8px_24px_rgba(0,0,0,0.35)]">
          <Clock size={220} />
        </div>
      </div>
    </div>
  );
}
