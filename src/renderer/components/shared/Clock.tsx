import { motion, useAnimationFrame, useMotionValue, useTransform } from 'framer-motion';
import { useState } from 'react';
import { cn } from '@/utils';

export function Clock({ size = 240, className }: { size?: number; className?: string }) {
  // Use motion values to update time without triggering React re-renders every frame
  const [initialTime] = useState(() => Date.now());
  const time = useMotionValue(initialTime);

  useAnimationFrame(() => {
    time.set(Date.now());
  });

  const seconds = useTransform(time, (t) => {
    const d = new Date(t);
    return (d.getSeconds() + d.getMilliseconds() / 1000) * 6;
  });

  const minutes = useTransform(time, (t) => {
    const d = new Date(t);
    const s = d.getSeconds() + d.getMilliseconds() / 1000;
    return (d.getMinutes() + s / 60) * 6;
  });

  const hours = useTransform(time, (t) => {
    const d = new Date(t);
    const m = d.getMinutes() + d.getSeconds() / 60;
    return (d.getHours() + m / 60) * 30;
  });

  const rotation = (degrees: number) => `rotate(${String(degrees)} 50 50)`;

  return (
    <div
      className={cn(
        'relative rounded-full border border-primary/20 bg-card shadow-sm flex items-center justify-center',
        className
      )}
      style={{ width: size, height: size }}
    >
      <svg width="100%" height="100%" viewBox="0 0 100 100" className="absolute inset-0">
        {/* Hour marks */}
        {Array.from({ length: 12 }).map((_, i) => (
          <line
            key={i}
            x1="50"
            y1="10"
            x2="50"
            y2="16"
            stroke="currentColor"
            className="text-primary/30"
            strokeWidth="1.5"
            strokeLinecap="round"
            transform={rotation(i * 30)}
          />
        ))}

        {/* Minute marks */}
        {Array.from({ length: 60 }).map((_, i) => (
          i % 5 !== 0 && (
            <line
              key={`min-${String(i)}`}
              x1="50"
              y1="10"
              x2="50"
              y2="12"
              stroke="currentColor"
              className="text-primary/10"
              strokeWidth="0.75"
              strokeLinecap="round"
              transform={rotation(i * 6)}
            />
          )
        ))}

        {/* Hour hand */}
        <motion.line
          x1="50"
          y1="50"
          x2="50"
          y2="28"
          stroke="currentColor"
          className="text-primary"
          strokeWidth="3.5"
          strokeLinecap="round"
          style={{ originX: '50px', originY: '50px', rotate: hours }}
        />

        {/* Minute hand */}
        <motion.line
          x1="50"
          y1="50"
          x2="50"
          y2="18"
          stroke="currentColor"
          className="text-primary"
          strokeWidth="2.5"
          strokeLinecap="round"
          style={{ originX: '50px', originY: '50px', rotate: minutes }}
        />

        {/* Second hand */}
        <motion.line
          x1="50"
          y1="60"
          x2="50"
          y2="12"
          stroke="#ef4444"
          strokeWidth="1.5"
          strokeLinecap="round"
          style={{ originX: '50px', originY: '50px', rotate: seconds }}
        />

        {/* Center dot */}
        <circle cx="50" cy="50" r="3.5" className="fill-primary" />
        <circle cx="50" cy="50" r="1.5" fill="#ef4444" />
      </svg>
    </div>
  );
}