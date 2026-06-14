import { useState } from "react";
import type { PointerEvent } from "react";

interface UseResizableOptions {
    defaultWidth?: number;
    min?: number;
    max?: number;
}

interface UseResizableReturn {
    width: number;
    isResizing: boolean;
    handleProps: {
        onPointerDown: (e: PointerEvent<HTMLDivElement>) => void;
        onPointerMove: (e: PointerEvent<HTMLDivElement>) => void;
        onPointerUp: (e: PointerEvent<HTMLDivElement>) => void;
        onPointerCancel: (e: PointerEvent<HTMLDivElement>) => void;
    };
}

export function useResizable({ defaultWidth = 600, min = 300, max = 1200 }: UseResizableOptions = {}): UseResizableReturn {
    const [width, setWidth] = useState(defaultWidth);
    const [isResizing, setIsResizing] = useState(false);

    return {
        width,
        isResizing,
        handleProps: {
            onPointerDown: (e) => {
                e.currentTarget.setPointerCapture(e.pointerId);
                setIsResizing(true);
            },
            onPointerMove: (e) => {
                if (!e.currentTarget.hasPointerCapture(e.pointerId)) return;
                setWidth(Math.min(max, Math.max(min, window.innerWidth - e.clientX)));
            },
            onPointerUp: (e) => {
                e.currentTarget.releasePointerCapture(e.pointerId);
                setIsResizing(false);
            },
            onPointerCancel: (e) => {
                e.currentTarget.releasePointerCapture(e.pointerId);
                setIsResizing(false);
            },
        },
    };
}
