import { useState, useCallback, useEffect } from "react";
import type { UseResizableProps, UseResizableReturn } from "@/types/ui-hooks";

export function useResizable({ defaultWidth = 600, min = 300, max = 1200 }: UseResizableProps = {}): UseResizableReturn {
  const [width, setWidth] = useState(defaultWidth);
  const [isResizing, setIsResizing] = useState(false);

  const startResizing = useCallback(() => setIsResizing(true), []);
  const stopResizing = useCallback(() => setIsResizing(false), []);

  const resize = useCallback((e: MouseEvent) => {
    if (!isResizing) return;
    const next = window.innerWidth - e.clientX;
    if (next > min && next < max) setWidth(next);
  }, [isResizing, min, max]);

  useEffect(() => {
    window.addEventListener("mousemove", resize);
    window.addEventListener("mouseup", stopResizing);
    return () => {
      window.removeEventListener("mousemove", resize);
      window.removeEventListener("mouseup", stopResizing);
    };
  }, [resize, stopResizing]);

  return { width, isResizing, startResizing };
}
