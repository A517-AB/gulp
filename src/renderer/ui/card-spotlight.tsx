
import { useMotionValue, motion, useMotionTemplate } from "framer-motion";
import type { MouseEvent } from "react";
import { cn } from "@/utils";
import {useTheme} from "@/providers/theme";

interface CardSpotlightProps {
  children: React.ReactNode;
  radius?: number;
  color?: string;
  className?: string;
}

export function CardSpotlight({
  children,
  radius = 350,
                                  color,
  className,
}: CardSpotlightProps) {
    const {theme} = useTheme();
    // Default spotlight: subtle dark smear in dark mode, near-invisible in light mode
    const resolvedColor = color ?? (theme === 'dark' ? '#2a2a2a' : 'rgba(0,0,0,0.04)');

  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  function handleMouseMove({ currentTarget, clientX, clientY }: MouseEvent) {
    const { left, top } = currentTarget.getBoundingClientRect();
    mouseX.set(clientX - left);
    mouseY.set(clientY - top);
  }

  return (
    <div
      className={cn(
          "group relative rounded-none border border-border/10 bg-card",
        className,
      )}
      onMouseMove={handleMouseMove}
    >
      <motion.div
        className="pointer-events-none absolute -inset-px rounded-none opacity-0 transition duration-300 group-hover:opacity-100"
        style={{
          background: useMotionTemplate`
            radial-gradient(
              ${radius}px circle at ${mouseX}px ${mouseY}px,
              ${resolvedColor},
              transparent 80%
            )
          `,
        }}
      />
      {children}
    </div>
  );
}

